"""OpenAI-compatible AI provider (works with OpenAI, Google Gemini via OpenAI endpoint, etc.)."""

from app.services.ai.base import BaseAIProvider, ClothingAnalysis, OutfitRecommendation, WeatherData

# TODO: implement OpenAIProvider(BaseAIProvider)
#       - Accept base_url, api_key, vision_model, text_model in __init__
#       - analyze_clothing_image: send image_base64 to the vision model with a structured prompt,
#         parse the JSON response into ClothingAnalysis
#       - generate_outfit_recommendation: send items + weather context to text_model,
#         parse the JSON response into OutfitRecommendation


class OpenAIProvider(BaseAIProvider):
    async def analyze_clothing_image(self, image_base64: str) -> ClothingAnalysis:
        raise NotImplementedError

    async def generate_outfit_recommendation(
        self, items: list, weather: WeatherData
    ) -> OutfitRecommendation:
        raise NotImplementedError
