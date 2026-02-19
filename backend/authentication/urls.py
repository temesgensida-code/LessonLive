from django.urls import path

from authentication import views

urlpatterns = [
    path('teacher-signup/', views.teacher_signup, name='teacher-signup'),
    path('register-from-invite/', views.register_from_invite, name='register-from-invite'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me, name='me'),
]
