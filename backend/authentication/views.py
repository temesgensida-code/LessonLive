import json
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from authentication.jwt_auth import (
	clear_refresh_cookie,
	get_user_from_request,
	issue_tokens_for_user,
	refresh_access_from_cookie,
	set_refresh_cookie,
)
from authentication.models import UserProfile
from classroom.models import ClassroomInvitation, Enrollment
from authentication.email_service import send_verification_email
import uuid
import hashlib
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


def _json_body(request):
	if not request.body:
		return {}
	return json.loads(request.body)


def _accept_invite_for_user(raw_token, user):
	if not raw_token:
		return None

	token_hash = ClassroomInvitation.hash_token(raw_token)
	try:
		invite = ClassroomInvitation.objects.select_related('classroom').get(
			token_hash=token_hash,
			status=ClassroomInvitation.STATUS_PENDING,
		)
	except ClassroomInvitation.DoesNotExist:
		return {'accepted': False, 'reason': 'invalid_token'}

	if invite.is_expired():
		invite.status = ClassroomInvitation.STATUS_EXPIRED
		invite.save(update_fields=['status'])
		return {'accepted': False, 'reason': 'expired'}

	if user.email.lower() != invite.email.lower():
		return {'accepted': False, 'reason': 'email_mismatch'}

	Enrollment.objects.get_or_create(classroom=invite.classroom, student=user)
	invite.mark_accepted()
	return {
		'accepted': True,
		'class_id': invite.classroom.class_id,
		'classroom_name': invite.classroom.name,
	}


def _auth_payload(user):
	tokens = issue_tokens_for_user(user)
	role = getattr(getattr(user, 'profile', None), 'role', None)
	return {
		'id': user.id,
		'email': user.email,
		'role': role,
		'access': tokens['access'],
	}, tokens['refresh']


@csrf_exempt
def teacher_signup(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	data = _json_body(request)
	email = (data.get('email') or '').strip().lower()
	password = data.get('password') or ''
	first_name = (data.get('first_name') or '').strip()
	last_name = (data.get('last_name') or '').strip()

	if not email or not password:
		return JsonResponse({'detail': 'email and password are required'}, status=400)

	if User.objects.filter(email__iexact=email).exists():
		return JsonResponse({'detail': 'A user with this email already exists'}, status=400)

	with transaction.atomic():
		user = User.objects.create_user(
			username=email,
			email=email,
			password=password,
			first_name=first_name,
			last_name=last_name,
		)
		
		# Generate verification token
		raw_token = str(uuid.uuid4())
		token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
		
		UserProfile.objects.create(
			user=user, 
			role=UserProfile.ROLE_TEACHER,
			email_verified=False,
			email_verification_token=token_hash,
			email_verification_sent_at=timezone.now()
		)

	# Send email
	send_verification_email(user, raw_token, settings.FRONTEND_BASE_URL)

	return JsonResponse({
		'detail': 'Registration successful. Please check your email to verify your account.',
		'email_verified': False
	}, status=201)


@csrf_exempt
def register_from_invite(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	data = _json_body(request)
	token = (data.get('token') or '').strip()
	password = data.get('password') or ''
	first_name = (data.get('first_name') or '').strip()
	last_name = (data.get('last_name') or '').strip()

	if not token or not password:
		return JsonResponse({'detail': 'token and password are required'}, status=400)

	token_hash = ClassroomInvitation.hash_token(token)
	try:
		invite = ClassroomInvitation.objects.select_related('classroom').get(
			token_hash=token_hash,
			status=ClassroomInvitation.STATUS_PENDING,
		)
	except ClassroomInvitation.DoesNotExist:
		return JsonResponse({'detail': 'Invalid invitation token'}, status=400)

	if invite.is_expired():
		invite.status = ClassroomInvitation.STATUS_EXPIRED
		invite.save(update_fields=['status'])
		return JsonResponse({'detail': 'Invitation has expired'}, status=400)

	email = invite.email.lower()
	if User.objects.filter(email__iexact=email).exists():
		return JsonResponse({'detail': 'Account already exists. Please login.'}, status=400)

	with transaction.atomic():
		user = User.objects.create_user(
			username=email,
			email=email,
			password=password,
			first_name=first_name,
			last_name=last_name,
		)
		UserProfile.objects.create(user=user, role=UserProfile.ROLE_STUDENT)
		Enrollment.objects.get_or_create(classroom=invite.classroom, student=user)
		invite.mark_accepted()

	payload, refresh_token = _auth_payload(user)
	payload['class_id'] = invite.classroom.class_id
	response = JsonResponse(payload, status=201)
	set_refresh_cookie(response, refresh_token)
	return response


@csrf_exempt
def login_view(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	data = _json_body(request)
	email = (data.get('email') or '').strip().lower()
	password = data.get('password') or ''
	invite_token = (data.get('invite_token') or '').strip()

	user = authenticate(request, username=email, password=password)
	if user is None:
		return JsonResponse({'detail': 'Invalid credentials'}, status=400)

	# Check email verification for teachers
	profile = getattr(user, 'profile', None)
	if profile and profile.role == UserProfile.ROLE_TEACHER and not profile.email_verified:
		return JsonResponse({
			'detail': 'Email not verified. Please check your inbox.',
			'email_verified': False
		}, status=403)

	invite_result = _accept_invite_for_user(invite_token, user)
	payload, refresh_token = _auth_payload(user)
	payload['invite_result'] = invite_result

	response = JsonResponse(payload)
	set_refresh_cookie(response, refresh_token)
	return response


@csrf_exempt
def refresh_token(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	tokens = refresh_access_from_cookie(request)
	if tokens is None:
		return JsonResponse({'detail': 'Invalid or expired refresh token'}, status=401)

	response = JsonResponse({'access': tokens['access']})
	set_refresh_cookie(response, tokens['refresh'])
	return response


@csrf_exempt
def logout_view(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)
	response = JsonResponse({'detail': 'Logged out'})
	clear_refresh_cookie(response)
	return response


def me(request):
	user = get_user_from_request(request)
	if user is None:
		return JsonResponse({'authenticated': False})

	role = getattr(getattr(user, 'profile', None), 'role', None)
	return JsonResponse({
		'authenticated': True,
		'id': user.id,
		'email': user.email,
		'role': role,
	})

@csrf_exempt
def verify_email(request):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	token = request.GET.get('token')
	if not token:
		return JsonResponse({'detail': 'Token is required'}, status=400)

	token_hash = hashlib.sha256(token.encode()).hexdigest()
	
	try:
		profile = UserProfile.objects.get(email_verification_token=token_hash)
	except UserProfile.DoesNotExist:
		return JsonResponse({'detail': 'Invalid or expired verification link'}, status=400)

	# Check if token is expired (12 hours)
	if profile.email_verification_sent_at:
		expiry_time = profile.email_verification_sent_at + timedelta(hours=12)
		if timezone.now() > expiry_time:
			return JsonResponse({'detail': 'Verification link has expired'}, status=400)

	with transaction.atomic():
		profile.email_verified = True
		profile.email_verification_token = None
		profile.save(update_fields=['email_verified', 'email_verification_token'])

	return JsonResponse({'detail': 'Email verified successfully'})

@csrf_exempt
def resend_verification(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	data = _json_body(request)
	email = (data.get('email') or '').strip().lower()

	if not email:
		return JsonResponse({'detail': 'Email is required'}, status=400)

	try:
		user = User.objects.get(email__iexact=email)
		profile = user.profile
		
		if profile.email_verified:
			return JsonResponse({'detail': 'Email is already verified'}, status=400)
			
		if profile.role != UserProfile.ROLE_TEACHER:
			return JsonResponse({'detail': 'Only teachers need email verification'}, status=400)

		# Check cooldown (e.g., 1 minute)
		if profile.email_verification_sent_at:
			cooldown = profile.email_verification_sent_at + timedelta(minutes=1)
			if timezone.now() < cooldown:
				return JsonResponse({'detail': 'Please wait before requesting another email'}, status=429)

		raw_token = str(uuid.uuid4())
		token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

		with transaction.atomic():
			profile.email_verification_token = token_hash
			profile.email_verification_sent_at = timezone.now()
			profile.save(update_fields=['email_verification_token', 'email_verification_sent_at'])

		success, _ = send_verification_email(user, raw_token, settings.FRONTEND_BASE_URL)
		
		if success:
			return JsonResponse({'detail': 'Verification email sent'})
		else:
			return JsonResponse({'detail': 'Failed to send verification email. Please try again later.'}, status=500)
			
	except User.DoesNotExist:
		# Don't reveal if user exists or not
		return JsonResponse({'detail': 'If an account exists, a verification email has been sent.'})


@csrf_exempt
def forgot_password(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	data = _json_body(request)
	email = (data.get('email') or '').strip().lower()

	if not email:
		return JsonResponse({'detail': 'Email is required'}, status=400)

	try:
		user = User.objects.get(email__iexact=email)
		# Get or create UserProfile if it doesn't exist for some reason
		profile, created = UserProfile.objects.get_or_create(
			user=user,
			defaults={'role': UserProfile.ROLE_STUDENT}
		)

		# Check cooldown (1 minute)
		if profile.password_reset_sent_at:
			cooldown = profile.password_reset_sent_at + timedelta(minutes=1)
			if timezone.now() < cooldown:
				return JsonResponse({'detail': 'Please wait before requesting another reset email'}, status=429)

		raw_token = str(uuid.uuid4())
		token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

		with transaction.atomic():
			profile.password_reset_token = token_hash
			profile.password_reset_sent_at = timezone.now()
			profile.save(update_fields=['password_reset_token', 'password_reset_sent_at'])

		from authentication.email_service import send_password_reset_email
		success, _ = send_password_reset_email(user, raw_token, settings.FRONTEND_BASE_URL)
		if not success:
			return JsonResponse({'detail': 'Failed to send reset email. Please try again later.'}, status=500)

	except User.DoesNotExist:
		# Don't reveal if user exists or not
		pass

	return JsonResponse({'detail': 'If an account with that email exists, a password reset link has been sent.'})


@csrf_exempt
def reset_password(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	data = _json_body(request)
	token = (data.get('token') or '').strip()
	new_password = data.get('password') or ''

	if not token or not new_password:
		return JsonResponse({'detail': 'Token and new password are required'}, status=400)

	token_hash = hashlib.sha256(token.encode()).hexdigest()

	try:
		profile = UserProfile.objects.get(password_reset_token=token_hash)
	except UserProfile.DoesNotExist:
		return JsonResponse({'detail': 'Invalid or expired password reset link'}, status=400)

	# Check if token is expired (1 hour)
	if profile.password_reset_sent_at:
		expiry_time = profile.password_reset_sent_at + timedelta(hours=1)
		if timezone.now() > expiry_time:
			return JsonResponse({'detail': 'Password reset link has expired'}, status=400)

	with transaction.atomic():
		user = profile.user
		user.set_password(new_password)
		user.save()

		profile.password_reset_token = None
		profile.save(update_fields=['password_reset_token'])

	return JsonResponse({'detail': 'Password reset successful. You can now log in.'})

