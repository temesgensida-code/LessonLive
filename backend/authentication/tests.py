import hashlib
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from authentication.models import UserProfile


class PasswordResetTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username='testuser@example.com',
			email='testuser@example.com',
			password='oldpassword123'
		)
		self.profile = UserProfile.objects.create(
			user=self.user,
			role=UserProfile.ROLE_TEACHER,
			email_verified=True
		)

	@patch('authentication.email_service.send_password_reset_email')
	def test_forgot_password_success(self, mock_send_email):
		mock_send_email.return_value = (True, 'email_sent_id')

		response = self.client.post(
			'/api/auth/forgot-password/',
			data={'email': 'testuser@example.com'},
			content_type='application/json'
		)
		self.assertEqual(response.status_code, 200)
		self.assertIn('password reset link has been sent', response.json()['detail'])

		# Verify token created in DB
		self.profile.refresh_from_db()
		self.assertIsNotNone(self.profile.password_reset_token)
		self.assertIsNotNone(self.profile.password_reset_sent_at)
		mock_send_email.assert_called_once()

	@patch('authentication.email_service.send_password_reset_email')
	def test_forgot_password_case_insensitive(self, mock_send_email):
		mock_send_email.return_value = (True, 'email_sent_id')

		response = self.client.post(
			'/api/auth/forgot-password/',
			data={'email': 'TESTUSER@EXAMPLE.COM'},
			content_type='application/json'
		)
		self.assertEqual(response.status_code, 200)

		self.profile.refresh_from_db()
		self.assertIsNotNone(self.profile.password_reset_token)

	@patch('authentication.email_service.send_password_reset_email')
	def test_forgot_password_nonexistent_user(self, mock_send_email):
		response = self.client.post(
			'/api/auth/forgot-password/',
			data={'email': 'nonexistent@example.com'},
			content_type='application/json'
		)
		# Should return 200 and a generic message to prevent email enumeration
		self.assertEqual(response.status_code, 200)
		self.assertIn('password reset link has been sent', response.json()['detail'])
		mock_send_email.assert_not_called()

	@patch('authentication.email_service.send_password_reset_email')
	def test_forgot_password_cooldown(self, mock_send_email):
		mock_send_email.return_value = (True, 'email_sent_id')

		# First request
		response = self.client.post(
			'/api/auth/forgot-password/',
			data={'email': 'testuser@example.com'},
			content_type='application/json'
		)
		self.assertEqual(response.status_code, 200)

		# Immediate second request
		response2 = self.client.post(
			'/api/auth/forgot-password/',
			data={'email': 'testuser@example.com'},
			content_type='application/json'
		)
		self.assertEqual(response2.status_code, 429)
		self.assertIn('Please wait before requesting another reset email', response2.json()['detail'])

	def test_reset_password_success(self):
		raw_token = 'my-secret-reset-token'
		token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

		self.profile.password_reset_token = token_hash
		self.profile.password_reset_sent_at = timezone.now()
		self.profile.save()

		response = self.client.post(
			'/api/auth/reset-password/',
			data={'token': raw_token, 'password': 'newpassword123'},
			content_type='application/json'
		)
		self.assertEqual(response.status_code, 200)
		self.assertIn('Password reset successful', response.json()['detail'])

		# Verify password changed
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('newpassword123'))

		# Verify token is cleared
		self.profile.refresh_from_db()
		self.assertIsNone(self.profile.password_reset_token)

	def test_reset_password_invalid_token(self):
		response = self.client.post(
			'/api/auth/reset-password/',
			data={'token': 'invalid-token', 'password': 'newpassword123'},
			content_type='application/json'
		)
		self.assertEqual(response.status_code, 400)
		self.assertIn('Invalid or expired password reset link', response.json()['detail'])

	def test_reset_password_expired_token(self):
		raw_token = 'my-secret-reset-token'
		token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

		self.profile.password_reset_token = token_hash
		# Set sent time 2 hours ago (limit is 1 hour)
		self.profile.password_reset_sent_at = timezone.now() - timedelta(hours=2)
		self.profile.save()

		response = self.client.post(
			'/api/auth/reset-password/',
			data={'token': raw_token, 'password': 'newpassword123'},
			content_type='application/json'
		)
		self.assertEqual(response.status_code, 400)
		self.assertIn('Password reset link has expired', response.json()['detail'])
