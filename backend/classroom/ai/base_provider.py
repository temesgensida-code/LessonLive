from abc import ABC, abstractmethod
from typing import Dict, Any, List

class AIProviderError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class BaseAIProvider(ABC):
    @abstractmethod
    def generate_quiz(self, prompt: str, notes_context: str, count: int, difficulty: str, model: str) -> List[Dict[str, Any]]:
        """Generates structured questions matching LessonLive schema."""
        pass

    @abstractmethod
    def generate_study_guide(self, classroom_name: str, notes_context: str, model: str) -> str:
        """Generates markdown study guide with takeaways, vocabulary, and questions."""
        pass

    @abstractmethod
    def validate_key(self, model: str) -> bool:
        """Verifies key validity with minimal token test."""
        pass
