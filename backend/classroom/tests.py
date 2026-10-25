from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings

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


class LivekitTokenConfigurationTests(TestCase):
	def setUp(self):
		self.teacher = User.objects.create_user(username='teacher2', email='teacher2@example.com', password='pass12345')
		UserProfile.objects.create(user=self.teacher, role=UserProfile.ROLE_TEACHER)

		self.classroom = Classroom.objects.create(owner=self.teacher, name='Live Classroom')

		tokens = issue_tokens_for_user(self.teacher)
		self.teacher_access_token = tokens['access']

	def _auth_header(self, token):
		return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

	@override_settings(DEBUG=True)
	def test_missing_livekit_credentials_return_disabled_payload_in_debug(self):
		with patch.dict('os.environ', {'LIVEKIT_API_KEY': '', 'LIVEKIT_API_SECRET': ''}, clear=False):
			response = self.client.get(
				f'/api/classrooms/{self.classroom.class_id}/token/',
				**self._auth_header(self.teacher_access_token),
			)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertFalse(payload.get('livekit_enabled'))
		self.assertEqual(payload.get('token'), '')
		self.assertCountEqual(payload.get('missing', []), ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'])

	@override_settings(DEBUG=False)
	def test_missing_livekit_credentials_return_503_in_production(self):
		with patch.dict('os.environ', {'LIVEKIT_API_KEY': '', 'LIVEKIT_API_SECRET': ''}, clear=False):
			response = self.client.get(
				f'/api/classrooms/{self.classroom.class_id}/token/',
				**self._auth_header(self.teacher_access_token),
			)

		self.assertEqual(response.status_code, 503)


class ClassroomResourceTests(TestCase):
	def setUp(self):
		self.teacher = User.objects.create_user(username='teacher_res', email='teacher_res@example.com', password='pass12345')
		UserProfile.objects.create(user=self.teacher, role=UserProfile.ROLE_TEACHER)

		self.student = User.objects.create_user(username='student_res', email='student_res@example.com', password='pass12345')
		UserProfile.objects.create(user=self.student, role=UserProfile.ROLE_STUDENT)

		self.classroom = Classroom.objects.create(owner=self.teacher, name='Resource Classroom')
		Enrollment.objects.create(classroom=self.classroom, student=self.student)

		self.teacher_token = issue_tokens_for_user(self.teacher)['access']
		self.student_token = issue_tokens_for_user(self.student)['access']

	def _auth(self, token):
		return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

	def test_teacher_can_create_link_resource(self):
		response = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/resources/',
			data={'title': 'React Docs', 'description': 'Official Documentation', 'resource_type': 'link', 'link_url': 'https://react.dev'},
			content_type='application/json',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(response.status_code, 201)
		data = response.json()
		self.assertEqual(data['title'], 'React Docs')
		self.assertEqual(data['resource_type'], 'link')
		self.assertEqual(data['link_url'], 'https://react.dev')

	def test_teacher_can_upload_file_resource(self):
		from django.core.files.uploadedfile import SimpleUploadedFile
		file = SimpleUploadedFile("syllabus.pdf", b"%PDF-1.4 dummy pdf content", content_type="application/pdf")
		response = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/resources/',
			data={'title': 'Class Syllabus', 'resource_type': 'pdf', 'file': file},
			**self._auth(self.teacher_token)
		)
		self.assertEqual(response.status_code, 201)
		data = response.json()
		self.assertEqual(data['title'], 'Class Syllabus')
		self.assertEqual(data['resource_type'], 'pdf')
		self.assertIsNotNone(data['file_url'])

	def test_student_can_view_resources_but_cannot_upload(self):
		# Create a resource first
		from classroom.models import ClassroomResource
		ClassroomResource.objects.create(
			classroom=self.classroom,
			uploaded_by=self.teacher,
			title='Lecture 1 Slides',
			resource_type='slide',
			link_url='https://slides.example.com'
		)

		# Student GET
		response = self.client.get(
			f'/api/classrooms/{self.classroom.class_id}/resources/',
			**self._auth(self.student_token)
		)
		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.json()['resources']), 1)

		# Student POST fails (403)
		post_resp = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/resources/',
			data={'title': 'Student upload', 'resource_type': 'link', 'link_url': 'https://bad.com'},
			content_type='application/json',
			**self._auth(self.student_token)
		)
		self.assertEqual(post_resp.status_code, 403)

	def test_teacher_can_delete_resource(self):
		from classroom.models import ClassroomResource
		res = ClassroomResource.objects.create(
			classroom=self.classroom,
			uploaded_by=self.teacher,
			title='Temp Resource',
			resource_type='link',
			link_url='https://temp.com'
		)
		del_resp = self.client.delete(
			f'/api/classrooms/{self.classroom.class_id}/resources/{res.id}/',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(del_resp.status_code, 200)
		self.assertFalse(ClassroomResource.objects.filter(id=res.id).exists())


class AssignmentAndGradebookTests(TestCase):
	def setUp(self):
		from django.utils import timezone
		from datetime import timedelta

		self.teacher = User.objects.create_user(username='teacher_asg', email='teacher_asg@example.com', password='pass')
		UserProfile.objects.create(user=self.teacher, role=UserProfile.ROLE_TEACHER)
		self.teacher_token = issue_tokens_for_user(self.teacher)['access']

		self.student1 = User.objects.create_user(username='student_asg1', email='student_asg1@example.com', password='pass')
		UserProfile.objects.create(user=self.student1, role=UserProfile.ROLE_STUDENT)
		self.student1_token = issue_tokens_for_user(self.student1)['access']

		self.student2 = User.objects.create_user(username='student_asg2', email='student_asg2@example.com', password='pass')
		UserProfile.objects.create(user=self.student2, role=UserProfile.ROLE_STUDENT)
		self.student2_token = issue_tokens_for_user(self.student2)['access']

		self.classroom = Classroom.objects.create(owner=self.teacher, name='Biology 101')
		Enrollment.objects.create(classroom=self.classroom, student=self.student1)
		Enrollment.objects.create(classroom=self.classroom, student=self.student2)

	def _auth(self, token):
		return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

	def test_tc_asg_01_create_assignment(self):
		from django.utils import timezone
		from datetime import timedelta
		due = (timezone.now() + timedelta(days=3)).isoformat()
		response = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/assignments/',
			data={'title': 'Cell Lab', 'instructions': 'Write 2 pages on mitochondria', 'due_date': due, 'max_points': 100},
			content_type='application/json',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(response.status_code, 201)
		data = response.json()
		self.assertEqual(data['title'], 'Cell Lab')
		self.assertEqual(data['max_points'], 100)
		self.assertFalse(data['is_past_due'])

	def test_tc_asg_02_03_04_student_submissions(self):
		from django.utils import timezone
		from datetime import timedelta
		from classroom.models import Assignment, AssignmentSubmission

		# Future assignment
		future_due = timezone.now() + timedelta(days=2)
		asg1 = Assignment.objects.create(
			classroom=self.classroom, created_by=self.teacher, title='Future HW', due_date=future_due, max_points=100
		)
		# Past assignment
		past_due = timezone.now() - timedelta(days=2)
		asg2 = Assignment.objects.create(
			classroom=self.classroom, created_by=self.teacher, title='Past HW', due_date=past_due, max_points=100
		)

		# TC-ASG-02: On-time submission
		resp1 = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/assignments/{asg1.id}/submit/',
			data={'text_response': 'My on time homework response.'},
			content_type='application/json',
			**self._auth(self.student1_token)
		)
		self.assertEqual(resp1.status_code, 201)
		self.assertEqual(resp1.json()['status'], 'submitted')
		self.assertFalse(resp1.json()['is_late'])

		# TC-ASG-04: Duplicate submission updates existing
		resp1_dup = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/assignments/{asg1.id}/submit/',
			data={'text_response': 'Updated homework text.'},
			content_type='application/json',
			**self._auth(self.student1_token)
		)
		self.assertEqual(resp1_dup.status_code, 200)
		self.assertEqual(AssignmentSubmission.objects.filter(assignment=asg1, student=self.student1).count(), 1)
		self.assertEqual(AssignmentSubmission.objects.get(assignment=asg1, student=self.student1).text_response, 'Updated homework text.')

		# TC-ASG-03: Late submission
		resp2 = self.client.post(
			f'/api/classrooms/{self.classroom.class_id}/assignments/{asg2.id}/submit/',
			data={'text_response': 'Sorry for being late!'},
			content_type='application/json',
			**self._auth(self.student2_token)
		)
		self.assertEqual(resp2.status_code, 201)
		self.assertEqual(resp2.json()['status'], 'late')
		self.assertTrue(resp2.json()['is_late'])

	def test_tc_asg_05_06_grading_and_validation(self):
		from django.utils import timezone
		from datetime import timedelta
		from classroom.models import Assignment, AssignmentSubmission

		asg = Assignment.objects.create(
			classroom=self.classroom, created_by=self.teacher, title='Quiz 1', due_date=timezone.now() + timedelta(days=1), max_points=100
		)
		sub = AssignmentSubmission.objects.create(
			assignment=asg, student=self.student1, text_response='Here is my paper'
		)

		# TC-ASG-06: Out of range validation (e.g. 150 > 100 or negative)
		bad_resp = self.client.patch(
			f'/api/classrooms/{self.classroom.class_id}/assignments/{asg.id}/submissions/{sub.id}/grade/',
			data={'score': 150, 'feedback': 'Too high!'},
			content_type='application/json',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(bad_resp.status_code, 400)

		# TC-ASG-05: Valid grade & feedback
		good_resp = self.client.patch(
			f'/api/classrooms/{self.classroom.class_id}/assignments/{asg.id}/submissions/{sub.id}/grade/',
			data={'score': 95, 'feedback': 'Outstanding effort!'},
			content_type='application/json',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(good_resp.status_code, 200)
		data = good_resp.json()
		self.assertEqual(data['score'], 95.0)
		self.assertEqual(data['status'], 'graded')
		self.assertEqual(data['feedback'], 'Outstanding effort!')

	def test_tc_gb_01_to_04_gradebook_and_csv_export(self):
		from django.utils import timezone
		from datetime import timedelta
		from classroom.models import Assignment, AssignmentSubmission, ClassroomSession, StudentAttendanceRecord
		from examination.models import ExamAttempt

		# Setup session & attendance
		session = ClassroomSession.objects.create(classroom=self.classroom, title='Lecture 1')
		# Student 1 attended session
		StudentAttendanceRecord.objects.create(
			classroom=self.classroom, session=session, student=self.student1, status='active'
		)
		# Student 2 did not attend (attendance rate = 0%)

		# Setup assignment
		asg = Assignment.objects.create(
			classroom=self.classroom, created_by=self.teacher, title='Essay 1', due_date=timezone.now() + timedelta(days=1), max_points=100
		)
		# Student 1 scored 90
		AssignmentSubmission.objects.create(
			assignment=asg, student=self.student1, score=90, status='graded'
		)
		# Student 2 scored 40
		AssignmentSubmission.objects.create(
			assignment=asg, student=self.student2, score=40, status='graded'
		)

		# TC-GB-01, TC-GB-02, TC-GB-03: Gradebook Insights API
		resp = self.client.get(
			f'/api/classrooms/{self.classroom.class_id}/gradebook/',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		summary = data['summary']
		self.assertEqual(summary['total_students'], 2)
		self.assertEqual(summary['at_risk_students_count'], 1)  # student 2 is at risk

		students = data['students']
		s1 = next(s for s in students if s['student_id'] == self.student1.id)
		s2 = next(s for s in students if s['student_id'] == self.student2.id)

		# Student 1 has 100% attendance, grade A, not at risk
		self.assertEqual(s1['attendance_rate'], 100.0)
		self.assertFalse(s1['is_at_risk'])
		self.assertEqual(s1['letter_grade'], 'A')

		# Student 2 has 0% attendance, at risk
		self.assertEqual(s2['attendance_rate'], 0.0)
		self.assertTrue(s2['is_at_risk'])
		self.assertIn('Attendance below 60%', s2['risk_reasons'])

		# TC-GB-04: CSV Export
		csv_resp = self.client.get(
			f'/api/classrooms/{self.classroom.class_id}/gradebook/export/',
			**self._auth(self.teacher_token)
		)
		self.assertEqual(csv_resp.status_code, 200)
		self.assertEqual(csv_resp['Content-Type'], 'text/csv')
		content = csv_resp.content.decode('utf-8')
		self.assertIn('Student ID,Student Name,Email', content)
		self.assertIn('student_asg1@example.com', content)
		self.assertIn('student_asg2@example.com', content)


class ClassroomScheduleAndCalendarTests(TestCase):
	def setUp(self):
		import zoneinfo
		from datetime import time

		self.teacher = User.objects.create_user(username='sched_teacher', email='sched_teacher@example.com', password='pass')
		UserProfile.objects.create(user=self.teacher, role=UserProfile.ROLE_TEACHER)
		self.teacher_token = issue_tokens_for_user(self.teacher)['access']

		self.student = User.objects.create_user(username='sched_student', email='sched_student@example.com', password='pass')
		UserProfile.objects.create(user=self.student, role=UserProfile.ROLE_STUDENT)
		self.student_token = issue_tokens_for_user(self.student)['access']

		self.classroom = Classroom.objects.create(owner=self.teacher, name='Calculus I')
		Enrollment.objects.create(classroom=self.classroom, student=self.student)

	def _auth(self, token):
		return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

	def test_tc_sched_01_to_04_next_occurrence_and_timezones(self):
		import zoneinfo
		from datetime import datetime, time
		from classroom.models import ClassroomSchedule
		from classroom.schedule_utils import get_next_occurrence

		# TC-SCHED-01: Same week calculation (Ref: Tuesday Oct 27 2026, Target: Thursday 10:00 AM)
		sched_thurs = ClassroomSchedule.objects.create(
			classroom=self.classroom,
			created_by=self.teacher,
			title='Thursday Math',
			day_of_week=ClassroomSchedule.DAY_THURSDAY,  # 3
			start_time=time(10, 0),
			end_time=time(11, 30),
			timezone_name='UTC',
		)
		ref_tuesday = datetime(2026, 10, 27, 9, 0, tzinfo=zoneinfo.ZoneInfo('UTC'))
		next_thurs = get_next_occurrence(sched_thurs, reference_now=ref_tuesday)
		self.assertEqual(next_thurs.weekday(), 3)
		self.assertEqual(next_thurs.day, 29)
		self.assertEqual(next_thurs.hour, 10)

		# TC-SCHED-02: Next occurrence rollover (Ref: Friday Oct 30, Target: Monday)
		sched_mon = ClassroomSchedule.objects.create(
			classroom=self.classroom,
			created_by=self.teacher,
			title='Monday Math',
			day_of_week=ClassroomSchedule.DAY_MONDAY,  # 0
			start_time=time(9, 0),
			end_time=time(10, 30),
			timezone_name='UTC',
		)
		ref_friday = datetime(2026, 10, 30, 16, 0, tzinfo=zoneinfo.ZoneInfo('UTC'))
		next_mon = get_next_occurrence(sched_mon, reference_now=ref_friday)
		self.assertEqual(next_mon.weekday(), 0)
		self.assertEqual(next_mon.day, 2)  # Nov 2nd
		self.assertEqual(next_mon.month, 11)

		# TC-SCHED-03: Same day future vs past (Ref: Monday Oct 26 08:00 vs 11:00, Sched: Monday 10:00)
		sched_today = ClassroomSchedule.objects.create(
			classroom=self.classroom,
			created_by=self.teacher,
			title='Today Lecture',
			day_of_week=ClassroomSchedule.DAY_MONDAY,
			start_time=time(10, 0),
			end_time=time(11, 0),
			timezone_name='UTC',
		)
		ref_before = datetime(2026, 10, 26, 8, 0, tzinfo=zoneinfo.ZoneInfo('UTC'))
		next_today = get_next_occurrence(sched_today, reference_now=ref_before)
		self.assertEqual(next_today.day, 26)  # Today

		ref_after = datetime(2026, 10, 26, 11, 30, tzinfo=zoneinfo.ZoneInfo('UTC'))
		next_next_week = get_next_occurrence(sched_today, reference_now=ref_after)
		self.assertEqual(next_next_week.day, 2)  # Next Monday

		# TC-SCHED-04: Timezone shift America/New_York (UTC-4)
		sched_ny = ClassroomSchedule.objects.create(
			classroom=self.classroom,
			created_by=self.teacher,
			title='NY Lecture',
			day_of_week=ClassroomSchedule.DAY_WEDNESDAY,
			start_time=time(10, 0),
			end_time=time(11, 30),
			timezone_name='America/New_York',
		)
		ref_ny = datetime(2026, 10, 27, 12, 0, tzinfo=zoneinfo.ZoneInfo('UTC'))
		next_ny = get_next_occurrence(sched_ny, reference_now=ref_ny)
		# 10:00 AM NY EDT = 14:00 UTC
		next_ny_utc = next_ny.astimezone(zoneinfo.ZoneInfo('UTC'))
		self.assertEqual(next_ny_utc.hour, 14)

	def test_tc_ics_01_to_03_ics_calendar_export(self):
		from datetime import time
		from classroom.models import ClassroomSchedule

		ClassroomSchedule.objects.create(
			classroom=self.classroom,
			created_by=self.teacher,
			title='Weekly Calculus',
			day_of_week=ClassroomSchedule.DAY_MONDAY,
			start_time=time(10, 0),
			end_time=time(11, 30),
			timezone_name='UTC',
		)

		resp = self.client.get(
			f'/api/classrooms/{self.classroom.class_id}/schedule/ics/',
			**self._auth(self.student_token)
		)
		# TC-ICS-01: Header and status
		self.assertEqual(resp.status_code, 200)
		self.assertIn('text/calendar', resp['Content-Type'])
		content = resp.content.decode('utf-8')

		# TC-ICS-02: RRULE syntax
		self.assertIn('RRULE:FREQ=WEEKLY;BYDAY=MO', content)
		self.assertIn('BEGIN:VCALENDAR', content)
		self.assertIn('END:VCALENDAR', content)

		# TC-ICS-03: VALARM reminder trigger
		self.assertIn('BEGIN:VALARM', content)
		self.assertIn('TRIGGER:-PT30M', content)

	def test_tc_rem_01_to_03_automated_reminder_command(self):
		import zoneinfo
		from datetime import datetime, time, timedelta
		from django.core.management import call_command
		from classroom.models import ClassroomSchedule, ScheduleReminderLog, ClassroomNotification

		# Schedule for Wednesday 10:00 UTC
		sched = ClassroomSchedule.objects.create(
			classroom=self.classroom,
			created_by=self.teacher,
			title='Adv Calculus',
			day_of_week=ClassroomSchedule.DAY_WEDNESDAY,
			start_time=time(10, 0),
			end_time=time(11, 30),
			timezone_name='UTC',
		)

		# TC-REM-03: Outside window (2 hours before: Wednesday 08:00 UTC)
		call_command('send_class_reminders', reference_time='2026-10-28T08:00:00Z')
		self.assertEqual(ScheduleReminderLog.objects.count(), 0)
		self.assertEqual(ClassroomNotification.objects.count(), 0)

		# TC-REM-01: 30-Minute Detection (Wednesday 09:30 UTC = exactly 30 mins before 10:00)
		with patch('authentication.email_service.resend.Emails.send') as mock_email:
			mock_email.return_value = {'id': 'test-email-id'}
			call_command('send_class_reminders', reference_time='2026-10-28T09:30:00Z')

			self.assertEqual(ScheduleReminderLog.objects.count(), 1)
			self.assertEqual(ClassroomNotification.objects.count(), 1)
			self.assertIn('Adv Calculus', ClassroomNotification.objects.first().message)

		# TC-REM-02: Idempotency Guard (run again immediately with same simulated time)
		call_command('send_class_reminders', reference_time='2026-10-28T09:30:00Z')
		# Still only 1 log and 1 notification
		self.assertEqual(ScheduleReminderLog.objects.count(), 1)
		self.assertEqual(ClassroomNotification.objects.count(), 1)


class AIGatewayAndProviderTests(TestCase):
	def setUp(self):
		self.teacher = User.objects.create_user(username='aiteacher', email='aiteacher@example.com', password='pass12345')
		UserProfile.objects.create(user=self.teacher, role=UserProfile.ROLE_TEACHER)

		self.student = User.objects.create_user(username='aistudent', email='aistudent@example.com', password='pass12345')
		UserProfile.objects.create(user=self.student, role=UserProfile.ROLE_STUDENT)

		self.classroom = Classroom.objects.create(owner=self.teacher, name='Advanced Biology')
		Enrollment.objects.create(classroom=self.classroom, student=self.student)

		self.teacher_token = issue_tokens_for_user(self.teacher)['access']
		self.student_token = issue_tokens_for_user(self.student)['access']

	def _auth_headers(self, token, provider=None, key=None, model=None):
		headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}
		if provider:
			headers['HTTP_X_AI_PROVIDER'] = provider
		if key:
			headers['HTTP_X_AI_KEY'] = key
		if model:
			headers['HTTP_X_AI_MODEL'] = model
		return headers

	@patch('requests.post')
	def test_tc_ai_01_openai_adapter_valid_generation(self, mock_post):
		import json
		from unittest.mock import MagicMock
		mock_resp = MagicMock()
		mock_resp.status_code = 200
		mock_resp.json.return_value = {
			"choices": [{
				"message": {
					"content": json.dumps({
						"questions": [{
							"text": "What is DNA?",
							"options": ["Polymer of nucleotides", "Lipid bilayer", "Simple sugar", "Globular protein"],
							"correct": 0,
							"contextNote": "Contains adenine, guanine, cytosine, thymine"
						}]
					})
				}
			}]
		}
		mock_post.return_value = mock_resp

		headers = self._auth_headers(self.teacher_token, provider='openai', key='sk-test-key-123')
		res = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'DNA structure'}),
			content_type='application/json',
			**headers
		)

		self.assertEqual(res.status_code, 200)
		data = res.json()
		self.assertEqual(data['provider'], 'openai')
		self.assertEqual(len(data['questions']), 1)
		q = data['questions'][0]
		self.assertEqual(q['text'], 'What is DNA?')
		self.assertEqual(len(q['options']), 4)
		self.assertEqual(q['correct'], 0)

	@patch('requests.post')
	def test_tc_ai_02_gemini_adapter_valid_generation(self, mock_post):
		import json
		from unittest.mock import MagicMock
		mock_resp = MagicMock()
		mock_resp.status_code = 200
		mock_resp.json.return_value = {
			"candidates": [{
				"content": {
					"parts": [{
						"text": json.dumps({
							"questions": [{
								"text": "What is mitosis?",
								"options": ["Cell division", "Cell fusion", "Protein synthesis", "Apoptosis"],
								"correct": 0,
								"contextNote": "Asexual somatic reproduction"
							}]
						})
					}]
				}
			}]
		}
		mock_post.return_value = mock_resp

		headers = self._auth_headers(self.teacher_token, provider='gemini', key='AIzaSyDummyKey')
		res = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'Cell division'}),
			content_type='application/json',
			**headers
		)

		self.assertEqual(res.status_code, 200)
		data = res.json()
		self.assertEqual(data['provider'], 'gemini')
		self.assertEqual(len(data['questions']), 1)
		self.assertEqual(data['questions'][0]['options'][0], 'Cell division')
		self.assertIsInstance(data['questions'][0]['correct'], int)

	@patch('requests.post')
	def test_tc_ai_03_grok_adapter_integration(self, mock_post):
		import json
		from unittest.mock import MagicMock
		mock_resp = MagicMock()
		mock_resp.status_code = 200
		mock_resp.json.return_value = {
			"choices": [{
				"message": {
					"content": json.dumps({
						"questions": [{
							"text": "Which organelle produces ATP?",
							"options": ["Mitochondria", "Ribosome", "Nucleus", "Vacuole"],
							"correct": 0,
							"contextNote": "Powerhouse of the cell"
						}]
					})
				}
			}]
		}
		mock_post.return_value = mock_resp

		headers = self._auth_headers(self.teacher_token, provider='grok', key='xai-test-key')
		res = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'Cell organelles'}),
			content_type='application/json',
			**headers
		)

		self.assertEqual(res.status_code, 200)
		data = res.json()
		self.assertEqual(data['provider'], 'grok')
		self.assertEqual(data['questions'][0]['text'], 'Which organelle produces ATP?')

	@patch('requests.post')
	def test_tc_ai_04_invalid_key_handling(self, mock_post):
		import requests
		from unittest.mock import MagicMock
		mock_err_resp = MagicMock()
		mock_err_resp.status_code = 401
		http_error = requests.exceptions.HTTPError(response=mock_err_resp)
		mock_post.side_effect = http_error

		headers = self._auth_headers(self.teacher_token, provider='gemini', key='bad-key-123')
		res = self.client.post('/api/ai/validate-key/', **headers)

		self.assertEqual(res.status_code, 400)
		self.assertIn("Invalid API Key for Gemini", res.json()['detail'])

	@patch('requests.post')
	def test_tc_ai_05_quota_exceeded_rate_limit(self, mock_post):
		import requests
		from unittest.mock import MagicMock
		import json
		mock_err_resp = MagicMock()
		mock_err_resp.status_code = 429
		http_error = requests.exceptions.HTTPError(response=mock_err_resp)
		mock_post.side_effect = http_error

		headers = self._auth_headers(self.teacher_token, provider='openai', key='sk-quota-exceeded')
		res = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'Genetics'}),
			content_type='application/json',
			**headers
		)

		self.assertEqual(res.status_code, 429)
		self.assertIn("Rate limit or quota exceeded", res.json()['detail'])

	@patch('requests.post')
	def test_tc_ai_sec_01_no_key_storage_and_sec_02_sec_03(self, mock_post):
		import json
		from unittest.mock import MagicMock
		from classroom.models import ClassroomResource

		secret_key = "sk-super-secret-never-store-in-db-999"
		mock_resp = MagicMock()
		mock_resp.status_code = 200
		mock_resp.json.return_value = {
			"choices": [{
				"message": {
					"content": json.dumps({"questions": []})
				}
			}]
		}
		mock_post.return_value = mock_resp

		headers = self._auth_headers(self.teacher_token, provider='openai', key=secret_key)
		res = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'Bio'}),
			content_type='application/json',
			**headers
		)
		self.assertEqual(res.status_code, 200)

		# TC-AI-SEC-01: Ensure secret_key never written to any database table
		self.assertFalse(User.objects.filter(username__contains=secret_key).exists())
		self.assertFalse(Classroom.objects.filter(name__contains=secret_key).exists())
		self.assertFalse(ClassroomResource.objects.filter(title__contains=secret_key).exists())

		# TC-AI-SEC-02: Student access rejection
		student_headers = self._auth_headers(self.student_token, provider='openai', key='any-key')
		res_student = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'Bio'}),
			content_type='application/json',
			**student_headers
		)
		self.assertEqual(res_student.status_code, 403)

		# TC-AI-SEC-03: Missing header validation
		res_missing = self.client.post(
			'/api/ai/quiz/generate/',
			data=json.dumps({'class_id': self.classroom.class_id, 'prompt': 'Bio'}),
			content_type='application/json',
			HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}'
		)
		self.assertEqual(res_missing.status_code, 400)
		self.assertIn("Missing X-AI-Provider or X-AI-Key", res_missing.json()['detail'])

	@patch('requests.post')
	def test_tc_ai_sg_01_study_guide_resource_creation(self, mock_post):
		import json
		from unittest.mock import MagicMock
		from classroom.models import ClassroomResource

		markdown_study_guide = (
			"# Executive Summary\nPhotosynthesis converts light energy into chemical energy.\n\n"
			"## Key Concepts & Takeaways\n1. Chlorophyll absorbs light photons.\n\n"
			"## Vocabulary Glossary\n| Term | Definition | Context/Example |\n|---|---|---|\n| Stroma | Fluid surrounding grana | Dark reactions |\n\n"
			"## Self-Assessment Review Questions\n1. What is the role of RuBisCO?\n"
		)

		mock_resp = MagicMock()
		mock_resp.status_code = 200
		mock_resp.json.return_value = {
			"choices": [{
				"message": {
					"content": markdown_study_guide
				}
			}]
		}
		mock_post.return_value = mock_resp

		headers = self._auth_headers(self.teacher_token, provider='openai', key='sk-test-key-123')
		res = self.client.post(
			'/api/ai/summary/generate/',
			data=json.dumps({
				'class_id': self.classroom.class_id,
				'title': 'Photosynthesis Complete Study Guide',
				'auto_save_resource': True,
			}),
			content_type='application/json',
			**headers
		)

		self.assertEqual(res.status_code, 200)
		data = res.json()
		self.assertIn("Executive Summary", data['summary_markdown'])
		self.assertIsNotNone(data['resource'])
		self.assertEqual(data['resource']['title'], 'Photosynthesis Complete Study Guide')

		# Verify ClassroomResource created
		resource = ClassroomResource.objects.filter(classroom=self.classroom, title='Photosynthesis Complete Study Guide').first()
		self.assertIsNotNone(resource)
		self.assertEqual(resource.uploaded_by, self.teacher)
		self.assertEqual(resource.resource_type, 'document')
		# Read content from file
		content = resource.file.read().decode('utf-8')
		self.assertIn("RuBisCO", content)


