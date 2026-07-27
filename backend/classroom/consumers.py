from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from classroom.models import Classroom, Enrollment, ClassroomSession, StudentAttendanceRecord


@database_sync_to_async
def record_student_join(class_id, user_id, joined_topic='Live Classroom'):
	try:
		classroom = Classroom.objects.get(class_id=class_id)
		if classroom.owner_id == user_id:
			return None  # Teacher connection

		session = ClassroomSession.objects.filter(classroom=classroom, is_active=True).first()
		if not session:
			today_str = timezone.now().strftime('%B %d, %Y')
			session = ClassroomSession.objects.create(
				classroom=classroom,
				title=f'Live Session — {today_str}',
				is_active=True
			)

		rec = StudentAttendanceRecord.objects.create(
			classroom=classroom,
			session=session,
			student_id=user_id,
			joined_at=timezone.now(),
			status=StudentAttendanceRecord.STATUS_ACTIVE,
			joined_topic=joined_topic
		)
		return rec.id
	except Exception:
		return None


@database_sync_to_async
def record_student_leave(record_id):
	if not record_id:
		return
	try:
		rec = StudentAttendanceRecord.objects.get(id=record_id)
		rec.left_at = timezone.now()
		rec.update_duration(rec.left_at)
		rec.status = StudentAttendanceRecord.STATUS_LEFT
		rec.save()
	except StudentAttendanceRecord.DoesNotExist:
		pass


@database_sync_to_async
def update_student_heartbeat(record_id, topic=None):
	if not record_id:
		return
	try:
		rec = StudentAttendanceRecord.objects.get(id=record_id)
		now = timezone.now()
		rec.update_duration(now)
		if topic:
			rec.joined_topic = topic
		rec.save()
	except StudentAttendanceRecord.DoesNotExist:
		pass


class ClassroomNoteConsumer(AsyncJsonWebsocketConsumer):
	async def connect(self):
		self.class_id = self.scope['url_route']['kwargs']['class_id']
		self.group_name = f'classroom_{self.class_id}_notes'
		self.attendance_record_id = None

		query_string = self.scope.get('query_string', b'').decode('utf-8')
		access_token = parse_qs(query_string).get('token', [''])[0]
		if not access_token:
			await self.close(code=4001)
			return

		user = await self._get_user_from_access_token(access_token)
		if user is None:
			await self.close(code=4001)
			return

		allowed = await self._user_has_classroom_access(user.id)
		if not allowed:
			await self.close(code=4003)
			return

		self.user = user
		await self.channel_layer.group_add(self.group_name, self.channel_name)
		await self.accept()

		# Record attendance join for students
		self.attendance_record_id = await record_student_join(self.class_id, self.user.id)

	async def disconnect(self, close_code):
		if self.attendance_record_id:
			await record_student_leave(self.attendance_record_id)
		await self.channel_layer.group_discard(self.group_name, self.channel_name)

	async def receive_json(self, content, **kwargs):
		msg_type = content.get('type')
		if msg_type == 'heartbeat' or msg_type == 'ping':
			topic = content.get('topic')
			if self.attendance_record_id:
				await update_student_heartbeat(self.attendance_record_id, topic=topic)
		return

	async def note_event(self, event):
		await self.send_json(
			{
				'type': event['event_type'],
				'payload': event['payload'],
			}
		)

	@staticmethod
	async def _get_user_from_access_token(raw_token):
		try:
			token = AccessToken(raw_token)
		except TokenError:
			return None

		user_id = token.get('user_id')
		if not user_id:
			return None

		try:
			return await User.objects.aget(id=user_id)
		except User.DoesNotExist:
			return None

	async def _user_has_classroom_access(self, user_id):
		try:
			classroom = await Classroom.objects.aget(class_id=self.class_id)
		except Classroom.DoesNotExist:
			return False

		if classroom.owner_id == user_id:
			return True

		return await Enrollment.objects.filter(classroom=classroom, student_id=user_id).aexists()


		