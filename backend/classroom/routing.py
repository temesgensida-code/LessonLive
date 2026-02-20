from django.urls import re_path

from classroom.consumers import ClassroomNoteConsumer

websocket_urlpatterns = [
    re_path(r'^ws/classrooms/(?P<class_id>[^/]+)/notes/$', ClassroomNoteConsumer.as_asgi()),
]
