"""OpenAI-compatible AI provider (works with OpenAI, Google Gemini via OpenAI endpoint, etc.)."""

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
from app.services.ai.prompts import (
    CLOTHING_ANALYSIS_SYSTEM,
    CLOTHING_ANALYSIS_USER,
    DUPLICATE_CHECK_SYSTEM,
    OUTFIT_RECOMMENDATION_SYSTEM,
    build_recommendation_prompt,
)

if TYPE_CHECKING:
    from app.services.weather import WeatherData

logger = logging.getLogger(__name__)


def _split_tags(raw_tags: list[str]) -> list[str]:
    """Ensure every tag is a single token. If the model returns 'urban, streetwear'
    as one string, split it so each entry is its own tag."""
    result = []
    for tag in raw_tags:
        for part in tag.split(","):
            cleaned = part.strip()
            if cleaned:
                result.append(cleaned)
    return result


class OpenAIProvider(BaseAIProvider):
    """AI provider for any OpenAI-compatible API (OpenAI, Gemini, LiteLLM, etc.)."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.ai_base_url.rstrip("/")
        self._api_key = settings.ai_api_key
        self._vision_model = settings.ai_vision_model
        self._text_model = settings.ai_text_model

    async def analyze_clothing_image(self, image_path: str) -> ClothingAnalysis:
        """Read an image from disk, send it to the vision model, return structured metadata."""
        image_bytes = Path(image_path).read_bytes()
        image_b64 = base64.b64encode(image_bytes).decode()
        mime, _ = mimetypes.guess_type(image_path)
        mime = mime or "image/jpeg"

        messages = [
            {"role": "system", "content": CLOTHING_ANALYSIS_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                    {"type": "text", "text": CLOTHING_ANALYSIS_USER},
                ],
            },
        ]

        raw = await call_openai_compatible_api(
            base_url=self._base_url,
            api_key=self._api_key,
            model=self._vision_model,
            messages=messages,
            include_auth=True,
            max_tokens=512,
            timeout=60.0,
        )
        data = extract_json_from_response(raw)
        logger.debug("Raw AI response fields: %s", list(data.keys()))

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
            include_auth=True,
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
        locked_item_ids: list[str] | None = None,
        recent_outfits: list[dict] | None = None,
        user_instruction: str | None = None,
    ) -> dict:
        """Select a cohesive outfit from the wardrobe using the structured stylist prompt."""
        weather_dict = {
            "temperature": weather.temperature,
            "feels_like": weather.feels_like,
            "condition": weather.condition,
            "humidity": weather.humidity,
        }
        user_prompt = build_recommendation_prompt(
            weather=weather_dict,
            occasion=occasion,
            wardrobe_items=items,
            recent_outfits=recent_outfits or [],
            locked_item_ids=locked_item_ids or [],
            user_instruction=user_instruction,
        )

        raw = await call_openai_compatible_api(
            base_url=self._base_url,
            api_key=self._api_key,
            model=self._text_model or self._vision_model,
            messages=[
                {"role": "system", "content": OUTFIT_RECOMMENDATION_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            include_auth=True,
            max_tokens=768,
            timeout=60.0,
        )
        return extract_json_from_response(raw)

    async def health_check(self) -> bool:
        """Return True if the API endpoint is reachable and responding."""
        try:
            await call_openai_compatible_api(
                base_url=self._base_url,
                api_key=self._api_key,
                model=self._text_model or self._vision_model,
                messages=[{"role": "user", "content": "ping"}],
                include_auth=True,
                max_tokens=1,
                timeout=10.0,
            )
            return True
        except Exception:
            logger.exception("AI health check failed")
            return False
