from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import hashlib
import secrets


def generate_class_id():
	return secrets.token_urlsafe(8)


class Classroom(models.Model):
	owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_classrooms')
	name = models.CharField(max_length=255)
	class_id = models.CharField(max_length=40, unique=True, default=generate_class_id)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'{self.name} ({self.class_id})'


class Enrollment(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='enrollments')
	student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='class_enrollments')
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('classroom', 'student')


class ClassroomInvitation(models.Model):
	STATUS_PENDING = 'pending'
	STATUS_ACCEPTED = 'accepted'
	STATUS_EXPIRED = 'expired'
	STATUS_CHOICES = (
		(STATUS_PENDING, 'Pending'),
		(STATUS_ACCEPTED, 'Accepted'),
		(STATUS_EXPIRED, 'Expired'),
	)

	ROLE_STUDENT = 'student'

	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='invitations')
	invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
	email = models.EmailField()
	role = models.CharField(max_length=20, default=ROLE_STUDENT)
	token_hash = models.CharField(max_length=64, unique=True)
	expires_at = models.DateTimeField()
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
	created_at = models.DateTimeField(auto_now_add=True)
	used_at = models.DateTimeField(null=True, blank=True)

	@staticmethod
	def issue_token():
		token = secrets.token_urlsafe(32)
		return token, hashlib.sha256(token.encode('utf-8')).hexdigest()

	@staticmethod
	def hash_token(raw_token):
		return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

	def is_expired(self):
		return timezone.now() > self.expires_at

	def mark_accepted(self):
		self.status = self.STATUS_ACCEPTED
		self.used_at = timezone.now()
		self.save(update_fields=['status', 'used_at'])

	def __str__(self):
		return f'{self.email} -> {self.classroom.class_id} ({self.status})'


class ClassroomNote(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='notes')
	title = models.CharField(max_length=255)
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['id']

	def __str__(self):
		return f'Note #{self.id} - {self.title}'


class DisplayedClassroomNote(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='displayed_notes')
	note = models.ForeignKey(ClassroomNote, on_delete=models.CASCADE, related_name='display_instances')
	displayed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='displayed_classroom_notes')
	displayed_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['displayed_at', 'id']

	def __str__(self):
		return f'Displayed #{self.id} for {self.classroom.class_id} (note #{self.note_id})'
