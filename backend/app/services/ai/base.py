"""Abstract base class that every AI provider must implement."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ClothingAnalysis:
    clothing_type: str
    color: str
    style: str
    season: str
    description: str


@dataclass
class WeatherData:
    temperature_c: float
    weather_code: int
    wind_speed_kmh: float
    precipitation_mm: float


@dataclass
class OutfitRecommendation:
    item_ids: list[str]
    reasoning: str


class BaseAIProvider(ABC):
    """All AI providers must implement these two methods."""

    @abstractmethod
    async def analyze_clothing_image(self, image_base64: str) -> ClothingAnalysis:
        """Analyse a clothing photo and return structured metadata."""
        ...

    @abstractmethod
    async def generate_outfit_recommendation(
        self, items: list, weather: WeatherData
    ) -> OutfitRecommendation:
        """Suggest an outfit from the wardrobe given current weather."""
        ...
