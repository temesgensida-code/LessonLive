import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from authentication.models import UserProfile
from classroom.models import ClassroomInvitation, Enrollment


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
		UserProfile.objects.create(user=user, role=UserProfile.ROLE_TEACHER)

	login(request, user)
	return JsonResponse({
		'id': user.id,
		'email': user.email,
		'role': UserProfile.ROLE_TEACHER,
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

	login(request, user)
	return JsonResponse({
		'id': user.id,
		'email': user.email,
		'role': UserProfile.ROLE_STUDENT,
		'class_id': invite.classroom.class_id,
	}, status=201)


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

	login(request, user)
	invite_result = _accept_invite_for_user(invite_token, user)
	role = getattr(getattr(user, 'profile', None), 'role', None)

	return JsonResponse({
		'id': user.id,
		'email': user.email,
		'role': role,
		'invite_result': invite_result,
	})


@csrf_exempt
def logout_view(request):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)
	logout(request)
	return JsonResponse({'detail': 'Logged out'})


def me(request):
	if not request.user.is_authenticated:
		return JsonResponse({'authenticated': False})
	role = getattr(getattr(request.user, 'profile', None), 'role', None)
	return JsonResponse({
		'authenticated': True,
		'id': request.user.id,
		'email': request.user.email,
		'role': role,
	})
