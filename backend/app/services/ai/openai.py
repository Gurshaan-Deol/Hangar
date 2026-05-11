"""OpenAI-compatible AI provider (works with OpenAI, Google Gemini via OpenAI endpoint, etc.)."""

import base64
import json
import logging
import mimetypes
from pathlib import Path

import httpx

from app.config import get_settings
from app.services.ai.base import BaseAIProvider, ClothingAnalysis

logger = logging.getLogger(__name__)

_ANALYZE_PROMPT = """\
Analyze this clothing item and return a JSON object with exactly these fields:
{
  "name": "descriptive name of the item",
  "category": "one of: shirt, pants, shorts, dress, skirt, jacket, coat, sweater, hoodie, shoes, boots, sneakers, sandals, bag, accessory, other",
  "color": "primary color description",
  "style": "one of: casual, formal, business, athletic, outdoor, streetwear, other",
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

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logger.error("AI returned non-JSON response: %s", raw)
            raise ValueError(f"AI response was not valid JSON: {raw[:200]}")

        return ClothingAnalysis(
            name=data["name"],
            category=data["category"],
            color=data["color"],
            style=data["style"],
            season=data["season"],
            tags=data["tags"],
            confidence=float(data["confidence"]),
        )

    async def generate_outfit_recommendation(
        self, items: list[dict], weather: dict
    ) -> dict:
        """Select 3-5 items from the wardrobe that suit the current weather."""
        prompt = (
            f"Weather conditions:\n{json.dumps(weather, indent=2)}\n\n"
            f"Available clothing items:\n{json.dumps(items, indent=2)}\n\n"
            "Select 3-5 items from the list that work well together for these weather conditions. "
            "Return a JSON object with exactly these fields:\n"
            '{"selected_item_ids": ["id1", "id2", ...], "reasoning": "explanation", "occasion": "casual/formal/etc"}\n'
            "Return only the JSON object, nothing else."
        )

        payload = {
            "model": self._text_model or self._vision_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a fashion expert AI. Suggest outfits based on available clothing "
                        "and weather. Always respond with valid JSON only."
                    ),
                },
                {"role": "user", "content": prompt},
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

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("AI returned non-JSON response: %s", raw)
            raise ValueError(f"AI response was not valid JSON: {raw[:200]}")

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
