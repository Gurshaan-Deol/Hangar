"""Tests for the Open-Meteo weather service."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.weather import WeatherData, _fetch_from_api, get_current_weather


MOCK_OPEN_METEO_RESPONSE = {
    "current": {
        "temperature_2m": 18.5,
        "apparent_temperature": 16.0,
        "weathercode": 1,
        "relativehumidity_2m": 65,
        "windspeed_10m": 12.3,
        "is_day": 1,
    },
    "daily": {
        "temperature_2m_max": [22.0],
        "temperature_2m_min": [14.0],
    },
}


@pytest.mark.asyncio
async def test_fetch_from_api_returns_weather_data():
    mock_response = MagicMock()
    mock_response.json.return_value = MOCK_OPEN_METEO_RESPONSE
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.services.weather.httpx.AsyncClient", return_value=mock_client):
        result = await _fetch_from_api(51.5, -0.1)

    assert isinstance(result, WeatherData)
    assert result.temperature == 18.5
    assert result.feels_like == 16.0
    assert result.condition == "cloudy"
    assert result.humidity == 65
    assert result.wind_speed == 12.3
    assert result.is_daytime is True
    assert result.location == "51.5,-0.1"
    assert result.temp_max == 22.0
    assert result.temp_min == 14.0


@pytest.mark.asyncio
async def test_get_current_weather_uses_cache(tmp_path):
    cached = WeatherData(
        temperature=20.0,
        feels_like=19.0,
        condition="clear",
        humidity=50,
        wind_speed=5.0,
        is_daytime=True,
        location="51.5,-0.1",
        fetched_at=datetime.now(timezone.utc),
        temp_max=24.0,
        temp_min=15.0,
    )

    mock_redis = AsyncMock()

    import json
    from dataclasses import asdict

    payload = asdict(cached)
    payload["fetched_at"] = cached.fetched_at.isoformat()
    mock_redis.get = AsyncMock(return_value=json.dumps(payload))

    result = await get_current_weather(51.5, -0.1, mock_redis)

    assert result.temperature == 20.0
    assert result.temp_max == 24.0
    assert result.temp_min == 15.0
    mock_redis.get.assert_called_once()
