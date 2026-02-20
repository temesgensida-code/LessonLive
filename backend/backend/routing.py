from channels.routing import URLRouter

from classroom.routing import websocket_urlpatterns

websocket_application = URLRouter(websocket_urlpatterns)
