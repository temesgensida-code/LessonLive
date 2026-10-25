import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404

from authentication.jwt_auth import get_user_from_request
from authentication.models import UserProfile
from classroom.models import Classroom, ClassroomNote, ClassroomResource
from .providers import get_ai_provider, AIProviderError

def _extract_ai_headers(request):
    provider = request.headers.get('X-AI-Provider') or request.META.get('HTTP_X_AI_PROVIDER')
    api_key = request.headers.get('X-AI-Key') or request.META.get('HTTP_X_AI_KEY')
    model = request.headers.get('X-AI-Model') or request.META.get('HTTP_X_AI_MODEL') or ''
    return provider, api_key, model

def _json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return {}

@csrf_exempt
def validate_ai_key(request):
    """
    POST /api/ai/validate-key/
    Verifies that the provided API key and provider credentials are valid with a minimal test ping.
    Headers:
      X-AI-Provider: gemini | openai | grok
      X-AI-Key: <api_key>
      X-AI-Model: (optional)
    """
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    user = get_user_from_request(request)
    if user is None:
        return JsonResponse({'detail': 'Authentication required'}, status=401)

    provider_name, api_key, model = _extract_ai_headers(request)
    if not provider_name or not api_key:
        return JsonResponse({"detail": "Missing X-AI-Provider or X-AI-Key header."}, status=400)

    try:
        provider = get_ai_provider(provider_name, api_key)
        provider.validate_key(model=model)
        return JsonResponse({
            "valid": True,
            "provider": provider_name.lower(),
            "model": model or "default",
            "message": f"Successfully verified {provider_name} API key."
        })
    except AIProviderError as e:
        return JsonResponse({"detail": e.message}, status=e.status_code)
    except Exception as e:
        return JsonResponse({"detail": f"Validation failed: {str(e)}"}, status=502)


@csrf_exempt
def generate_ai_quiz(request):
    """
    POST /api/ai/quiz/generate/
    Generates structured quiz questions using client's BYOK provider.
    Headers:
      X-AI-Provider: gemini | openai | grok
      X-AI-Key: <api_key>
      X-AI-Model: (optional)
    Payload:
      class_id: string (required)
      prompt: string (optional)
      note_ids: list of int (optional)
      question_count: int (default 5, max 10)
      difficulty: easy | medium | hard (default medium)
    """
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    user = get_user_from_request(request)
    if user is None:
        return JsonResponse({'detail': 'Authentication required'}, status=401)

    provider_name, api_key, model = _extract_ai_headers(request)
    if not provider_name or not api_key:
        return JsonResponse({"detail": "Missing X-AI-Provider or X-AI-Key header."}, status=400)

    data = _json_body(request)
    class_id = data.get('class_id')
    if not class_id:
        return JsonResponse({"detail": "Missing class_id parameter."}, status=400)

    try:
        classroom = Classroom.objects.get(class_id=class_id)
    except Classroom.DoesNotExist:
        return JsonResponse({"detail": "Classroom not found"}, status=404)

    if classroom.owner != user:
        return JsonResponse({"detail": "Forbidden. Only classroom instructors may generate quizzes."}, status=403)

    prompt = data.get('prompt', '').strip()
    note_ids = data.get('note_ids', [])
    raw_count = data.get('question_count', 5)
    try:
        count = max(1, min(10, int(raw_count)))
    except (ValueError, TypeError):
        count = 5
    difficulty = str(data.get('difficulty', 'medium')).strip().lower()
    if difficulty not in ('easy', 'medium', 'hard'):
        difficulty = 'medium'

    notes_context = ""
    if isinstance(note_ids, list) and note_ids:
        notes = ClassroomNote.objects.filter(classroom=classroom, id__in=note_ids)
        notes_parts = [f"Note: {n.title}\n{n.content}" for n in notes]
        notes_context = "\n\n---\n\n".join(notes_parts)
    elif not prompt:
        notes = ClassroomNote.objects.filter(classroom=classroom)
        notes_parts = [f"Note: {n.title}\n{n.content}" for n in notes]
        notes_context = "\n\n---\n\n".join(notes_parts)

    if not prompt and not notes_context:
        prompt = f"General comprehensive review questions for {classroom.name}"

    try:
        provider = get_ai_provider(provider_name, api_key)
        questions = provider.generate_quiz(
            prompt=prompt,
            notes_context=notes_context,
            count=count,
            difficulty=difficulty,
            model=model,
        )
        return JsonResponse({
            "provider": provider_name.lower(),
            "model": model or "default",
            "questions": questions,
        })
    except AIProviderError as e:
        return JsonResponse({"detail": e.message}, status=e.status_code)
    except Exception as e:
        return JsonResponse({"detail": f"Generation failed: {str(e)}"}, status=502)


@csrf_exempt
def generate_ai_summary(request):
    """
    POST /api/ai/summary/generate/
    Generates a Markdown study guide and optionally saves it as a ClassroomResource.
    Headers:
      X-AI-Provider: gemini | openai | grok
      X-AI-Key: <api_key>
      X-AI-Model: (optional)
    Payload:
      class_id: string (required)
      title: string (optional)
      auto_save_resource: bool (optional, default false)
      note_ids: list of int (optional)
    """
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    user = get_user_from_request(request)
    if user is None:
        return JsonResponse({'detail': 'Authentication required'}, status=401)

    provider_name, api_key, model = _extract_ai_headers(request)
    if not provider_name or not api_key:
        return JsonResponse({"detail": "Missing X-AI-Provider or X-AI-Key header."}, status=400)

    data = _json_body(request)
    class_id = data.get('class_id')
    if not class_id:
        return JsonResponse({"detail": "Missing class_id parameter."}, status=400)

    try:
        classroom = Classroom.objects.get(class_id=class_id)
    except Classroom.DoesNotExist:
        return JsonResponse({"detail": "Classroom not found"}, status=404)

    if classroom.owner != user:
        return JsonResponse({"detail": "Forbidden. Only classroom instructors may generate study guides."}, status=403)

    title = data.get('title', '').strip()
    auto_save = bool(data.get('auto_save_resource', False))
    note_ids = data.get('note_ids', [])

    if isinstance(note_ids, list) and note_ids:
        notes = ClassroomNote.objects.filter(classroom=classroom, id__in=note_ids)
    else:
        notes = ClassroomNote.objects.filter(classroom=classroom)

    notes_parts = [f"### Note #{n.note_index}: {n.title}\n{n.content}" for n in notes]
    notes_context = "\n\n---\n\n".join(notes_parts)
    if not notes_context:
        notes_context = f"Lesson topic: {classroom.name}. Core lecture discussion and review."

    try:
        provider = get_ai_provider(provider_name, api_key)
        summary_markdown = provider.generate_study_guide(
            classroom_name=classroom.name,
            notes_context=notes_context,
            model=model,
        )

        resource_data = None
        if auto_save:
            clean_title = title or f"Study Guide - {timezone.now().strftime('%b %d, %Y')}"
            filename = f"study_guide_{classroom.class_id}_{int(timezone.now().timestamp())}.md"
            encoded_bytes = summary_markdown.encode('utf-8')
            res = ClassroomResource.objects.create(
                classroom=classroom,
                uploaded_by=user,
                title=clean_title,
                description=f"AI-generated study guide for {classroom.name}",
                resource_type=ClassroomResource.TYPE_DOCUMENT,
                file=ContentFile(encoded_bytes, name=filename),
                file_size_bytes=len(encoded_bytes),
            )
            resource_data = {
                "id": res.id,
                "title": res.title,
                "description": res.description,
                "resource_type": res.resource_type,
                "file_url": res.file.url if res.file else None,
                "uploaded_at": res.uploaded_at.isoformat(),
            }

        return JsonResponse({
            "provider": provider_name.lower(),
            "model": model or "default",
            "summary_markdown": summary_markdown,
            "resource": resource_data,
        })
    except AIProviderError as e:
        return JsonResponse({"detail": e.message}, status=e.status_code)
    except Exception as e:
        return JsonResponse({"detail": f"Study guide generation failed: {str(e)}"}, status=502)
