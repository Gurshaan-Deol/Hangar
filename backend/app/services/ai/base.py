"""Abstract base class and data types that every AI provider must implement."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.config import get_settings


@dataclass
class ClothingAnalysis:
    name: str
    category: str
    color: str
    style: str
    season: list[str]
    tags: list[str]
    confidence: float


@dataclass
class WeatherData:
    temperature_c: float
    weather_code: int
    wind_speed_kmh: float
    precipitation_mm: float


class BaseAIProvider(ABC):
    """All AI providers must implement these three methods."""

    @abstractmethod
    async def analyze_clothing_image(self, image_path: str) -> ClothingAnalysis:
        """Analyse a clothing photo on disk and return structured metadata."""
        ...

    @abstractmethod
    async def generate_outfit_recommendation(
        self, items: list[dict], weather: dict
    ) -> dict:
        """Suggest an outfit from the wardrobe given current weather conditions."""
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
