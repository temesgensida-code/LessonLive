from django.contrib.auth.models import User
from django.test import TestCase

from authentication.jwt_auth import issue_tokens_for_user
from authentication.models import UserProfile
from classroom.models import Classroom, Enrollment


class ClassroomNotesIsolationTests(TestCase):
	def setUp(self):
		self.teacher = User.objects.create_user(username='teacher1', email='teacher1@example.com', password='pass12345')
		UserProfile.objects.create(user=self.teacher, role=UserProfile.ROLE_TEACHER)

		self.student = User.objects.create_user(username='student1', email='student1@example.com', password='pass12345')
		UserProfile.objects.create(user=self.student, role=UserProfile.ROLE_STUDENT)

		self.classroom_x = Classroom.objects.create(owner=self.teacher, name='Classroom X')
		self.classroom_y = Classroom.objects.create(owner=self.teacher, name='Classroom Y')

		tokens = issue_tokens_for_user(self.teacher)
		self.teacher_access_token = tokens['access']

		student_tokens = issue_tokens_for_user(self.student)
		self.student_access_token = student_tokens['access']

		Enrollment.objects.create(classroom=self.classroom_x, student=self.student)

	def _auth_header(self, token):
		return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

	def test_teacher_notes_are_isolated_per_classroom(self):
		response_x = self.client.post(
			f'/api/classrooms/{self.classroom_x.class_id}/notes/',
			data={'title': 'Note X', 'content': 'Only for classroom X'},
			content_type='application/json',
			**self._auth_header(self.teacher_access_token),
		)
		self.assertEqual(response_x.status_code, 201)

		response_y = self.client.post(
			f'/api/classrooms/{self.classroom_y.class_id}/notes/',
			data={'title': 'Note Y', 'content': 'Only for classroom Y'},
			content_type='application/json',
			**self._auth_header(self.teacher_access_token),
		)
		self.assertEqual(response_y.status_code, 201)

		get_x = self.client.get(
			f'/api/classrooms/{self.classroom_x.class_id}/notes/',
			**self._auth_header(self.teacher_access_token),
		)
		self.assertEqual(get_x.status_code, 200)
		notes_x = get_x.json().get('notes', [])
		self.assertEqual(len(notes_x), 1)
		self.assertEqual(notes_x[0]['title'], 'Note X')

		get_y = self.client.get(
			f'/api/classrooms/{self.classroom_y.class_id}/notes/',
			**self._auth_header(self.teacher_access_token),
		)
		self.assertEqual(get_y.status_code, 200)
		notes_y = get_y.json().get('notes', [])
		self.assertEqual(len(notes_y), 1)
		self.assertEqual(notes_y[0]['title'], 'Note Y')

	def test_student_cannot_access_other_classroom_notes(self):
		self.client.post(
			f'/api/classrooms/{self.classroom_y.class_id}/notes/',
			data={'title': 'Teacher Note', 'content': 'Private to classroom Y'},
			content_type='application/json',
			**self._auth_header(self.teacher_access_token),
		)

		response = self.client.get(
			f'/api/classrooms/{self.classroom_y.class_id}/notes/',
			**self._auth_header(self.student_access_token),
		)
		self.assertEqual(response.status_code, 403)
