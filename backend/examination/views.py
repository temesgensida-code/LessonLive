import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from authentication.jwt_auth import get_user_from_request
from authentication.models import UserProfile
from classroom.models import Classroom, Enrollment
from examination.models import ClassroomQuestion, QuestionAnswer, ExamAttempt, ExamAnswer, ExamTimingSettings


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


def _require_class_member(request, class_id):
	user = get_user_from_request(request)
	if user is None:
		return None, None, False, JsonResponse({'detail': 'Authentication required'}, status=401)

	classroom = Classroom.objects.filter(class_id=class_id).first()
	if classroom is None:
		return None, None, False, JsonResponse({'detail': 'Classroom not found'}, status=404)

	is_owner = classroom.owner_id == user.id
	is_enrolled = Enrollment.objects.filter(classroom=classroom, student=user).exists()
	if not is_owner and not is_enrolled:
		return None, None, False, JsonResponse({'detail': 'Not allowed'}, status=403)

	return user, classroom, is_owner, None


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


def _serialize_answer(answer, include_correct=True):
	payload = {
		'id': answer.id,
		'text': answer.text,
		'position': answer.position,
	}
	if include_correct:
		payload['is_correct'] = answer.is_correct
	return payload


def _serialize_question(question, include_correct=True):
	return {
		'id': question.id,
		'class_id': question.classroom.class_id,
		'prompt': question.prompt,
		'created_at': question.created_at.isoformat(),
		'answers': [
			_serialize_answer(answer, include_correct=include_correct)
			for answer in question.answers.all().order_by('position', 'id')
		],
	}


def _serialize_exam_answer(answer):
	return {
		'id': answer.id,
		'question_id': answer.question_id,
		'question_prompt': answer.question.prompt,
		'selected_answer_id': answer.selected_answer_id,
		'selected_answer_text': answer.selected_answer.text,
		'is_correct': answer.is_correct,
		'answered_at': answer.answered_at.isoformat(),
	}


def _serialize_attempt(attempt):
	score_percent = 0
	if attempt.total_questions:
		score_percent = round((attempt.correct_count / attempt.total_questions) * 100, 2)

	return {
		'id': attempt.id,
		'class_id': attempt.classroom.class_id,
		'student_id': attempt.student_id,
		'total_questions': attempt.total_questions,
		'answered_count': attempt.answered_count,
		'correct_count': attempt.correct_count,
		'score_percent': score_percent,
		'created_at': attempt.created_at.isoformat(),
	}


def _serialize_timing_settings(settings):
	return {
		'mode': settings.mode,
		'per_question_seconds': settings.per_question_seconds,
		'total_seconds': settings.total_seconds,
		'updated_by_id': settings.updated_by_id,
		'updated_at': settings.updated_at.isoformat(),
	}


@csrf_exempt
def classroom_questions(request, class_id):
	if request.method == 'GET':
		user, classroom, is_owner, error_response = _require_class_member(request, class_id)
		if error_response:
			return error_response

		questions = (
			ClassroomQuestion.objects
			.filter(classroom=classroom)
			.prefetch_related('answers')
			.order_by('id')
		)
		return JsonResponse(
			{
				'questions': [
					_serialize_question(question, include_correct=is_owner)
					for question in questions
					]
			}
		)

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


@csrf_exempt
def submit_exam_attempt(request, class_id):
	if request.method != 'POST':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, _, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	role = getattr(getattr(user, 'profile', None), 'role', None)
	if role != UserProfile.ROLE_STUDENT:
		return JsonResponse({'detail': 'Student role required'}, status=403)

	data = _json_body(request)
	answers_payload = data.get('answers')
	if not isinstance(answers_payload, list):
		return JsonResponse({'detail': 'answers must be a list'}, status=400)
	if not answers_payload:
		return JsonResponse({'detail': 'answers cannot be empty'}, status=400)

	entries = []
	question_ids = []
	answer_ids = []
	seen_questions = set()

	for index, entry in enumerate(answers_payload, start=1):
		if not isinstance(entry, dict):
			return JsonResponse({'detail': f'Answer {index} must be an object'}, status=400)

		question_id = entry.get('question_id')
		answer_id = entry.get('answer_id', entry.get('selected_answer_id'))

		try:
			question_id = int(question_id)
		except (TypeError, ValueError):
			return JsonResponse({'detail': f'Answer {index} question_id must be an integer'}, status=400)

		try:
			answer_id = int(answer_id)
		except (TypeError, ValueError):
			return JsonResponse({'detail': f'Answer {index} answer_id must be an integer'}, status=400)

		if question_id in seen_questions:
			return JsonResponse({'detail': f'Duplicate question_id {question_id} in answers'}, status=400)

		seen_questions.add(question_id)
		question_ids.append(question_id)
		answer_ids.append(answer_id)
		entries.append({'question_id': question_id, 'answer_id': answer_id})

	questions = ClassroomQuestion.objects.filter(classroom=classroom, id__in=question_ids)
	question_map = {question.id: question for question in questions}
	if len(question_map) != len(question_ids):
		missing = sorted(set(question_ids) - set(question_map.keys()))
		return JsonResponse({'detail': 'Question not found', 'missing_question_ids': missing}, status=404)

	answers = QuestionAnswer.objects.filter(id__in=answer_ids)
	answer_map = {answer.id: answer for answer in answers}
	if len(answer_map) != len(answer_ids):
		missing = sorted(set(answer_ids) - set(answer_map.keys()))
		return JsonResponse({'detail': 'Answer not found', 'missing_answer_ids': missing}, status=404)

	response_rows = []
	correct_count = 0
	for entry in entries:
		question = question_map[entry['question_id']]
		selected_answer = answer_map[entry['answer_id']]
		if selected_answer.question_id != question.id:
			return JsonResponse(
				{
					'detail': 'Answer does not belong to question',
					'question_id': question.id,
					'answer_id': selected_answer.id,
				},
				status=400,
			)

		is_correct = selected_answer.is_correct
		if is_correct:
			correct_count += 1
		response_rows.append(
			{
				'question': question,
				'selected_answer': selected_answer,
				'is_correct': is_correct,
			}
		)

	total_questions = ClassroomQuestion.objects.filter(classroom=classroom).count()
	if total_questions == 0:
		return JsonResponse({'detail': 'No questions available for this classroom'}, status=400)
	answered_count = len(response_rows)

	with transaction.atomic():
		attempt = ExamAttempt.objects.create(
			classroom=classroom,
			student=user,
			total_questions=total_questions,
			answered_count=answered_count,
			correct_count=correct_count,
		)

		ExamAnswer.objects.bulk_create(
			[
				ExamAnswer(
					attempt=attempt,
					question=row['question'],
					selected_answer=row['selected_answer'],
					is_correct=row['is_correct'],
				)
				for row in response_rows
			]
		)

	answer_payload = (
		ExamAnswer.objects
		.filter(attempt=attempt)
		.select_related('question', 'selected_answer')
		.order_by('answered_at', 'id')
	)

	return JsonResponse(
		{
			'attempt': _serialize_attempt(attempt),
			'answers': [_serialize_exam_answer(answer) for answer in answer_payload],
		},
		status=201,
	)


def exam_attempt_detail(request, class_id, attempt_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	user, classroom, is_owner, error_response = _require_class_member(request, class_id)
	if error_response:
		return error_response

	attempt = (
		ExamAttempt.objects
		.filter(id=attempt_id, classroom=classroom)
		.select_related('student', 'classroom')
		.first()
	)
	if attempt is None:
		return JsonResponse({'detail': 'Attempt not found'}, status=404)

	if not is_owner and attempt.student_id != user.id:
		return JsonResponse({'detail': 'Not allowed'}, status=403)

	answer_payload = (
		ExamAnswer.objects
		.filter(attempt=attempt)
		.select_related('question', 'selected_answer')
		.order_by('answered_at', 'id')
	)

	return JsonResponse(
		{
			'attempt': _serialize_attempt(attempt),
			'answers': [_serialize_exam_answer(answer) for answer in answer_payload],
		}
	)


@csrf_exempt
def classroom_timing_settings(request, class_id):
	if request.method == 'GET':
		_, classroom, _, error_response = _require_class_member(request, class_id)
		if error_response:
			return error_response

		settings = ExamTimingSettings.objects.filter(classroom=classroom).first()
		if settings is None:
			return JsonResponse({'settings': None})

		return JsonResponse({'settings': _serialize_timing_settings(settings)})

	if request.method not in {'POST', 'PUT', 'PATCH'}:
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	teacher, teacher_error = _require_teacher(request)
	if teacher_error:
		return teacher_error

	classroom = Classroom.objects.filter(class_id=class_id).first()
	if classroom is None:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)
	if classroom.owner_id != teacher.id:
		return JsonResponse({'detail': 'Only the teacher can set timing'}, status=403)

	data = _json_body(request)
	mode = (data.get('mode') or '').strip()
	if mode not in {ExamTimingSettings.MODE_PER_QUESTION, ExamTimingSettings.MODE_TOTAL}:
		return JsonResponse(
			{
				'detail': 'mode must be per_question or total',
				'allowed': [ExamTimingSettings.MODE_PER_QUESTION, ExamTimingSettings.MODE_TOTAL],
			},
			status=400,
		)

	per_question_seconds = data.get('per_question_seconds')
	total_seconds = data.get('total_seconds')

	if mode == ExamTimingSettings.MODE_PER_QUESTION:
		try:
			per_question_seconds = int(per_question_seconds)
		except (TypeError, ValueError):
			return JsonResponse({'detail': 'per_question_seconds must be an integer'}, status=400)
		if per_question_seconds <= 0:
			return JsonResponse({'detail': 'per_question_seconds must be greater than 0'}, status=400)
		total_seconds = None

	if mode == ExamTimingSettings.MODE_TOTAL:
		try:
			total_seconds = int(total_seconds)
		except (TypeError, ValueError):
			return JsonResponse({'detail': 'total_seconds must be an integer'}, status=400)
		if total_seconds <= 0:
			return JsonResponse({'detail': 'total_seconds must be greater than 0'}, status=400)
		per_question_seconds = None

	settings, created = ExamTimingSettings.objects.update_or_create(
		classroom=classroom,
		defaults={
			'mode': mode,
			'per_question_seconds': per_question_seconds,
			'total_seconds': total_seconds,
			'updated_by': teacher,
		},
	)

	return JsonResponse(
		{'settings': _serialize_timing_settings(settings)},
		status=201 if created else 200,
	)


def classroom_participants_count(request, class_id):
	if request.method != 'GET':
		return JsonResponse({'detail': 'Method not allowed'}, status=405)

	# teacher, teacher_error = _require_teacher(request)
	# if teacher_error:
	# 	return teacher_error

	classroom = Classroom.objects.filter(class_id=class_id).first()
	if classroom is None:
		return JsonResponse({'detail': 'Classroom not found'}, status=404)
	# if classroom.owner_id != teacher.id:
	# 	return JsonResponse({'detail': 'Only the teacher can view participants'}, status=403)

	participants_count = (
		ExamAttempt.objects
		.filter(classroom=classroom)
		.values_list('student_id', flat=True)
		.distinct()
		.count()
	)

	return JsonResponse({'class_id': class_id, 'participants_count': participants_count})


#------------------------------------------------------
#endponts added(count participants who attempted exam in a classroom) to support dashboard analytics in frontend
#endpoint for teacher to provide exam timing settings (per question or total) and duration, which will be used by frontend to enforce timing during exam attempts
#endpont for teacher to provide question answers with flexible format (either as list of strings or list of objects with text and is_correct), and also support correct answer index for convenience
#endpoint for students to view their own exam attempts and details, and teachers to view all attempts in their classroom with details, but students cannot view other students' attempts
#-------------------------------------------------------------------