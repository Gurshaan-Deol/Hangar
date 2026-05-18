import pytest

from app.services.ai.base import extract_json_from_response
from app.config import get_settings


def test_extract_json_plain():
    raw = '{"name": "Blue Shirt", "category": "shirt", "color": "blue", "style": "casual", "season": ["spring"], "tags": ["weekend"], "confidence": 0.9}'
    result = extract_json_from_response(raw)
    assert result["name"] == "Blue Shirt"
    assert result["category"] == "shirt"


def test_extract_json_with_markdown_fences():
    raw = '```json\n{"name": "Jeans", "category": "pants", "color": "blue", "style": "casual", "season": ["all"], "tags": [], "confidence": 0.8}\n```'
    result = extract_json_from_response(raw)
    assert result["name"] == "Jeans"


def test_extract_json_with_preamble():
    raw = 'Sure! Here is the JSON:\n{"name": "Sneakers", "category": "shoes", "color": "white", "style": "casual", "season": ["spring", "summer"], "tags": ["sport"], "confidence": 0.85}'
    result = extract_json_from_response(raw)
    assert result["category"] == "shoes"


def test_extract_json_raises_on_garbage():
    with pytest.raises(ValueError):
        extract_json_from_response("This is not JSON at all, sorry!")


def test_get_ai_provider_ollama(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    get_settings.cache_clear()
    from app.services.ai.base import get_ai_provider
    provider = get_ai_provider()
    from app.services.ai.ollama import OllamaProvider
    assert isinstance(provider, OllamaProvider)
    get_settings.cache_clear()


def test_get_ai_provider_invalid(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "invalid_provider")
    get_settings.cache_clear()
    from app.services.ai.base import get_ai_provider
    with pytest.raises(Exception):
        get_ai_provider()
    get_settings.cache_clear()
