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
