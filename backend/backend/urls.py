"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.shortcuts import redirect
from django.conf import settings

def redirect_verify_email(request):
    token = request.GET.get('token', '')
    return redirect(f"{settings.FRONTEND_BASE_URL}/verify-email?token={token}")

def redirect_invite(request, token):
    return redirect(f"{settings.FRONTEND_BASE_URL}/invite/{token}")

def redirect_reset_password(request):
    token = request.GET.get('token', '')
    return redirect(f"{settings.FRONTEND_BASE_URL}/reset-password?token={token}")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/classrooms/', include('classroom.urls')),
    path('api/examinations/', include('examination.urls')),
    path('api/ai/', include('classroom.ai.urls')),
    
    # Frontend Redirection Fallbacks
    path('verify-email/', redirect_verify_email),
    path('verify-email', redirect_verify_email),
    path('invite/<str:token>/', redirect_invite),
    path('invite/<str:token>', redirect_invite),
    path('reset-password/', redirect_reset_password),
    path('reset-password', redirect_reset_password),
]

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
