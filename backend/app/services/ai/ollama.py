"""Ollama local AI provider — uses Ollama's OpenAI-compatible REST API.

Requires a vision-capable model like gemma3, llava, or moondream.
"""

from app.services.ai.openai import OpenAIProvider


class OllamaProvider(OpenAIProvider):
    """Local Ollama provider. Identical to OpenAIProvider except no Authorization header
    is sent — AI_API_KEY should be set to "not-needed" in the environment.

    Requires a vision-capable model like gemma3, llava, or moondream.
    """
