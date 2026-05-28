from django.urls import path

from examination import views

urlpatterns = [
	path('classrooms/<str:class_id>/questions/', views.classroom_questions, name='classroom-questions'),
	path('classrooms/<str:class_id>/attempts/', views.submit_exam_attempt, name='submit-exam-attempt'),
	path('classrooms/<str:class_id>/attempts/<int:attempt_id>/', views.exam_attempt_detail, name='exam-attempt-detail'),
	path('classrooms/<str:class_id>/timing/', views.classroom_timing_settings, name='classroom-timing-settings'),
]
