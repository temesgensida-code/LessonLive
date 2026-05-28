from django.urls import path

from examination import views

urlpatterns = [
	path('classrooms/<str:class_id>/questions/', views.create_classroom_question, name='create-classroom-question'),
]
