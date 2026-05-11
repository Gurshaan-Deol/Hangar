"""Ollama local AI provider — uses the OpenAI-compatible Ollama REST API."""

from app.services.ai.base import BaseAIProvider, ClothingAnalysis, OutfitRecommendation, WeatherData

# TODO: implement OllamaProvider(BaseAIProvider)
#       - Ollama exposes an OpenAI-compatible API at http://host.docker.internal:11434/v1
#       - Reuse OpenAIProvider logic with api_key="not-needed" and the Ollama base_url
#       - No special auth required


class OllamaProvider(BaseAIProvider):
    async def analyze_clothing_image(self, image_base64: str) -> ClothingAnalysis:
        raise NotImplementedError

    async def generate_outfit_recommendation(
        self, items: list, weather: WeatherData
    ) -> OutfitRecommendation:
        raise NotImplementedError
