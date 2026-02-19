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
		UserProfile.objects.create(user=user, role=UserProfile.ROLE_TEACHER)

	payload, refresh_token = _auth_payload(user)
	response = JsonResponse(payload, status=201)
	set_refresh_cookie(response, refresh_token)
	return response


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
