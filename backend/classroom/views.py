import csv
import io
import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from authentication.models import UserProfile
from classroom.models import Classroom, ClassroomInvitation, Enrollment


def _json_body(request):
	if not request.body:
		return {}
	return json.loads(request.body)


def _require_teacher(request):
	if not request.user.is_authenticated:
		return JsonResponse({'detail': 'Authentication required'}, status=401)
	role = getattr(getattr(request.user, 'profile', None), 'role', None)
	if role != UserProfile.ROLE_TEACHER:
		return JsonResponse({'detail': 'Teacher role required'}, status=403)
	return None


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


@csrf_exempt
def create_classroom(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	data = _json_body(request)
	class_name = (data.get('name') or '').strip()
	if not class_name:
		return JsonResponse({'detail': 'Classroom name is required'}, status=400)

	classroom = Classroom.objects.create(owner=request.user, name=class_name)
	return JsonResponse(
		{
			'classroom': _serialize_classroom(classroom),
			'redirect_url': f"/classrooms/{classroom.class_id}",
		},
		status=201,
	)


def list_my_classrooms(request):
	if not request.user.is_authenticated:
		return JsonResponse({'detail': 'Authentication required'}, status=401)

	classrooms = Classroom.objects.filter(owner=request.user).order_by('-created_at')
	return JsonResponse({'classrooms': [_serialize_classroom(item) for item in classrooms]})


def classroom_detail(request, class_id):
	if not request.user.is_authenticated:
		return JsonResponse({'detail': 'Authentication required'}, status=401)

	try:
		classroom = Classroom.objects.get(class_id=class_id)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	if classroom.owner_id == request.user.id:
		return JsonResponse({'classroom': _serialize_classroom(classroom, include_students=True), 'owned': True})

	is_enrolled = Enrollment.objects.filter(classroom=classroom, student=request.user).exists()
	if not is_enrolled:
		return JsonResponse({'detail': 'Not allowed'}, status=403)

	return JsonResponse({'classroom': _serialize_classroom(classroom), 'owned': False})


@csrf_exempt
def invite_students(request, class_id):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	try:
		classroom = Classroom.objects.get(class_id=class_id, owner=request.user)
	except Classroom.DoesNotExist:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)

	emails_text = request.POST.get('emails', '')
	csv_file = request.FILES.get('file')
	expiration_hours = int(request.POST.get('expiration_hours', 72))

	emails = _collect_emails(emails_text, csv_file)
	if not emails:
		return JsonResponse({'detail': 'No email addresses found'}, status=400)

	invited = []
	skipped = []

	with transaction.atomic():
		for email in emails:
			try:
				validate_email(email)
			except ValidationError:
				skipped.append({'email': email, 'reason': 'invalid_email'})
				continue

			user = User.objects.filter(email__iexact=email).first()
			if user and Enrollment.objects.filter(classroom=classroom, student=user).exists():
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
			invite = ClassroomInvitation.objects.create(
				classroom=classroom,
				invited_by=request.user,
				email=email,
				role=ClassroomInvitation.ROLE_STUDENT,
				token_hash=token_hash,
				expires_at=timezone.now() + timedelta(hours=expiration_hours),
				status=ClassroomInvitation.STATUS_PENDING,
			)

			invite_link = f"{settings.FRONTEND_BASE_URL}/invite/{raw_token}"
			teacher_name = request.user.get_full_name() or request.user.email
			message = (
				f"Hello,\n\n"
				f"{teacher_name} invited you to join the class '{classroom.name}'.\n\n"
				f"Join now: {invite_link}\n"
				f"This invitation expires at {invite.expires_at.isoformat()} (UTC).\n\n"
				f"If you already have an account, log in and you'll be enrolled automatically."
			)

			send_mail(
				subject=f"Invitation to join {classroom.name}",
				message=message,
				from_email=settings.DEFAULT_FROM_EMAIL,
				recipient_list=[email],
				fail_silently=False,
			)

			invited.append(
				{
					'email': email,
					'existing_user': bool(user),
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

	if request.user.is_authenticated:
		if request.user.email.lower() != invite.email.lower():
			return JsonResponse(
				{
					'valid': True,
					'requires_login': True,
					'email': invite.email,
					'reason': 'email_mismatch',
				}
			)

		Enrollment.objects.get_or_create(classroom=invite.classroom, student=request.user)
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
