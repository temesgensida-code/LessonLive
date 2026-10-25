import json
import re
import requests
from typing import Dict, Any, List
from .base_provider import BaseAIProvider, AIProviderError

def _normalize_questions(raw_questions: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_questions, list):
        if isinstance(raw_questions, dict) and "questions" in raw_questions:
            raw_questions = raw_questions["questions"]
        else:
            return []

    normalized = []
    for idx, q in enumerate(raw_questions):
        if not isinstance(q, dict):
            continue
        text = str(q.get("text") or q.get("question") or f"Question {idx + 1}").strip()
        options = q.get("options") or q.get("choices") or []
        if not isinstance(options, list):
            options = ["Option A", "Option B", "Option C", "Option D"]
        else:
            options = [str(opt).strip() for opt in options if opt is not None]

        # Ensure exactly 4 options
        while len(options) < 4:
            options.append(f"Option {chr(65 + len(options))}")
        if len(options) > 4:
            options = options[:4]

        correct = q.get("correct")
        if correct is None:
            correct = q.get("correct_answer") or q.get("answer") or 0
        try:
            correct_idx = int(correct)
            if not 0 <= correct_idx < 4:
                correct_idx = 0
        except (ValueError, TypeError):
            # If string like 'A', 'B', 'C', 'D'
            if isinstance(correct, str) and correct.strip().upper() in ['A', 'B', 'C', 'D']:
                correct_idx = ord(correct.strip().upper()) - 65
            else:
                correct_idx = 0

        context_note = str(q.get("contextNote") or q.get("explanation") or "").strip()

        normalized.append({
            "text": text,
            "options": options,
            "correct": correct_idx,
            "contextNote": context_note,
        })
    return normalized

def _handle_http_error(err: requests.exceptions.HTTPError, provider_name: str):
    status = err.response.status_code if err.response is not None else 500
    if status in (401, 403):
        raise AIProviderError(
            f"Invalid API Key for {provider_name}. Please verify your credentials in Settings.",
            status_code=400,
        )
    elif status == 429:
        raise AIProviderError(
            f"Rate limit or quota exceeded for {provider_name}. Please check your account usage and billing.",
            status_code=429,
        )
    else:
        detail = ""
        try:
            detail = err.response.text[:200]
        except Exception:
            pass
        raise AIProviderError(
            f"{provider_name} request failed (HTTP {status}): {detail or str(err)}",
            status_code=502,
        )


class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key.strip()
        self.base_url = "https://api.openai.com/v1"

    def validate_key(self, model: str = "") -> bool:
        try:
            res = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": model or "gpt-4o-mini",
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
                timeout=10,
            )
            res.raise_for_status()
            return True
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "OpenAI")
        except Exception as e:
            raise AIProviderError(f"OpenAI connection error: {str(e)}", status_code=502)

    def generate_quiz(self, prompt: str, notes_context: str = "", count: int = 5, difficulty: str = "medium", model: str = "") -> List[Dict[str, Any]]:
        target_model = model or "gpt-4o-mini"
        system_prompt = (
            f"You are an expert educator. Generate {count} multiple-choice questions at {difficulty} difficulty.\n"
            "Output MUST be valid JSON with this exact schema:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "text": "Question prompt text",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct": 0,\n'
            '      "contextNote": "Brief explanation or hint"\n'
            '    }\n'
            '  ]\n'
            "}"
        )
        user_content = f"Topic/Prompt: {prompt}\n\nLesson Notes Context:\n{notes_context or 'N/A'}"

        try:
            res = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7,
                },
                timeout=30,
            )
            res.raise_for_status()
            data = res.json()
            raw_content = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_content)
            return _normalize_questions(parsed.get("questions", []))
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "OpenAI")
        except json.JSONDecodeError:
            raise AIProviderError("Failed to parse JSON response from OpenAI.", status_code=502)
        except Exception as e:
            raise AIProviderError(f"OpenAI error: {str(e)}", status_code=502)

    def generate_study_guide(self, classroom_name: str, notes_context: str, model: str = "") -> str:
        target_model = model or "gpt-4o-mini"
        system_prompt = (
            "You are an expert educator. Generate a structured, comprehensive educational study guide in clean Markdown.\n"
            "Include these exact sections:\n"
            "# Executive Summary\n"
            "## Key Concepts & Takeaways\n"
            "## Vocabulary Glossary\n"
            "(as a Markdown table with Columns: Term | Definition | Context/Example)\n"
            "## Self-Assessment Review Questions\n"
            "(5 thought-provoking review questions with concise sample solutions)\n"
        )
        user_content = f"Classroom: {classroom_name}\n\nLesson Notes & Transcripts:\n{notes_context}"

        try:
            res = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.6,
                },
                timeout=45,
            )
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "OpenAI")
        except Exception as e:
            raise AIProviderError(f"OpenAI error: {str(e)}", status_code=502)


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key.strip()
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def validate_key(self, model: str = "") -> bool:
        target_model = model or "gemini-1.5-flash"
        url = f"{self.base_url}/{target_model}:generateContent?key={self.api_key}"
        try:
            res = requests.post(
                url,
                json={"contents": [{"parts": [{"text": "ping"}]}]},
                timeout=10,
            )
            res.raise_for_status()
            return True
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "Gemini")
        except Exception as e:
            raise AIProviderError(f"Gemini connection error: {str(e)}", status_code=502)

    def generate_quiz(self, prompt: str, notes_context: str = "", count: int = 5, difficulty: str = "medium", model: str = "") -> List[Dict[str, Any]]:
        target_model = model or "gemini-1.5-flash"
        url = f"{self.base_url}/{target_model}:generateContent?key={self.api_key}"

        system_instruction = (
            f"Generate {count} multiple-choice questions at {difficulty} difficulty.\n"
            "Output valid JSON adhering to schema:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "text": "Question prompt",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct": 0,\n'
            '      "contextNote": "Brief explanation or hint"\n'
            '    }\n'
            '  ]\n'
            "}"
        )
        content_text = f"{system_instruction}\n\nPrompt: {prompt}\n\nNotes Context:\n{notes_context or 'N/A'}"

        try:
            res = requests.post(
                url,
                json={
                    "contents": [{"parts": [{"text": content_text}]}],
                    "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7},
                },
                timeout=30,
            )
            res.raise_for_status()
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)
            return _normalize_questions(parsed.get("questions", []))
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "Gemini")
        except (KeyError, IndexError, json.JSONDecodeError):
            raise AIProviderError("Failed to parse JSON response from Gemini.", status_code=502)
        except Exception as e:
            raise AIProviderError(f"Gemini error: {str(e)}", status_code=502)

    def generate_study_guide(self, classroom_name: str, notes_context: str, model: str = "") -> str:
        target_model = model or "gemini-1.5-flash"
        url = f"{self.base_url}/{target_model}:generateContent?key={self.api_key}"

        prompt_text = (
            "You are an expert educator. Generate a structured, comprehensive educational study guide in clean Markdown.\n"
            "Include these exact sections:\n"
            "# Executive Summary\n"
            "## Key Concepts & Takeaways\n"
            "## Vocabulary Glossary\n"
            "(as a Markdown table with Columns: Term | Definition | Context/Example)\n"
            "## Self-Assessment Review Questions\n"
            "(5 thought-provoking review questions with concise sample solutions)\n\n"
            f"Classroom: {classroom_name}\n\nLesson Notes:\n{notes_context}"
        )

        try:
            res = requests.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "generationConfig": {"temperature": 0.6},
                },
                timeout=45,
            )
            res.raise_for_status()
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "Gemini")
        except (KeyError, IndexError):
            raise AIProviderError("Failed to parse response from Gemini.", status_code=502)
        except Exception as e:
            raise AIProviderError(f"Gemini error: {str(e)}", status_code=502)


class GrokProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key.strip()
        self.base_url = "https://api.x.ai/v1"

    def validate_key(self, model: str = "") -> bool:
        try:
            res = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": model or "grok-2",
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
                timeout=10,
            )
            res.raise_for_status()
            return True
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "Grok")
        except Exception as e:
            raise AIProviderError(f"Grok connection error: {str(e)}", status_code=502)

    def generate_quiz(self, prompt: str, notes_context: str = "", count: int = 5, difficulty: str = "medium", model: str = "") -> List[Dict[str, Any]]:
        target_model = model or "grok-2"
        system_prompt = (
            f"You are an expert educator. Generate {count} multiple-choice questions at {difficulty} difficulty.\n"
            "Output MUST be valid JSON with this exact schema:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "text": "Question prompt text",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct": 0,\n'
            '      "contextNote": "Brief explanation or hint"\n'
            '    }\n'
            '  ]\n'
            "}"
        )
        user_content = f"Topic/Prompt: {prompt}\n\nLesson Notes Context:\n{notes_context or 'N/A'}"

        try:
            res = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7,
                },
                timeout=30,
            )
            res.raise_for_status()
            data = res.json()
            raw_content = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_content)
            return _normalize_questions(parsed.get("questions", []))
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "Grok")
        except json.JSONDecodeError:
            raise AIProviderError("Failed to parse JSON response from Grok.", status_code=502)
        except Exception as e:
            raise AIProviderError(f"Grok error: {str(e)}", status_code=502)

    def generate_study_guide(self, classroom_name: str, notes_context: str, model: str = "") -> str:
        target_model = model or "grok-2"
        system_prompt = (
            "You are an expert educator. Generate a structured, comprehensive educational study guide in clean Markdown.\n"
            "Include these exact sections:\n"
            "# Executive Summary\n"
            "## Key Concepts & Takeaways\n"
            "## Vocabulary Glossary\n"
            "(as a Markdown table with Columns: Term | Definition | Context/Example)\n"
            "## Self-Assessment Review Questions\n"
            "(5 thought-provoking review questions with concise sample solutions)\n"
        )
        user_content = f"Classroom: {classroom_name}\n\nLesson Notes & Transcripts:\n{notes_context}"

        try:
            res = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": target_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.6,
                },
                timeout=45,
            )
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.HTTPError as e:
            _handle_http_error(e, "Grok")
        except Exception as e:
            raise AIProviderError(f"Grok error: {str(e)}", status_code=502)


def get_ai_provider(provider_name: str, api_key: str) -> BaseAIProvider:
    name = (provider_name or "").strip().lower()
    if name == "gemini":
        return GeminiProvider(api_key)
    elif name in ("openai", "gpt"):
        return OpenAIProvider(api_key)
    elif name == "grok":
        return GrokProvider(api_key)
    else:
        raise AIProviderError(f"Unsupported AI provider: '{provider_name}'. Supported: gemini, openai, grok", status_code=400)
