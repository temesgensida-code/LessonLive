import csv
import io
import json
import os
from livekit import api
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from authentication.jwt_auth import get_user_from_request
from authentication.models import UserProfile
from classroom.models import Classroom, ClassroomInvitation, ClassroomNote, DisplayedClassroomNote, Enrollment


def _json_body(request):
	if not request.body:
		return {}
	return json.loads(request.body)


def _require_teacher(request):
	user = get_user_from_request(request)
	if user is None:
		return None, JsonResponse({'detail': 'Authentication required'}, status=401)

	role = getattr(getattr(user, 'profile', None), 'role', None)
	if role != UserProfile.ROLE_TEACHER:
		return None, JsonResponse({'detail': 'Teacher role required'}, status=403)

	return user, None


def _collect_emails(emails_text, csv_file):
	results = []

	if emails_text:
		chunks = emails_text.replace(';', ',').replace('\n', ',').split(',')
		results.extend(chunk.strip() for chunk in chunks if chunk.strip())

	if csv_file:
		decoded = csv_file.read().decode('utf-8', errors='ignore')
		reader = csv.reader(io.StringIO(decoded))
		for row in reader:
			if not row:
				continue
			email = (row[0] or '').strip()
			if email and email.lower() != 'email':
				results.append(email)

	deduped = []
	seen = set()
	for email in results:
		lowered = email.lower()
		if lowered in seen:
			continue
		seen.add(lowered)
		deduped.append(lowered)
	return deduped


def _serialize_classroom(classroom, include_students=False):
	payload = {
		'name': classroom.name,
		'class_id': classroom.class_id,
		'owner_email': classroom.owner.email,
	}
	if include_students:
		payload['students'] = list(
			classroom.enrollments.select_related('student').values_list('student__email', flat=True)
		)
	return payload


def _require_class_member(request, class_id):
	user = get_user_from_request(request)
	if user is None:
		return None, None, False, JsonResponse({'detail': 'Authentication required'}, status=401)

	try:
		classroom = Classroom.objects.get(class_id=class_id)
	except Classroom.DoesNotExist:
		return None, None, False, JsonResponse({'detail': 'Classroom not found'}, status=404)

	is_owner = classroom.owner_id == user.id
	is_enrolled = Enrollment.objects.filter(classroom=classroom, student=user).exists()
	if not is_owner and not is_enrolled:
		return None, None, False, JsonResponse({'detail': 'Not allowed'}, status=403)

	return user, classroom, is_owner, None


def _serialize_saved_note(note):
	return {
		'id': note.id,
		'index': note.id,
		'title': note.title,
		'content': note.content,
		'saved_date': note.created_at.isoformat(),
	}


def _serialize_displayed_note(displayed_note):
	note = displayed_note.note
	return {
		'id': displayed_note.id,
		'note_id': note.id,
		'index': note.id,
		'title': note.title,
		'content': note.content,
		'saved_date': note.created_at.isoformat(),
		'displayed_date': displayed_note.displayed_at.isoformat(),
	}


def _note_group_name(class_id):
	return f'classroom_{class_id}_notes'


def _broadcast_note_event(class_id, event_type, payload):
	channel_layer = get_channel_layer()
	if channel_layer is None:
		return

	async_to_sync(channel_layer.group_send)(
		_note_group_name(class_id),
		{
			'type': 'note.event',
			'event_type': event_type,
			'payload': payload,
		},
	)


@csrf_exempt
def create_classroom(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	data = _json_body(request)
	class_name = (data.get('name') or '').strip()
	if not class_name:
		return JsonResponse({'detail': 'Classroom name is required'}, status=400)

	classroom = Classroom.objects.create(owner=user, name=class_name)
	return JsonResponse(
		{
			'classroom': _serialize_classroom(classroom),
			'redirect_url': f"/classrooms/{classroom.class_id}",
		},
		status=201,
	)


def list_my_classrooms(request):
	user = get_user_from_request(request)
	if user is None:
		return JsonResponse({'detail': 'Authentication required'}, status=401)

	classrooms = Classroom.objects.filter(owner=user).order_by('-created_at')
	return JsonResponse({'classrooms': [_serialize_classroom(item) for item in classrooms]})


def list_enrolled_classrooms(request):
	user = get_user_from_request(request)
	if user is None:
		return JsonResponse({'detail': 'Authentication required'}, status=401)

	classrooms = (
		Classroom.objects
		.filter(enrollments__student=user)
		.select_related('owner')
		.order_by('-created_at')
		.distinct()
	)
	return JsonResponse({'classrooms': [_serialize_classroom(item) for item in classrooms]})


def classroom_detail(request, class_id):
	user = get_user_from_request(request)
	if user is None:
		return JsonResponse({'detail': 'Authentication required'}, status=401)

	try:
		classroom = Classroom.objects.get(class_id=class_id)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	if classroom.owner_id == user.id:
		return JsonResponse({'classroom': _serialize_classroom(classroom, include_students=True), 'owned': True})

	is_enrolled = Enrollment.objects.filter(classroom=classroom, student=user).exists()
	if not is_enrolled:
		return JsonResponse({'detail': 'Not allowed'}, status=403)

	return JsonResponse({'classroom': _serialize_classroom(classroom), 'owned': False})


@csrf_exempt
def invite_students(request, class_id):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	teacher, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	try:
		classroom = Classroom.objects.get(class_id=class_id, owner=teacher)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	emails_text = request.POST.get('emails', '')
	csv_file = request.FILES.get('file')
	try:
		expiration_hours = int(request.POST.get('expiration_hours', 72))
	except (TypeError, ValueError):
		return JsonResponse({'detail': 'expiration_hours must be an integer'}, status=400)

	if expiration_hours <= 0:
		return JsonResponse({'detail': 'expiration_hours must be greater than 0'}, status=400)

	emails = _collect_emails(emails_text, csv_file)
	if not emails:
		return JsonResponse({'detail': 'No email addresses found'}, status=400)

	invited = []
	skipped = []

	for email in emails:
		try:
			validate_email(email)
		except ValidationError:
			skipped.append({'email': email, 'reason': 'invalid_email'})
			continue

		existing_user = User.objects.filter(email__iexact=email).first()
		if existing_user and Enrollment.objects.filter(classroom=classroom, student=existing_user).exists():
			skipped.append({'email': email, 'reason': 'already_enrolled'})
			continue

		existing_pending = ClassroomInvitation.objects.filter(
			classroom=classroom,
			email__iexact=email,
			status=ClassroomInvitation.STATUS_PENDING,
			expires_at__gt=timezone.now(),
		).exists()
		if existing_pending:
			skipped.append({'email': email, 'reason': 'already_invited'})
			continue

		raw_token, token_hash = ClassroomInvitation.issue_token()
		expires_at = timezone.now() + timedelta(hours=expiration_hours)
		invite = ClassroomInvitation.objects.create(
			classroom=classroom,
			invited_by=teacher,
			email=email,
			role=ClassroomInvitation.ROLE_STUDENT,
			token_hash=token_hash,
			expires_at=expires_at,
			status=ClassroomInvitation.STATUS_PENDING,
		)

		invite_link = f"{settings.FRONTEND_BASE_URL}/invite/{raw_token}"
		teacher_name = teacher.get_full_name() or teacher.email
		message = (
			f"Hello,\n\n"
			f"{teacher_name} invited you to join the class '{classroom.name}'.\n\n"
			f"Join now: {invite_link}\n"
			f"This invitation expires at {invite.expires_at.isoformat()} (UTC).\n\n"
			f"If you already have an account, log in and you'll be enrolled automatically."
		)

		try:
			send_mail(
				subject=f"Invitation to join {classroom.name}",
				message=message,
				from_email=settings.DEFAULT_FROM_EMAIL,
				recipient_list=[email],
				fail_silently=False,
			)
		except Exception:
			invite.delete()
			skipped.append({'email': email, 'reason': 'email_send_failed'})
			continue

		invited.append(
			{
				'email': email,
				'existing_user': bool(existing_user),
				'status': 'pending',
				'expires_at': invite.expires_at.isoformat(),
			}
		)

	return JsonResponse(
		{
			'class_id': classroom.class_id,
			'invited_count': len(invited),
			'skipped_count': len(skipped),
			'invited': invited,
			'skipped': skipped,
		}
	)


def invitation_status(request, token):
	user = get_user_from_request(request)
	token_hash = ClassroomInvitation.hash_token(token)
	invite = ClassroomInvitation.objects.filter(token_hash=token_hash).select_related('classroom').first()

	if invite is None:
		return JsonResponse({'valid': False, 'reason': 'invalid_token'}, status=404)

	if invite.status == ClassroomInvitation.STATUS_ACCEPTED:
		return JsonResponse({'valid': False, 'reason': 'already_used'}, status=400)

	if invite.is_expired():
		if invite.status == ClassroomInvitation.STATUS_PENDING:
			invite.status = ClassroomInvitation.STATUS_EXPIRED
			invite.save(update_fields=['status'])
		return JsonResponse({'valid': False, 'reason': 'expired'}, status=400)

	if user is not None:
		if user.email.lower() != invite.email.lower():
			return JsonResponse(
				{
					'valid': True,
					'requires_login': True,
					'email': invite.email,
					'reason': 'email_mismatch',
				}
			)

		Enrollment.objects.get_or_create(classroom=invite.classroom, student=user)
		invite.mark_accepted()
		return JsonResponse(
			{
				'valid': True,
				'auto_enrolled': True,
				'class_id': invite.classroom.class_id,
				'classroom_name': invite.classroom.name,
			}
		)

	user_exists = User.objects.filter(email__iexact=invite.email).exists()
	return JsonResponse(
		{
			'valid': True,
			'requires_login': user_exists,
			'requires_registration': not user_exists,
			'email': invite.email,
			'class_id': invite.classroom.class_id,
			'classroom_name': invite.classroom.name,
			'expires_at': invite.expires_at.isoformat(),
		}
	)


@csrf_exempt
def classroom_notes(request, class_id):
	user, classroom, is_owner, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	if request.method == 'GET':
		notes = ClassroomNote.objects.filter(classroom=classroom).order_by('id')
		return JsonResponse({'notes': [_serialize_saved_note(note) for note in notes]})

	if request.method == 'POST':
		if not is_owner:
			return JsonResponse({'detail': 'Only the teacher can save notes'}, status=403)

		data = _json_body(request)
		title = (data.get('title') or '').strip()
		content = (data.get('content') or '').strip()

		if not title:
			return JsonResponse({'detail': 'Note title is required'}, status=400)
		if not content:
			return JsonResponse({'detail': 'Note content is required'}, status=400)

		note = ClassroomNote.objects.create(classroom=classroom, title=title, content=content)
		return JsonResponse({'note': _serialize_saved_note(note)}, status=201)

	return JsonResponse({'detail': 'Method not allowed'}, status=405)


def displayed_notes(request, class_id):
	_, classroom, _, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	displayed = DisplayedClassroomNote.objects.filter(classroom=classroom).select_related('note').order_by('displayed_at', 'id')
	return JsonResponse({'displayed_notes': [_serialize_displayed_note(item) for item in displayed]})


@csrf_exempt
def display_note(request, class_id, note_id):
	user, classroom, is_owner, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	if not is_owner:
		return JsonResponse({'detail': 'Only the teacher can display notes'}, status=403)

	note = ClassroomNote.objects.filter(classroom=classroom, id=note_id).first()
	if note is None:
		return JsonResponse({'detail': 'Note not found'}, status=404)

	displayed = DisplayedClassroomNote.objects.create(classroom=classroom, note=note, displayed_by=user)
	payload = _serialize_displayed_note(displayed)
	_broadcast_note_event(class_id, 'note_displayed', payload)
	return JsonResponse({'displayed_note': payload}, status=201)


@csrf_exempt
def remove_displayed_note(request, class_id, displayed_note_id):
	_, classroom, is_owner, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	if request.method != 'DELETE':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	if not is_owner:
		return JsonResponse({'detail': 'Only the teacher can remove displayed notes'}, status=403)

	displayed_note = DisplayedClassroomNote.objects.filter(classroom=classroom, id=displayed_note_id).first()
	if displayed_note is None:
		return JsonResponse({'detail': 'Displayed note not found'}, status=404)

	displayed_note.delete()
	payload = {'id': displayed_note_id}
	_broadcast_note_event(class_id, 'note_removed', payload)
	return JsonResponse({'removed': payload})


def get_livekit_token(request, class_id):
	user = get_user_from_request(request)
	if user is None:
		return JsonResponse({'detail': 'Authentication required'}, status=401)
	
	classroom = Classroom.objects.filter(class_id=class_id).first()
	if not classroom:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)
	
	# Check enrollment or ownership
	is_owner = classroom.owner == user
	if not is_owner:
		enrollment = Enrollment.objects.filter(classroom=classroom, student=user).exists()
		if not enrollment:
			return JsonResponse({'detail': 'Not enrolled in this classroom'}, status=403)
	
	try:
		API_KEY = os.getenv('LIVEKIT_API_KEY')
		API_SECRET = os.getenv('LIVEKIT_API_SECRET')

		if not API_KEY or not API_SECRET:
			return JsonResponse({'detail': 'LiveKit server credentials are not configured'}, status=500)
		
		# Define participant token
		token = api.AccessToken(API_KEY, API_SECRET) \
			.with_identity(str(user.username)) \
			.with_name(user.first_name or user.username) \
			.with_grants(api.VideoGrants(
				room_join=True,
				room=class_id,
				can_publish=True,
				can_subscribe=True,
			))
		
		return JsonResponse({'token': token.to_jwt()})
	except Exception as e:
		return JsonResponse({'detail': str(e)}, status=500)

