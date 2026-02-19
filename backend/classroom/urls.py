from django.urls import path

from classroom import views

urlpatterns = [
    path('', views.list_my_classrooms, name='list-my-classrooms'),
    path('create/', views.create_classroom, name='create-classroom'),
    path('<str:class_id>/', views.classroom_detail, name='classroom-detail'),
    path('<str:class_id>/invite/', views.invite_students, name='invite-students'),
    path('invitations/<str:token>/', views.invitation_status, name='invitation-status'),
]
