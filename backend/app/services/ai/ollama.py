"""Ollama local AI provider — uses Ollama's OpenAI-compatible REST API.

Requires a vision-capable model like gemma3, llava, or moondream.
"""

from __future__ import annotations

import base64
import mimetypes
from pathlib import Path

import httpx

from app.services.ai.base import ClothingAnalysis, extract_json_from_response
from app.services.ai.openai import OpenAIProvider, _split_tags

_OLLAMA_SYSTEM_PROMPT = (
    "You are a clothing analyzer. Look at the image and identify the clothing item. "
    "Respond with a JSON object only. No explanation. No markdown."
)

_OLLAMA_USER_PROMPT = """\
Analyze this clothing item. Return this exact JSON structure with no other text:
{
  "name": "item name here",
  "category": "shirt or pants or shorts or dress or skirt or jacket or coat or sweater or hoodie or shoes or boots or sneakers or sandals or bag or accessory or other",
  "color": "main color here",
  "style": "casual or formal or business or athletic or outdoor or streetwear or other",
  "season": ["spring", "summer", "fall", "winter"],
  "tags": ["tag1", "tag2"],
  "confidence": 0.8
}
Only return the JSON. Start your response with {\
"""


class OllamaProvider(OpenAIProvider):
    """Local Ollama provider. Identical to OpenAIProvider except:
    - No Authorization header (AI_API_KEY should be "not-needed")
    - Uses a simplified prompt tuned for smaller vision models

    Requires a vision-capable model like gemma3, llava, or moondream.
    """

    async def analyze_clothing_image(self, image_path: str) -> ClothingAnalysis:
        """Analyse a clothing photo using a prompt simplified for small local models."""
        image_bytes = Path(image_path).read_bytes()
        image_b64 = base64.b64encode(image_bytes).decode()

        mime, _ = mimetypes.guess_type(image_path)
        mime = mime or "image/jpeg"

        payload = {
            "model": self._vision_model,
            "messages": [
                {"role": "system", "content": _OLLAMA_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{image_b64}"},
                        },
                        {"type": "text", "text": _OLLAMA_USER_PROMPT},
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
