"""OpenAI-compatible AI provider (works with OpenAI, Google Gemini via OpenAI endpoint, etc.)."""

from __future__ import annotations

import base64
import json
import logging
import mimetypes
from pathlib import Path
from typing import TYPE_CHECKING

import httpx

from app.config import get_settings
from app.services.ai.base import BaseAIProvider, ClothingAnalysis

if TYPE_CHECKING:
    from app.services.weather import WeatherData

import logging
logger = logging.getLogger(__name__)


def _parse_json_response(raw: str) -> dict:
    """Parse a JSON response from the AI, handling markdown fences and escaped underscores."""
    text = raw.strip()
    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    # Some models escape underscores in JSON keys (markdown artifact)
    text = text.replace(r"\_", "_")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error("AI returned non-JSON response: %s", raw)
        raise ValueError(f"AI response was not valid JSON: {raw[:200]}")


_ANALYZE_PROMPT = """\
Analyze this clothing item and return a JSON object with exactly these fields:
{
  "name": "descriptive name of the item",
  "category": "shirt, t-shirt, top, pants, jeans, shorts, dress, skirt, \
blazer, suit, jacket, coat, sweater, cardigan, hoodie, \
activewear, shoes, boots, heels, sneakers, sandals, \
hat, bag, accessory, other",
  "color": "primary color description",
  "style": "one of: casual, smart-casual, formal, workwear, athletic, loungewear",
  "season": ["array of applicable seasons from: spring, summer, fall, winter"],
  "tags": ["array of 2-5 descriptive tags like office, weekend, beach, date-night"],
  "confidence": 0.95
}
Return only the JSON object, nothing else."""


class OpenAIProvider(BaseAIProvider):
    """AI provider for any OpenAI-compatible API (OpenAI, Gemini, LiteLLM, etc.)."""

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.ai_base_url.rstrip("/")
        self._api_key = settings.ai_api_key
        self._vision_model = settings.ai_vision_model
        self._text_model = settings.ai_text_model

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self._api_key and self._api_key != "not-needed":
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    async def analyze_clothing_image(self, image_path: str) -> ClothingAnalysis:
        """Read an image from disk, send it to the vision model, return structured metadata."""
        image_bytes = Path(image_path).read_bytes()
        image_b64 = base64.b64encode(image_bytes).decode()

        mime, _ = mimetypes.guess_type(image_path)
        mime = mime or "image/jpeg"

        payload = {
            "model": self._vision_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a fashion expert AI. Analyze clothing images and extract "
                        "structured data. Always respond with valid JSON only, no markdown, no explanation."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{image_b64}"},
                        },
                        {"type": "text", "text": _ANALYZE_PROMPT},
                    ],
                },
            ],
            "max_tokens": 512,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()

        raw = response.json()["choices"][0]["message"]["content"]
        data = _parse_json_response(raw)

        # right before building ClothingAnalysis:
        logger.debug(f"Raw AI response fields: {list(data.keys())}")

        return ClothingAnalysis(
            name=data.get("name", "Unknown Item"),
            category=data.get("category", "other"),
            color=data.get("color", "unknown"),
            style=data.get("style", "other"),
            season=data.get("season", []),
            tags=data.get("tags", []),
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

        payload = {
            "model": self._text_model or self._vision_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a wardrobe assistant. Identify duplicate or near-duplicate "
                        "clothing items. Always respond with valid JSON only, no markdown."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 256,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()

        raw = response.json()["choices"][0]["message"]["content"]
        return _parse_json_response(raw)

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
Current weather: {weather.temperature}°C, feels like {weather.feels_like}°C, {weather.condition}, humidity {weather.humidity}%

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

        payload = {
            "model": self._text_model or self._vision_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a personal stylist AI. Select clothing items that work well together for the given weather and occasion. Always respond with valid JSON only.",
                },
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 512,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()

        raw = response.json()["choices"][0]["message"]["content"]
        return _parse_json_response(raw)

    async def health_check(self) -> bool:
        """Return True if the API endpoint is reachable."""
        try:
            payload = {
                "model": self._text_model or self._vision_model,
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 1,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    json=payload,
                    headers=self._headers(),
                )
                return response.status_code < 500
        except Exception:
            logger.exception("AI health check failed")
            return False
