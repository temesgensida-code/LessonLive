from django.urls import path, include

from classroom import views

urlpatterns = [
    path('', views.list_my_classrooms, name='list-my-classrooms'),
    path('enrolled/', views.list_enrolled_classrooms, name='list-enrolled-classrooms'),
    path('create/', views.create_classroom, name='create-classroom'),
    path('<str:class_id>/', views.classroom_detail, name='classroom-detail'),
    path('<str:class_id>/invite/', views.invite_students, name='invite-students'),
    path('<str:class_id>/notes/', views.classroom_notes, name='classroom-notes'),
    path('<str:class_id>/notes/<int:note_id>/', views.delete_classroom_note, name='delete-classroom-note'),
    path('<str:class_id>/displayed-notes/', views.displayed_notes, name='displayed-notes'),
    path('<str:class_id>/notes/<int:note_id>/display/', views.display_note, name='display-note'),
    path('<str:class_id>/displayed-notes/<int:displayed_note_id>/', views.remove_displayed_note, name='remove-displayed-note'),
    path('invitations/<str:token>/', views.invitation_status, name='invitation-status'),
    path('<str:class_id>/token/', views.get_livekit_token, name='get-livekit-token'),
    path('<str:class_id>/notifications/', views.send_notification, name='send-notification'),
    path('<str:class_id>/notifications/list/', views.list_notifications, name='list-notifications'),
    path('<str:class_id>/attendance/', views.classroom_attendance_insights, name='classroom-attendance-insights'),
    path('<str:class_id>/attendance/export/', views.export_attendance_csv, name='export-attendance-csv'),
    path('<str:class_id>/resources/', views.classroom_resources, name='classroom-resources'),
    path('<str:class_id>/resources/<int:resource_id>/', views.delete_classroom_resource, name='delete-classroom-resource'),
    path('<str:class_id>/assignments/', views.classroom_assignments, name='classroom-assignments'),
    path('<str:class_id>/assignments/<int:assignment_id>/', views.assignment_detail, name='assignment-detail'),
    path('<str:class_id>/assignments/<int:assignment_id>/submit/', views.submit_assignment, name='submit-assignment'),
    path('<str:class_id>/assignments/<int:assignment_id>/submissions/', views.assignment_submissions, name='assignment-submissions'),
    path('<str:class_id>/assignments/<int:assignment_id>/submissions/<int:submission_id>/grade/', views.grade_submission, name='grade-submission'),
    path('<str:class_id>/gradebook/', views.gradebook_insights, name='gradebook-insights'),
    path('<str:class_id>/gradebook/export/', views.export_gradebook_csv, name='export-gradebook-csv'),
    path('<str:class_id>/schedule/', views.classroom_schedule, name='classroom-schedule'),
    path('<str:class_id>/schedule/<int:schedule_id>/', views.delete_classroom_schedule, name='delete-classroom-schedule'),
    path('<str:class_id>/schedule/ics/', views.download_classroom_ics, name='download-classroom-ics'),
    path('ai/', include('classroom.ai.urls')),
]

