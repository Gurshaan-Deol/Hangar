"""Abstract base class and data types that every AI provider must implement."""

from __future__ import annotations

import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.config import get_settings

logger = logging.getLogger(__name__)


def extract_json_from_response(text: str) -> dict:
    """Extract and parse JSON from an AI response that may include prose or markdown.

    Attempts in order:
    1. Direct json.loads on the stripped text
    2. Content inside a ```json ... ``` fence
    3. Content inside a ``` ... ``` fence (no language tag)
    4. Substring from first '{' to last '}'

    Each candidate also has escaped underscores normalised before parsing.
    Raises ValueError (with the original text) if all attempts fail.
    """
    def _try_parse(candidate: str) -> dict | None:
        cleaned = candidate.replace(r"\_", "_").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None

    stripped = text.strip()

    # 1. Direct parse
    result = _try_parse(stripped)
    if result is not None:
        return result

    # 2. ```json ... ``` block
    json_fence = re.search(r"```json\s*([\s\S]*?)\s*```", stripped)
    if json_fence:
        result = _try_parse(json_fence.group(1))
        if result is not None:
            return result

    # 3. ``` ... ``` block (no language tag)
    fence = re.search(r"```\s*([\s\S]*?)\s*```", stripped)
    if fence:
        result = _try_parse(fence.group(1))
        if result is not None:
            return result

    # 4. First '{' to last '}'
    first = stripped.find("{")
    last = stripped.rfind("}")
    if first != -1 and last != -1 and last > first:
        result = _try_parse(stripped[first : last + 1])
        if result is not None:
            return result

    logger.error("Could not extract JSON from AI response: %s", text[:500])
    raise ValueError(f"Could not extract JSON from AI response: {text[:500]}")


@dataclass
class ClothingAnalysis:
    name: str
    category: str
    color: str
    style: str
    season: list[str]
    tags: list[str]
    confidence: float


class BaseAIProvider(ABC):
    """All AI providers must implement these three methods."""

    @abstractmethod
    async def analyze_clothing_image(self, image_path: str) -> ClothingAnalysis:
        """Analyse a clothing photo on disk and return structured metadata."""
        ...

    @abstractmethod
    async def check_duplicate(
        self,
        new_item: dict,
        existing_items: list[dict],
    ) -> dict:
        """Check whether new_item is a duplicate of any item in existing_items.

        Returns: { "duplicate_found": bool, "duplicate_id": str|None,
                   "confidence": float, "reason": str }
        """
        ...

    @abstractmethod
    async def generate_outfit_recommendation(
        self,
        items: list[dict],
        weather: "WeatherData",  # noqa: F821 — resolved at runtime
        occasion: str = "casual",
        custom_request: str | None = None,
    ) -> dict:
        """Suggest an outfit from the wardrobe given current weather and occasion.

        When custom_request is provided it takes precedence over occasion.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the AI backend is reachable and responsive."""
        ...


def get_ai_provider() -> BaseAIProvider:
    """Return the configured AI provider based on the AI_PROVIDER environment variable."""
    # Imported here to avoid circular imports at module load time.
    from app.services.ai.ollama import OllamaProvider
    from app.services.ai.openai import OpenAIProvider

    provider = get_settings().ai_provider.lower()

    if provider in ("openai", "google"):
        return OpenAIProvider()
    if provider == "ollama":
        return OllamaProvider()
    raise ValueError(
        f"Unknown AI provider: {provider!r}. Must be 'openai', 'google', or 'ollama'."
    )


# Late import alias so callers can do `from app.services.ai.base import WeatherData`
# without a circular dependency (weather.py does not import from ai/).
def __getattr__(name: str):
    if name == "WeatherData":
        from app.services.weather import WeatherData
        return WeatherData
    raise AttributeError(name)
