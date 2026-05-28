import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from authentication.jwt_auth import get_user_from_request
from authentication.models import UserProfile
from classroom.models import Classroom
from examination.models import ClassroomQuestion, QuestionAnswer


def _json_body(request):
	if not request.body:
		return {}
	return json.loads(request.body)


def _require_teacher(request):
	user = get_user_from_request(request)
	if user is None:
		return None, JsonResponse({'detail': 'Authentication required'}, status=401)

	role = getattr(getattr(user, 'profile', None), 'role', None)
	if role != UserProfile.ROLE_TEACHER:
		return None, JsonResponse({'detail': 'Teacher role required'}, status=403)

	return user, None


def _normalize_answers(raw_answers):
	if not isinstance(raw_answers, list):
		return None, JsonResponse({'detail': 'answers must be a list'}, status=400)

	if len(raw_answers) < 2 or len(raw_answers) > 7:
		return None, JsonResponse({'detail': 'answers must contain between 2 and 7 items'}, status=400)

	normalized = []
	for index, entry in enumerate(raw_answers, start=1):
		if isinstance(entry, dict):
			text = (entry.get('text') or '').strip()
			is_correct = bool(entry.get('is_correct')) if 'is_correct' in entry else False
		else:
			text = '' if entry is None else str(entry).strip()
			is_correct = False

		if not text:
			return None, JsonResponse({'detail': f'Answer {index} text is required'}, status=400)
		normalized.append({'text': text, 'is_correct': is_correct})

	return normalized, None


def _serialize_answer(answer):
	return {
		'id': answer.id,
		'text': answer.text,
		'is_correct': answer.is_correct,
		'position': answer.position,
	}


def _serialize_question(question):
	return {
		'id': question.id,
		'class_id': question.classroom.class_id,
		'prompt': question.prompt,
		'created_at': question.created_at.isoformat(),
		'answers': [_serialize_answer(answer) for answer in question.answers.all().order_by('position', 'id')],
	}


@csrf_exempt
def create_classroom_question(request, class_id):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	teacher, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	classroom = Classroom.objects.filter(class_id=class_id).first()
	if classroom is None:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)
	if classroom.owner_id != teacher.id:
		return JsonResponse({'detail': 'Only the teacher can create questions'}, status=403)

	data = _json_body(request)
	prompt = (data.get('prompt') or '').strip()
	if not prompt:
		return JsonResponse({'detail': 'prompt is required'}, status=400)

	answers, answers_error = _normalize_answers(data.get('answers'))
	if answers_error:
		return answers_error

	correct_index = data.get('correct_index')
	if correct_index is not None:
		try:
			correct_index = int(correct_index)
		except (TypeError, ValueError):
			return JsonResponse({'detail': 'correct_index must be an integer'}, status=400)
		if correct_index < 0 or correct_index >= len(answers):
			return JsonResponse({'detail': 'correct_index is out of range'}, status=400)
		for idx, answer in enumerate(answers):
			answer['is_correct'] = idx == correct_index

	with transaction.atomic():
		question = ClassroomQuestion.objects.create(
			classroom=classroom,
			created_by=teacher,
			prompt=prompt,
		)
		answer_rows = [
			QuestionAnswer(
				question=question,
				text=answer['text'],
				is_correct=answer['is_correct'],
				position=position,
			)
			for position, answer in enumerate(answers, start=1)
		]
		QuestionAnswer.objects.bulk_create(answer_rows)

	return JsonResponse({'question': _serialize_question(question)}, status=201)
