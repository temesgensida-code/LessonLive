from django.db import models
from django.contrib.auth.models import User

from classroom.models import Classroom


class ClassroomQuestion(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='questions')
	created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_questions')
	prompt = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at', '-id']

	def __str__(self):
		return f"Question #{self.id} ({self.classroom.class_id})"


class QuestionAnswer(models.Model):
	question = models.ForeignKey(ClassroomQuestion, on_delete=models.CASCADE, related_name='answers')
	text = models.CharField(max_length=500)
	is_correct = models.BooleanField(default=False)
	position = models.PositiveIntegerField()

	class Meta:
		ordering = ['position', 'id']
		unique_together = ('question', 'position')

	def __str__(self):
		return f"Answer #{self.position} for Question #{self.question_id}"


class ExamAttempt(models.Model):
	classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='exam_attempts')
	student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_attempts')
	total_questions = models.PositiveIntegerField(default=0)
	answered_count = models.PositiveIntegerField(default=0)
	correct_count = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at', '-id']

	def __str__(self):
		return f"ExamAttempt #{self.id} ({self.classroom.class_id})"


class ExamAnswer(models.Model):
	attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
	question = models.ForeignKey(ClassroomQuestion, on_delete=models.CASCADE, related_name='exam_answers')
	selected_answer = models.ForeignKey(QuestionAnswer, on_delete=models.CASCADE, related_name='exam_answers')
	is_correct = models.BooleanField(default=False)
	answered_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['answered_at', 'id']
		unique_together = ('attempt', 'question')

	def __str__(self):
		return f"ExamAnswer #{self.id} for Attempt #{self.attempt_id}"


class ExamTimingSettings(models.Model):
	MODE_PER_QUESTION = 'per_question'
	MODE_TOTAL = 'total'
	MODE_CHOICES = (
		(MODE_PER_QUESTION, 'Per question'),
		(MODE_TOTAL, 'Total'),
	)

	classroom = models.OneToOneField(Classroom, on_delete=models.CASCADE, related_name='exam_timing')
	mode = models.CharField(max_length=20, choices=MODE_CHOICES)
	per_question_seconds = models.PositiveIntegerField(null=True, blank=True)
	total_seconds = models.PositiveIntegerField(null=True, blank=True)
	updated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_timing_updates')
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"ExamTimingSettings ({self.classroom.class_id})"
