"""Ollama local AI provider — uses Ollama's OpenAI-compatible REST API.

Requires a vision-capable model like gemma3, llava, or moondream.
"""

from __future__ import annotations

import base64
import json
import logging
import mimetypes
from pathlib import Path
from typing import TYPE_CHECKING

from app.config import get_settings
from app.services.ai.base import BaseAIProvider, ClothingAnalysis, extract_json_from_response
from app.services.ai.http_client import call_openai_compatible_api
from app.services.ai.openai import _split_tags
from app.services.ai.prompts import (
    DUPLICATE_CHECK_SYSTEM,
    OLLAMA_ANALYSIS_SYSTEM,
    OLLAMA_ANALYSIS_USER,
    OUTFIT_RECOMMENDATION_SYSTEM,
)

if TYPE_CHECKING:
    from app.services.weather import WeatherData

logger = logging.getLogger(__name__)


class OllamaProvider(BaseAIProvider):
    """Local Ollama provider using Ollama's OpenAI-compatible API without auth."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.ai_base_url.rstrip("/")
        self._api_key = settings.ai_api_key
        self._vision_model = settings.ai_vision_model
        self._text_model = settings.ai_text_model

    async def analyze_clothing_image(self, image_path: str) -> ClothingAnalysis:
        """Analyse a clothing photo using a prompt simplified for small local models."""
        image_bytes = Path(image_path).read_bytes()
        image_b64 = base64.b64encode(image_bytes).decode()
        mime, _ = mimetypes.guess_type(image_path)
        mime = mime or "image/jpeg"

        messages = [
            {"role": "system", "content": OLLAMA_ANALYSIS_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                    {"type": "text", "text": OLLAMA_ANALYSIS_USER},
                ],
            },
        ]

        raw = await call_openai_compatible_api(
            base_url=self._base_url,
            api_key=self._api_key,
            model=self._vision_model,
            messages=messages,
            include_auth=False,
            max_tokens=512,
            timeout=60.0,
        )
        data = extract_json_from_response(raw)

        return ClothingAnalysis(
            name=data.get("name", "Unknown Item"),
            category=data.get("category", "other"),
            color=data.get("color", "unknown"),
            style=data.get("style", "other"),
            season=data.get("season", []),
            tags=_split_tags(data.get("tags", [])),
            confidence=data.get("confidence", 0.0),
        )

    async def check_duplicate(self, new_item: dict, existing_items: list[dict]) -> dict:
        """Ask the AI whether new_item duplicates any item in existing_items."""
        prompt = f"""I just added a new clothing item to my wardrobe:
Name: {new_item.get('name')}
Category: {new_item.get('category')}
Color: {new_item.get('color')}
Tags: {', '.join(new_item.get('tags') or [])}

Do any of these existing wardrobe items look like a duplicate or near-duplicate?
{json.dumps(existing_items, indent=2)}

Return a JSON object with exactly:
{{
  "duplicate_found": true or false,
  "duplicate_id": "<id of the matching item, or null>",
  "confidence": 0.0 to 1.0,
  "reason": "brief one-sentence explanation"
}}
Return only the JSON object, nothing else."""

        raw = await call_openai_compatible_api(
            base_url=self._base_url,
            api_key=self._api_key,
            model=self._text_model or self._vision_model,
            messages=[
                {"role": "system", "content": DUPLICATE_CHECK_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            include_auth=False,
            max_tokens=256,
            timeout=30.0,
        )
        return extract_json_from_response(raw)

    async def generate_outfit_recommendation(
        self,
        items: list[dict],
        weather: WeatherData,
        occasion: str = "casual",
        custom_request: str | None = None,
    ) -> dict:
        """Select 3-5 items from the wardrobe that suit the current weather and occasion."""
        if custom_request:
            outfit_goal = f"The user's outfit goal (natural language): {custom_request}"
            occasion_json = "custom"
        else:
            outfit_goal = f"The user wants an outfit for: {occasion}"
            occasion_json = occasion

        user_prompt = f"""
{outfit_goal}
Current weather: {weather.temperature}°C (today's range: {weather.temp_min}°C – {weather.temp_max}°C), feels like {weather.feels_like}°C, {weather.condition}, humidity {weather.humidity}%

Available clothing items:
{json.dumps(items, indent=2)}

Select 3-5 items that work well together. Consider:
- Temperature appropriateness (layers for cold, light for heat, waterproof for rain)
- Style cohesion (items should match in formality and aesthetic)
- Color coordination

Return a JSON object with exactly:
{{
  "selected_item_ids": ["id1", "id2", "id3"],
  "reasoning": "Brief explanation of why these items work together and suit the weather",
  "occasion": "{occasion_json}"
}}
Return only the JSON object, nothing else.
"""

        raw = await call_openai_compatible_api(
            base_url=self._base_url,
            api_key=self._api_key,
            model=self._text_model or self._vision_model,
            messages=[
                {"role": "system", "content": OUTFIT_RECOMMENDATION_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            include_auth=False,
            max_tokens=512,
            timeout=60.0,
        )
        return extract_json_from_response(raw)

    async def health_check(self) -> bool:
        """Return True if the Ollama endpoint is reachable and responding."""
        try:
            await call_openai_compatible_api(
                base_url=self._base_url,
                api_key=self._api_key,
                model=self._text_model or self._vision_model,
                messages=[{"role": "user", "content": "ping"}],
                include_auth=False,
                max_tokens=1,
                timeout=10.0,
            )
            return True
        except Exception:
            return False
