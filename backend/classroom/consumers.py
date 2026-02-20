from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import User
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from classroom.models import Classroom, Enrollment


class ClassroomNoteConsumer(AsyncJsonWebsocketConsumer):
	async def connect(self):
		self.class_id = self.scope['url_route']['kwargs']['class_id']
		self.group_name = f'classroom_{self.class_id}_notes'

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

		await self.channel_layer.group_add(self.group_name, self.channel_name)
		await self.accept()

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(self.group_name, self.channel_name)

	async def receive_json(self, content, **kwargs):
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
