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
	note_index = models.PositiveIntegerField()
	title = models.CharField(max_length=255)
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['id']
		unique_together = ('classroom', 'note_index')

	def save(self, *args, **kwargs):
		if not self.note_index:
			max_index = ClassroomNote.objects.filter(classroom=self.classroom).aggregate(
				models.Max('note_index'))['note_index__max']
			self.note_index = 1 if max_index is None else max_index + 1
		super().save(*args, **kwargs)

	def __str__(self):
		return f'Note #{self.note_index} - {self.title}'


class DisplayedClassroomNote(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='displayed_notes')
	note = models.ForeignKey(ClassroomNote, on_delete=models.CASCADE, related_name='display_instances')
	displayed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='displayed_classroom_notes')
	displayed_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['displayed_at', 'id']

	def __str__(self):
		return f'Displayed #{self.id} for {self.classroom.class_id} (note #{self.note_id})'


class ClassroomNotification(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='notifications')
	created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
	message = models.TextField()
	countdown_seconds = models.PositiveIntegerField(help_text='Countdown duration in seconds')
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f'Notification for {self.classroom.class_id}: {self.message[:50]}'


class ClassroomSession(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='sessions')
	title = models.CharField(max_length=255, default='Live Classroom Session')
	started_at = models.DateTimeField(auto_now_add=True)
	ended_at = models.DateTimeField(null=True, blank=True)
	is_active = models.BooleanField(default=True)
	created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_sessions', null=True, blank=True)

	class Meta:
		ordering = ['-started_at']

	def __str__(self):
		return f'Session: {self.title} ({self.classroom.class_id})'


class StudentAttendanceRecord(models.Model):
	STATUS_ACTIVE = 'active'
	STATUS_LEFT = 'left'
	STATUS_CHOICES = (
		(STATUS_ACTIVE, 'Active'),
		(STATUS_LEFT, 'Left'),
	)

	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='attendance_records')
	session = models.ForeignKey(ClassroomSession, on_delete=models.CASCADE, related_name='attendance_records', null=True, blank=True)
	student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
	joined_at = models.DateTimeField(default=timezone.now)
	left_at = models.DateTimeField(null=True, blank=True)
	duration_seconds = models.PositiveIntegerField(default=0)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
	joined_topic = models.CharField(max_length=255, default='Live Classroom')
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-joined_at']

	def update_duration(self, current_time=None):
		if current_time is None:
			current_time = timezone.now()
		if self.joined_at:
			delta = (current_time - self.joined_at).total_seconds()
			self.duration_seconds = max(0, int(delta))

	def __str__(self):
		return f'{self.student.username} - {self.classroom.class_id} ({self.status})'

