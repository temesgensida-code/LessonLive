import csv
import io
import json
import os
import logging
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from authentication.jwt_auth import get_user_from_request
from authentication.models import UserProfile
from classroom.models import Classroom, ClassroomInvitation, ClassroomNote, ClassroomNotification, DisplayedClassroomNote, Enrollment, ClassroomSession, StudentAttendanceRecord


logger = logging.getLogger(__name__)


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
		'index': note.note_index,
		'title': note.title,
		'content': note.content,
		'saved_date': note.created_at.isoformat(),
	}


def _serialize_displayed_note(displayed_note):
	note = displayed_note.note
	return {
		'id': displayed_note.id,
		'note_id': note.id,
		'index': note.note_index,
		'title': note.title,
		'content': note.content,
		'saved_date': note.created_at.isoformat(),
		'displayed_date': displayed_note.displayed_at.isoformat(),
	}


def _note_group_name(class_id):
	return f'classroom_{class_id}_notes'


def _broadcast_notification_event(class_id, payload):
	channel_layer = get_channel_layer()
	if channel_layer is None:
		return

	async_to_sync(channel_layer.group_send)(
		_note_group_name(class_id),
		{
			'type': 'note.event',
			'event_type': 'notification_sent',
			'payload': payload,
		},
	)


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

	if not settings.DEBUG and settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
		return JsonResponse(
			{
				'detail': 'Email service is not configured in production.',
				'configure': [
					'EMAIL_HOST',
					'EMAIL_PORT',
					'EMAIL_HOST_USER',
					'EMAIL_HOST_PASSWORD',
					'EMAIL_USE_TLS',
					'DEFAULT_FROM_EMAIL',
				],
			},
			status=503,
		)

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
		).first()

		if existing_pending:
			invite = existing_pending
			raw_token = None
		else:
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

		if raw_token is None:
			raw_token, token_hash = ClassroomInvitation.issue_token()
			invite.token_hash = token_hash
			invite.expires_at = timezone.now() + timedelta(hours=expiration_hours)
			invite.status = ClassroomInvitation.STATUS_PENDING
			invite.invited_by = teacher
			invite.save(update_fields=['token_hash', 'expires_at', 'status', 'invited_by'])

		invite_link = f"{settings.FRONTEND_BASE_URL}/invite/{quote(raw_token, safe='')}"
		logger.info('Generated invitation link for %s: %s', email, invite_link)
		print(f"Invitation link for {email}: {invite_link}")
		teacher_name = teacher.get_full_name() or teacher.email
		if existing_user:
			message = (
				f"Hello,\n\n"
				f"{teacher_name} is inviting you again to join the class '{classroom.name}'.\n\n"
				f"Join now: {invite_link}\n"
				f"This invitation expires at {invite.expires_at.isoformat()} (UTC).\n\n"
				f"You already have an account, so please log in with your existing account to join."
			)
		else:
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
				timeout=7,
			)
		except Exception as exc:
			skipped.append(
				{
					'email': email,
					'reason': 'email_send_failed',
					'detail': str(exc),
					'invite_link': invite_link,
				}
			)
			continue

		invited.append(
			{
				'email': email,
				'existing_user': bool(existing_user),
				'reinvited': bool(existing_user),
				'status': 'pending',
				'expires_at': invite.expires_at.isoformat(),
				'invite_link': invite_link,
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
		notes = ClassroomNote.objects.filter(classroom=classroom).order_by('note_index', 'id')
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


@csrf_exempt
def delete_classroom_note(request, class_id, note_id):
	_, classroom, is_owner, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	if request.method != 'DELETE':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	if not is_owner:
		return JsonResponse({'detail': 'Only the teacher can delete notes'}, status=403)

	note = ClassroomNote.objects.filter(classroom=classroom, id=note_id).first()
	if note is None:
		return JsonResponse({'detail': 'Note not found'}, status=404)

	deleted_note_id = note.id
	deleted_note_index = note.note_index
	displayed_ids = list(
		DisplayedClassroomNote.objects.filter(classroom=classroom, note=note).values_list('id', flat=True)
	)

	with transaction.atomic():
		note.delete()
		ClassroomNote.objects.filter(classroom=classroom, note_index__gt=deleted_note_index).update(
			note_index=F('note_index') - 1
		)

	for displayed_id in displayed_ids:
		_broadcast_note_event(class_id, 'note_removed', {'id': displayed_id})

	remaining_notes = ClassroomNote.objects.filter(classroom=classroom).order_by('note_index', 'id')
	return JsonResponse(
		{
			'removed': {'id': deleted_note_id, 'index': deleted_note_index},
			'notes': [_serialize_saved_note(item) for item in remaining_notes],
		}
	)


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
		from livekit import api as livekit_api
	except ImportError:
		payload = {
			'detail': 'LiveKit API SDK is not installed. Install it with: pip install livekit-api',
			'livekit_enabled': False,
			'token': '',
		}
		return JsonResponse(payload, status=200 if settings.DEBUG else 500)
	
	try:
		API_KEY = os.getenv('LIVEKIT_API_KEY')
		API_SECRET = os.getenv('LIVEKIT_API_SECRET')

		missing = []
		if not API_KEY:
			missing.append('LIVEKIT_API_KEY')
		if not API_SECRET:
			missing.append('LIVEKIT_API_SECRET')

		if missing:
			payload = {
				'detail': 'LiveKit server credentials are not configured',
				'missing': missing,
				'livekit_enabled': False,
				'token': '',
			}
			return JsonResponse(payload, status=200 if settings.DEBUG else 503)
		
		# Define participant token
		token = livekit_api.AccessToken(API_KEY, API_SECRET) \
			.with_identity(str(user.username)) \
			.with_name(user.first_name or user.username) \
			.with_grants(livekit_api.VideoGrants(
				room_join=True,
				room=class_id,
				can_publish=True,
				can_subscribe=True,
			))
		
		return JsonResponse({'token': token.to_jwt(), 'livekit_enabled': True})
	except Exception as e:
		return JsonResponse({'detail': f'LiveKit token generation failed: {str(e)}'}, status=500)


@csrf_exempt
def send_notification(request, class_id):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	try:
		classroom = Classroom.objects.get(class_id=class_id, owner=user)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	data = _json_body(request)
	message = (data.get('message') or '').strip()
	if not message:
		return JsonResponse({'detail': 'Notification message is required'}, status=400)

	try:
		countdown_minutes = int(data.get('countdown_minutes', 0))
	except (TypeError, ValueError):
		return JsonResponse({'detail': 'countdown_minutes must be an integer'}, status=400)

	if countdown_minutes <= 0:
		return JsonResponse({'detail': 'countdown_minutes must be greater than 0'}, status=400)

	countdown_seconds = countdown_minutes * 60

	notification = ClassroomNotification.objects.create(
		classroom=classroom,
		created_by=user,
		message=message,
		countdown_seconds=countdown_seconds,
	)

	payload = {
		'id': notification.id,
		'message': notification.message,
		'countdown_seconds': notification.countdown_seconds,
		'created_at': notification.created_at.isoformat(),
		'created_by': user.email,
	}

	_broadcast_notification_event(class_id, payload)

	return JsonResponse({'notification': payload}, status=201)


def list_notifications(request, class_id):
	_, classroom, _, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	notifications = ClassroomNotification.objects.filter(
		classroom=classroom,
	).select_related('created_by').order_by('-created_at')[:20]

	result = []
	now = timezone.now()
	for n in notifications:
		ends_at = n.created_at + timedelta(seconds=n.countdown_seconds)
		if ends_at > now:
			result.append({
				'id': n.id,
				'message': n.message,
				'countdown_seconds': n.countdown_seconds,
				'created_at': n.created_at.isoformat(),
				'created_by': n.created_by.email,
			})

	return JsonResponse({'notifications': result})


def classroom_attendance_insights(request, class_id):
	user, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	try:
		classroom = Classroom.objects.get(class_id=class_id, owner=user)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	session_id = request.GET.get('session_id')
	records_qs = StudentAttendanceRecord.objects.filter(classroom=classroom)
	if session_id:
		records_qs = records_qs.filter(session_id=session_id)

	enrolled_students = User.objects.filter(class_enrollments__classroom=classroom).distinct()
	total_enrolled = enrolled_students.count()

	student_records_map = {}
	for rec in records_qs.select_related('student', 'session').order_by('-joined_at'):
		rec_duration = rec.duration_seconds
		if rec.status == StudentAttendanceRecord.STATUS_ACTIVE and rec.joined_at:
			rec_duration = max(rec_duration, int((timezone.now() - rec.joined_at).total_seconds()))

		if rec.student_id not in student_records_map:
			student_records_map[rec.student_id] = {
				'records': [],
				'total_duration_seconds': 0,
				'is_active': False,
				'latest_joined_at': rec.joined_at,
				'latest_left_at': rec.left_at,
				'latest_topic': rec.joined_topic,
			}

		s_data = student_records_map[rec.student_id]
		s_data['records'].append(rec)
		s_data['total_duration_seconds'] += rec_duration
		if rec.status == StudentAttendanceRecord.STATUS_ACTIVE:
			s_data['is_active'] = True

	student_insights = []
	total_attended = len(student_records_map)
	active_now_count = 0
	sum_duration_secs = 0

	for s in enrolled_students:
		s_info = student_records_map.get(s.id)
		if s_info:
			duration_mins = round(s_info['total_duration_seconds'] / 60, 1)
			sum_duration_secs += s_info['total_duration_seconds']
			is_active = s_info['is_active']
			if is_active:
				active_now_count += 1
				status_str = 'Active Now'
			else:
				status_str = 'Left'

			if duration_mins >= 15:
				engagement = 'High'
			elif duration_mins >= 5:
				engagement = 'Moderate'
			else:
				engagement = 'Low'

			student_insights.append({
				'student_id': s.id,
				'username': s.username,
				'email': s.email,
				'full_name': s.get_full_name() or s.username,
				'status': status_str,
				'total_duration_minutes': duration_mins,
				'joined_at': s_info['latest_joined_at'].isoformat() if s_info['latest_joined_at'] else None,
				'left_at': s_info['latest_left_at'].isoformat() if s_info['latest_left_at'] else None,
				'joined_topic': s_info['latest_topic'],
				'engagement': engagement,
				'sessions_attended_count': len(s_info['records']),
			})
		else:
			student_insights.append({
				'student_id': s.id,
				'username': s.username,
				'email': s.email,
				'full_name': s.get_full_name() or s.username,
				'status': 'Absent',
				'total_duration_minutes': 0,
				'joined_at': None,
				'left_at': None,
				'joined_topic': 'N/A',
				'engagement': 'None',
				'sessions_attended_count': 0,
			})

	student_insights.sort(key=lambda x: (x['status'] != 'Active Now', -x['total_duration_minutes']))

	avg_duration_minutes = round((sum_duration_secs / total_attended / 60), 1) if total_attended > 0 else 0
	attendance_rate = round((total_attended / total_enrolled * 100), 1) if total_enrolled > 0 else 0

	sessions = list(
		ClassroomSession.objects.filter(classroom=classroom).values('id', 'title', 'started_at', 'ended_at', 'is_active')
	)

	return JsonResponse({
		'summary': {
			'total_enrolled': total_enrolled,
			'total_attended': total_attended,
			'active_now': active_now_count,
			'attendance_rate': attendance_rate,
			'avg_duration_minutes': avg_duration_minutes,
		},
		'students': student_insights,
		'sessions': [{
			'id': s['id'],
			'title': s['title'],
			'started_at': s['started_at'].isoformat() if s['started_at'] else None,
			'ended_at': s['ended_at'].isoformat() if s['ended_at'] else None,
			'is_active': s['is_active'],
		} for s in sessions],
	})


def export_attendance_csv(request, class_id):
	user, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	try:
		classroom = Classroom.objects.get(class_id=class_id, owner=user)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	records = StudentAttendanceRecord.objects.filter(classroom=classroom).select_related('student', 'session').order_by('-joined_at')

	response = HttpResponse(content_type='text/csv')
	response['Content-Disposition'] = f'attachment; filename="attendance_{class_id}.csv"'

	writer = csv.writer(response)
	writer.writerow(['Student Username', 'Student Email', 'Session Title', 'Joined Topic', 'Joined At', 'Left At', 'Duration (Mins)', 'Status'])

	for r in records:
		joined = r.joined_at.strftime('%Y-%m-%d %H:%M:%S') if r.joined_at else ''
		left = r.left_at.strftime('%Y-%m-%d %H:%M:%S') if r.left_at else ('Active' if r.status == 'active' else '')
		duration_mins = round(r.duration_seconds / 60, 1)
		writer.writerow([
			r.student.username,
			r.student.email,
			r.session.title if r.session else 'General Session',
			r.joined_topic,
			joined,
			left,
			duration_mins,
			r.status.capitalize()
		])

	return response

