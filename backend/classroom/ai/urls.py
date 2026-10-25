from django.urls import path
from . import ai_views

urlpatterns = [
    path('validate-key/', ai_views.validate_ai_key, name='validate_ai_key'),
    path('quiz/generate/', ai_views.generate_ai_quiz, name='generate_ai_quiz'),
    path('summary/generate/', ai_views.generate_ai_summary, name='generate_ai_summary'),
]
