from django.conf import settings
from django.contrib.auth.models import User
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken


def issue_tokens_for_user(user):
	refresh = RefreshToken.for_user(user)
	return {
		'access': str(refresh.access_token),
		'refresh': str(refresh),
	}


def set_refresh_cookie(response, refresh_token):
	max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
	response.set_cookie(
		key=settings.JWT_REFRESH_COOKIE_NAME,
		value=refresh_token,
		max_age=max_age,
		httponly=True,
		secure=settings.JWT_REFRESH_COOKIE_SECURE,
		samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
		path=settings.JWT_REFRESH_COOKIE_PATH,
	)


def clear_refresh_cookie(response):
	response.delete_cookie(
		key=settings.JWT_REFRESH_COOKIE_NAME,
		path=settings.JWT_REFRESH_COOKIE_PATH,
		samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
	)


def refresh_access_from_cookie(request):
	refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
	if not refresh_token:
		return None

	try:
		refresh = RefreshToken(refresh_token)
	except TokenError:
		return None

	return {
		'access': str(refresh.access_token),
		'refresh': str(refresh),
	}


def get_user_from_request(request):
	authorization_header = request.headers.get('Authorization', '')
	if not authorization_header.startswith('Bearer '):
		return None

	token_string = authorization_header.split(' ', 1)[1].strip()
	if not token_string:
		return None

	try:
		token = AccessToken(token_string)
	except TokenError:
		return None

	user_id = token.get('user_id')
	if not user_id:
		return None

	try:
		return User.objects.get(id=user_id)
	except User.DoesNotExist:
		return None
