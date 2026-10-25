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
from classroom.models import (
	Classroom, ClassroomInvitation, ClassroomNote, ClassroomNotification,
	DisplayedClassroomNote, Enrollment, ClassroomSession, StudentAttendanceRecord,
	ClassroomResource, Assignment, AssignmentSubmission, ClassroomSchedule, ScheduleReminderLog
)
from examination.models import ExamAttempt
from classroom.schedule_utils import (
	get_classroom_next_session, generate_classroom_ics, generate_calendar_links, DAY_NAMES
)


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


def _serialize_resource(resource, request=None):
	file_url = None
	if resource.file:
		file_url = resource.file.url
		if request and not file_url.startswith('http'):
			file_url = request.build_absolute_uri(file_url)

	return {
		'id': resource.id,
		'title': resource.title,
		'description': resource.description,
		'resource_type': resource.resource_type,
		'file_url': file_url,
		'link_url': resource.link_url,
		'file_size_bytes': resource.file_size_bytes,
		'uploaded_by': resource.uploaded_by.first_name or resource.uploaded_by.username,
		'uploaded_at': resource.uploaded_at.isoformat(),
	}


@csrf_exempt
def classroom_resources(request, class_id):
	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if request.method == 'GET':
		resources = ClassroomResource.objects.filter(classroom=classroom).order_by('-uploaded_at')
		return JsonResponse({
			'resources': [_serialize_resource(r, request) for r in resources]
		})

	if request.method == 'POST':
		if not is_owner:
			return JsonResponse({'detail': 'Only teachers can upload resources'}, status=403)

		title = request.POST.get('title', '').strip()
		description = request.POST.get('description', '').strip()
		resource_type = request.POST.get('resource_type', ClassroomResource.TYPE_DOCUMENT)
		link_url = request.POST.get('link_url', '').strip() or None
		uploaded_file = request.FILES.get('file')

		if not title:
			json_data = _json_body(request)
			title = (json_data.get('title') or '').strip()
			description = (json_data.get('description') or '').strip()
			resource_type = json_data.get('resource_type') or ClassroomResource.TYPE_LINK
			link_url = (json_data.get('link_url') or '').strip() or None

		if not title:
			return JsonResponse({'detail': 'Title is required'}, status=400)

		if resource_type == ClassroomResource.TYPE_LINK:
			if not link_url:
				return JsonResponse({'detail': 'A valid link URL is required for link resources'}, status=400)
		elif not uploaded_file:
			return JsonResponse({'detail': 'A file is required for document/slide/pdf resources'}, status=400)

		file_size = uploaded_file.size if uploaded_file else 0
		if file_size > settings.MAX_UPLOAD_SIZE:
			return JsonResponse({'detail': 'File size exceeds 25 MB limit'}, status=400)

		resource = ClassroomResource.objects.create(
			classroom=classroom,
			uploaded_by=user,
			title=title,
			description=description,
			resource_type=resource_type,
			file=uploaded_file,
			link_url=link_url,
			file_size_bytes=file_size,
		)

		return JsonResponse(_serialize_resource(resource, request), status=201)

	return JsonResponse({'detail': 'Method not allowed'}, status=405)


@csrf_exempt
def delete_classroom_resource(request, class_id, resource_id):
	if request.method != 'DELETE':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if not is_owner:
		return JsonResponse({'detail': 'Only teachers can delete resources'}, status=403)

	try:
		resource = ClassroomResource.objects.get(id=resource_id, classroom=classroom)
	except ClassroomResource.DoesNotExist:
		return JsonResponse({'detail': 'Resource not found'}, status=404)

	if resource.file:
		resource.file.delete(save=False)
	resource.delete()

	return JsonResponse({'detail': 'Resource deleted successfully'}, status=200)


def _serialize_submission(submission, request=None):
	file_url = None
	if submission.submission_file:
		file_url = submission.submission_file.url
		if request and not file_url.startswith('http'):
			file_url = request.build_absolute_uri(file_url)

	student_name = f"{submission.student.first_name} {submission.student.last_name}".strip() or submission.student.username
	return {
		'id': submission.id,
		'assignment_id': submission.assignment_id,
		'student_id': submission.student.id,
		'student_name': student_name,
		'student_email': submission.student.email,
		'text_response': submission.text_response,
		'submission_file_url': file_url,
		'submission_file_name': os.path.basename(submission.submission_file.name) if submission.submission_file else None,
		'submitted_at': submission.submitted_at.isoformat() if submission.submitted_at else None,
		'status': submission.status,
		'score': float(submission.score) if submission.score is not None else None,
		'feedback': submission.feedback,
		'graded_at': submission.graded_at.isoformat() if submission.graded_at else None,
		'is_late': submission.status == AssignmentSubmission.STATUS_LATE,
	}


def _serialize_assignment(assignment, student_user=None, is_teacher=False, request=None):
	attachment_url = None
	if assignment.attachment:
		attachment_url = assignment.attachment.url
		if request and not attachment_url.startswith('http'):
			attachment_url = request.build_absolute_uri(attachment_url)

	data = {
		'id': assignment.id,
		'title': assignment.title,
		'instructions': assignment.instructions,
		'due_date': assignment.due_date.isoformat(),
		'max_points': assignment.max_points,
		'attachment_url': attachment_url,
		'attachment_name': os.path.basename(assignment.attachment.name) if assignment.attachment else None,
		'is_past_due': assignment.is_past_due(),
		'created_at': assignment.created_at.isoformat(),
		'submissions_count': assignment.submissions.count(),
		'graded_count': assignment.submissions.filter(status=AssignmentSubmission.STATUS_GRADED).count(),
	}

	if not is_teacher and student_user:
		sub = assignment.submissions.filter(student=student_user).first()
		if sub:
			data['my_submission'] = _serialize_submission(sub, request)
			data['my_status'] = sub.status
		else:
			data['my_submission'] = None
			data['my_status'] = 'late' if assignment.is_past_due() else 'pending'
	return data


@csrf_exempt
def classroom_assignments(request, class_id):
	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if request.method == 'GET':
		assignments = Assignment.objects.filter(classroom=classroom).order_by('-due_date')
		return JsonResponse({
			'assignments': [
				_serialize_assignment(a, student_user=user, is_teacher=is_owner, request=request)
				for a in assignments
			]
		})

	if request.method == 'POST':
		if not is_owner:
			return JsonResponse({'detail': 'Only teachers can create assignments'}, status=403)

		title = request.POST.get('title', '').strip()
		instructions = request.POST.get('instructions', '').strip()
		due_date_str = request.POST.get('due_date', '').strip()
		max_points_str = str(request.POST.get('max_points', '100')).strip()
		attachment = request.FILES.get('attachment')

		if not title:
			json_data = _json_body(request)
			title = (json_data.get('title') or '').strip()
			instructions = (json_data.get('instructions') or '').strip()
			due_date_str = (json_data.get('due_date') or '').strip()
			max_points_str = str(json_data.get('max_points') or '100').strip()

		if not title:
			return JsonResponse({'detail': 'Assignment title is required'}, status=400)
		if not due_date_str:
			return JsonResponse({'detail': 'Due date is required'}, status=400)

		try:
			from django.utils.dateparse import parse_datetime
			due_date = parse_datetime(due_date_str)
			if not due_date:
				from datetime import datetime
				due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
			if timezone.is_naive(due_date):
				due_date = timezone.make_aware(due_date)
		except Exception:
			return JsonResponse({'detail': 'Invalid due date format. Use ISO 8601 string.'}, status=400)

		try:
			max_points = int(max_points_str)
			if max_points <= 0:
				raise ValueError()
		except ValueError:
			return JsonResponse({'detail': 'max_points must be a positive integer'}, status=400)

		if attachment and attachment.size > settings.MAX_UPLOAD_SIZE:
			return JsonResponse({'detail': 'Attachment file size exceeds 25 MB limit'}, status=400)

		assignment = Assignment.objects.create(
			classroom=classroom,
			created_by=user,
			title=title,
			instructions=instructions,
			attachment=attachment,
			due_date=due_date,
			max_points=max_points,
		)

		return JsonResponse(_serialize_assignment(assignment, student_user=None, is_teacher=True, request=request), status=201)

	return JsonResponse({'detail': 'Method not allowed'}, status=405)


@csrf_exempt
def assignment_detail(request, class_id, assignment_id):
	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	try:
		assignment = Assignment.objects.get(id=assignment_id, classroom=classroom)
	except Assignment.DoesNotExist:
		return JsonResponse({'detail': 'Assignment not found'}, status=404)

	if request.method == 'GET':
		return JsonResponse(_serialize_assignment(assignment, student_user=user, is_teacher=is_owner, request=request))

	if request.method == 'DELETE':
		if not is_owner:
			return JsonResponse({'detail': 'Only teachers can delete assignments'}, status=403)
		if assignment.attachment:
			assignment.attachment.delete(save=False)
		assignment.delete()
		return JsonResponse({'detail': 'Assignment deleted successfully'})

	return JsonResponse({'detail': 'Method not allowed'}, status=405)


@csrf_exempt
def submit_assignment(request, class_id, assignment_id):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if is_owner:
		return JsonResponse({'detail': 'Teachers cannot submit assignments'}, status=403)

	try:
		assignment = Assignment.objects.get(id=assignment_id, classroom=classroom)
	except Assignment.DoesNotExist:
		return JsonResponse({'detail': 'Assignment not found'}, status=404)

	text_response = request.POST.get('text_response', '').strip()
	submission_file = request.FILES.get('submission_file')

	if not text_response and not submission_file:
		json_data = _json_body(request)
		text_response = (json_data.get('text_response') or '').strip()

	if not text_response and not submission_file:
		return JsonResponse({'detail': 'Please provide text response or a submission file'}, status=400)

	if submission_file and submission_file.size > settings.MAX_UPLOAD_SIZE:
		return JsonResponse({'detail': 'Submission file exceeds 25 MB limit'}, status=400)

	now = timezone.now()
	status_to_set = AssignmentSubmission.STATUS_LATE if now > assignment.due_date else AssignmentSubmission.STATUS_SUBMITTED

	submission, created = AssignmentSubmission.objects.get_or_create(
		assignment=assignment,
		student=user,
		defaults={'text_response': text_response, 'submission_file': submission_file, 'status': status_to_set}
	)

	if not created:
		submission.text_response = text_response
		if submission_file:
			submission.submission_file = submission_file
		submission.submitted_at = now
		submission.status = status_to_set
		submission.save()

	return JsonResponse(_serialize_submission(submission, request), status=201 if created else 200)


@csrf_exempt
def assignment_submissions(request, class_id, assignment_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if not is_owner:
		return JsonResponse({'detail': 'Only teachers can view all submissions'}, status=403)

	try:
		assignment = Assignment.objects.get(id=assignment_id, classroom=classroom)
	except Assignment.DoesNotExist:
		return JsonResponse({'detail': 'Assignment not found'}, status=404)

	submissions = AssignmentSubmission.objects.filter(assignment=assignment).select_related('student').order_by('-submitted_at')
	return JsonResponse({
		'assignment_id': assignment.id,
		'assignment_title': assignment.title,
		'max_points': assignment.max_points,
		'submissions': [_serialize_submission(s, request) for s in submissions]
	})


@csrf_exempt
def grade_submission(request, class_id, assignment_id, submission_id):
	if request.method not in ['PATCH', 'POST']:
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if not is_owner:
		return JsonResponse({'detail': 'Only teachers can grade submissions'}, status=403)

	try:
		assignment = Assignment.objects.get(id=assignment_id, classroom=classroom)
		submission = AssignmentSubmission.objects.get(id=submission_id, assignment=assignment)
	except (Assignment.DoesNotExist, AssignmentSubmission.DoesNotExist):
		return JsonResponse({'detail': 'Submission not found'}, status=404)

	body = _json_body(request)
	score_raw = body.get('score', request.POST.get('score'))
	feedback = body.get('feedback', request.POST.get('feedback', ''))

	if score_raw is None:
		return JsonResponse({'detail': 'Score is required'}, status=400)

	try:
		score = float(score_raw)
		if score < 0 or score > assignment.max_points:
			return JsonResponse({'detail': f'Score must be between 0 and {assignment.max_points}'}, status=400)
	except (ValueError, TypeError):
		return JsonResponse({'detail': 'Invalid score number'}, status=400)

	submission.score = score
	submission.feedback = (feedback or '').strip()
	submission.graded_by = user
	submission.graded_at = timezone.now()
	submission.status = AssignmentSubmission.STATUS_GRADED
	submission.save()

	return JsonResponse(_serialize_submission(submission, request))


def _compute_gradebook_data(classroom):
	enrollments = Enrollment.objects.filter(classroom=classroom).select_related('student')
	students = [e.student for e in enrollments]
	assignments = list(Assignment.objects.filter(classroom=classroom).order_by('created_at'))
	total_sessions = ClassroomSession.objects.filter(classroom=classroom).count()

	columns = [
		{'key': 'attendance_pct', 'label': 'Attendance Rate', 'type': 'percentage'},
		{'key': 'quiz_avg_pct', 'label': 'Quizzes Avg', 'type': 'percentage'},
	]
	for a in assignments:
		columns.append({
			'key': f'assign_{a.id}',
			'label': a.title,
			'max_points': a.max_points,
			'type': 'points',
		})
	columns.append({'key': 'overall_pct', 'label': 'Overall Grade', 'type': 'percentage'})

	student_rows = []
	total_completed_assignments = 0

	for s in students:
		# 1. Attendance
		if total_sessions > 0:
			attended_count = StudentAttendanceRecord.objects.filter(
				classroom=classroom, student=s, session__isnull=False
			).values('session').distinct().count()
			attendance_rate = round((attended_count / total_sessions) * 100, 1)
		else:
			has_any = StudentAttendanceRecord.objects.filter(classroom=classroom, student=s).exists()
			attendance_rate = 100.0 if has_any or total_sessions == 0 else 0.0

		# 2. Quizzes
		attempts = ExamAttempt.objects.filter(classroom=classroom, student=s)
		quizzes_taken = attempts.count()
		if quizzes_taken > 0:
			pct_sum = sum((att.correct_count / att.total_questions * 100) if att.total_questions > 0 else 0 for att in attempts)
			quiz_average = round(pct_sum / quizzes_taken, 1)
		else:
			quiz_average = 0.0

		# 3. Assignments
		assign_map = {}
		earned_points = 0.0
		total_possible = 0
		for a in assignments:
			sub = AssignmentSubmission.objects.filter(assignment=a, student=s).first()
			key = f'assign_{a.id}'
			if sub and sub.score is not None:
				assign_map[key] = {'score': float(sub.score), 'status': sub.status}
				earned_points += float(sub.score)
				total_possible += a.max_points
				total_completed_assignments += 1
			elif sub:
				assign_map[key] = {'score': None, 'status': sub.status}
				total_completed_assignments += 1
			else:
				status = 'missing' if a.is_past_due() else 'pending'
				assign_map[key] = {'score': None, 'status': status}

		assign_pct = round((earned_points / total_possible) * 100, 1) if total_possible > 0 else 100.0

		if assignments and quizzes_taken > 0:
			overall = (0.50 * assign_pct) + (0.40 * quiz_average) + (0.10 * attendance_rate)
		elif assignments:
			overall = (0.85 * assign_pct) + (0.15 * attendance_rate)
		elif quizzes_taken > 0:
			overall = (0.85 * quiz_average) + (0.15 * attendance_rate)
		else:
			overall = attendance_rate

		overall_percentage = round(overall, 1)

		if overall_percentage >= 90:
			letter_grade = 'A'
		elif overall_percentage >= 80:
			letter_grade = 'B'
		elif overall_percentage >= 70:
			letter_grade = 'C'
		elif overall_percentage >= 60:
			letter_grade = 'D'
		else:
			letter_grade = 'F'

		is_at_risk = False
		risk_reasons = []
		if attendance_rate < 60:
			is_at_risk = True
			risk_reasons.append('Attendance below 60%')
		if overall_percentage < 60:
			is_at_risk = True
			risk_reasons.append('Overall score below 60%')

		name = f"{s.first_name} {s.last_name}".strip() or s.username
		student_rows.append({
			'student_id': s.id,
			'name': name,
			'email': s.email,
			'attendance_rate': attendance_rate,
			'quizzes_taken': quizzes_taken,
			'quiz_average': quiz_average,
			'assignments': assign_map,
			'overall_percentage': overall_percentage,
			'letter_grade': letter_grade,
			'is_at_risk': is_at_risk,
			'risk_reasons': risk_reasons,
		})

	total_students = len(student_rows)
	class_avg = round(sum(r['overall_percentage'] for r in student_rows) / total_students, 1) if total_students > 0 else 0.0
	att_avg = round(sum(r['attendance_rate'] for r in student_rows) / total_students, 1) if total_students > 0 else 0.0
	potential_submissions = total_students * len(assignments)
	completion_rate = round((total_completed_assignments / potential_submissions) * 100, 1) if potential_submissions > 0 else 100.0
	at_risk_count = sum(1 for r in student_rows if r['is_at_risk'])

	summary = {
		'total_students': total_students,
		'class_average_percent': class_avg,
		'attendance_average_percent': att_avg,
		'assignment_completion_rate': completion_rate,
		'at_risk_students_count': at_risk_count,
	}

	return {
		'summary': summary,
		'columns': columns,
		'students': student_rows,
		'assignments': assignments,
	}


@csrf_exempt
def gradebook_insights(request, class_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if not is_owner:
		return JsonResponse({'detail': 'Only teachers can access gradebook insights'}, status=403)

	data = _compute_gradebook_data(classroom)
	return JsonResponse({
		'summary': data['summary'],
		'columns': data['columns'],
		'students': data['students'],
	})


@csrf_exempt
def export_gradebook_csv(request, class_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if not is_owner:
		return JsonResponse({'detail': 'Only teachers can export the gradebook'}, status=403)

	data = _compute_gradebook_data(classroom)
	assignments = data['assignments']
	students = data['students']

	response = HttpResponse(content_type='text/csv')
	response['Content-Disposition'] = f'attachment; filename="{classroom.class_id}_gradebook.csv"'

	writer = csv.writer(response)
	header = ['Student ID', 'Student Name', 'Email', 'Attendance Rate (%)', 'Quizzes Taken', 'Quiz Average (%)']
	for a in assignments:
		header.append(f"{a.title} (Max: {a.max_points})")
	header.extend(['Overall Grade (%)', 'Letter Grade', 'At Risk', 'Risk Reasons'])
	writer.writerow(header)

	for s in students:
		row = [
			s['student_id'],
			s['name'],
			s['email'],
			s['attendance_rate'],
			s['quizzes_taken'],
			s['quiz_average'],
		]
		for a in assignments:
			asg_data = s['assignments'].get(f"assign_{a.id}")
			score_display = asg_data['score'] if (asg_data and asg_data['score'] is not None) else (asg_data['status'] if asg_data else 'N/A')
			row.append(score_display)
		row.extend([
			s['overall_percentage'],
			s['letter_grade'],
			'YES' if s['is_at_risk'] else 'NO',
			'; '.join(s['risk_reasons']) if s['risk_reasons'] else '',
		])
		writer.writerow(row)

	return response


@csrf_exempt
def classroom_schedule(request, class_id):
	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if request.method == 'GET':
		schedules = list(ClassroomSchedule.objects.filter(classroom=classroom, is_active=True).order_by('day_of_week', 'start_time'))
		frontend_url = settings.FRONTEND_BASE_URL
		next_session = get_classroom_next_session(classroom, schedules)
		calendar_links = generate_calendar_links(classroom, next_session, frontend_url)

		return JsonResponse({
			'next_session': next_session,
			'schedules': [
				{
					'id': s.id,
					'title': s.title,
					'day_of_week': s.day_of_week,
					'day_name': DAY_NAMES[s.day_of_week],
					'start_time': s.start_time.strftime('%H:%M:%S'),
					'end_time': s.end_time.strftime('%H:%M:%S'),
					'timezone_name': s.timezone_name,
					'is_active': s.is_active,
				}
				for s in schedules
			],
			'calendar_links': calendar_links,
		})

	if request.method == 'POST':
		if not is_owner:
			return JsonResponse({'detail': 'Only teachers can create classroom schedules'}, status=403)

		body = _json_body(request)
		title = (body.get('title') or request.POST.get('title') or 'Regular Lecture').strip()
		day_raw = body.get('day_of_week', request.POST.get('day_of_week'))
		start_raw = str(body.get('start_time', request.POST.get('start_time', ''))).strip()
		end_raw = str(body.get('end_time', request.POST.get('end_time', ''))).strip()
		tz_name = (body.get('timezone_name') or request.POST.get('timezone_name') or 'UTC').strip()

		if day_raw is None or not start_raw or not end_raw:
			return JsonResponse({'detail': 'day_of_week, start_time, and end_time are required'}, status=400)

		try:
			day_of_week = int(day_raw)
			if day_of_week < 0 or day_of_week > 6:
				raise ValueError()
		except (ValueError, TypeError):
			return JsonResponse({'detail': 'day_of_week must be an integer between 0 (Monday) and 6 (Sunday)'}, status=400)

		try:
			from datetime import time
			def _parse_time(t_str):
				parts = [int(p) for p in t_str.split(':')]
				if len(parts) == 2:
					return time(parts[0], parts[1])
				elif len(parts) == 3:
					return time(parts[0], parts[1], parts[2])
				raise ValueError()

			start_time = _parse_time(start_raw)
			end_time = _parse_time(end_raw)
			if start_time >= end_time:
				return JsonResponse({'detail': 'start_time must be earlier than end_time'}, status=400)
		except Exception:
			return JsonResponse({'detail': 'Invalid time format. Use HH:MM or HH:MM:SS.'}, status=400)

		sched, _ = ClassroomSchedule.objects.update_or_create(
			classroom=classroom,
			day_of_week=day_of_week,
			start_time=start_time,
			defaults={
				'created_by': user,
				'title': title,
				'end_time': end_time,
				'timezone_name': tz_name,
				'is_active': True,
			}
		)

		return JsonResponse({
			'id': sched.id,
			'title': sched.title,
			'day_of_week': sched.day_of_week,
			'day_name': DAY_NAMES[sched.day_of_week],
			'start_time': sched.start_time.strftime('%H:%M:%S'),
			'end_time': sched.end_time.strftime('%H:%M:%S'),
			'timezone_name': sched.timezone_name,
		}, status=201)

	return JsonResponse({'detail': 'Method not allowed'}, status=405)


@csrf_exempt
def delete_classroom_schedule(request, class_id, schedule_id):
	if request.method != 'DELETE':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	if not is_owner:
		return JsonResponse({'detail': 'Only teachers can delete classroom schedules'}, status=403)

	try:
		sched = ClassroomSchedule.objects.get(id=schedule_id, classroom=classroom)
	except ClassroomSchedule.DoesNotExist:
		return JsonResponse({'detail': 'Schedule not found'}, status=404)

	sched.delete()
	return JsonResponse({'detail': 'Schedule deleted successfully'})


@csrf_exempt
def download_classroom_ics(request, class_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, err = _require_class_member(request, class_id)
	if err:
		return err

	schedules = ClassroomSchedule.objects.filter(classroom=classroom, is_active=True).order_by('day_of_week', 'start_time')
	frontend_url = settings.FRONTEND_BASE_URL
	ics_content = generate_classroom_ics(classroom, schedules, frontend_url)

	response = HttpResponse(ics_content, content_type='text/calendar; charset=utf-8')
	response['Content-Disposition'] = f'attachment; filename="{classroom.class_id}_schedule.ics"'
	return response

