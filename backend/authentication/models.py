from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
	ROLE_TEACHER = 'teacher'
	ROLE_STUDENT = 'student'
	ROLE_CHOICES = (
		(ROLE_TEACHER, 'Teacher'),
		(ROLE_STUDENT, 'Student'),
	)

	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
	role = models.CharField(max_length=20, choices=ROLE_CHOICES)

	def __str__(self):
		return f'{self.user.email} ({self.role})'
