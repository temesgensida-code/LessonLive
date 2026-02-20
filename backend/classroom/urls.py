from django.urls import path

from classroom import views

urlpatterns = [
    path('', views.list_my_classrooms, name='list-my-classrooms'),
    path('enrolled/', views.list_enrolled_classrooms, name='list-enrolled-classrooms'),
    path('create/', views.create_classroom, name='create-classroom'),
    path('<str:class_id>/', views.classroom_detail, name='classroom-detail'),
    path('<str:class_id>/invite/', views.invite_students, name='invite-students'),
    path('<str:class_id>/notes/', views.classroom_notes, name='classroom-notes'),
    path('<str:class_id>/displayed-notes/', views.displayed_notes, name='displayed-notes'),
    path('<str:class_id>/notes/<int:note_id>/display/', views.display_note, name='display-note'),
    path('<str:class_id>/displayed-notes/<int:displayed_note_id>/', views.remove_displayed_note, name='remove-displayed-note'),
    path('invitations/<str:token>/', views.invitation_status, name='invitation-status'),
]
