import json
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_get_weather_returns_data():
    from app.services.weather import get_current_weather

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "current": {
            "temperature_2m": 18.5,
            "apparent_temperature": 16.0,
            "weathercode": 0,
            "relativehumidity_2m": 65,
            "windspeed_10m": 12.0,
            "is_day": 1,
        },
        "daily": {
            "temperature_2m_max": [22.0],
            "temperature_2m_min": [14.0],
        },
    }
    mock_response.raise_for_status = MagicMock()

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.setex = AsyncMock(return_value=True)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.services.weather.httpx.AsyncClient", return_value=mock_client):
        result = await get_current_weather(43.7, -79.4, mock_redis)

    assert result.temperature == 18.5
    assert result.condition == "clear"
    assert result.is_daytime is True


@pytest.mark.asyncio
async def test_get_weather_uses_cache():
    from app.services.weather import get_current_weather, WeatherData

    cached = WeatherData(
        temperature=20.0,
        feels_like=18.0,
        condition="cloudy",
        humidity=70,
        wind_speed=8.0,
        is_daytime=True,
        location="43.7,-79.4",
        fetched_at=datetime.now(timezone.utc),
        temp_max=24.0,
        temp_min=15.0,
    )

    # Serialize the same way _write_to_redis does
    import dataclasses
    payload = dataclasses.asdict(cached)
    payload["fetched_at"] = cached.fetched_at.isoformat()

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=json.dumps(payload))

    with patch("app.services.weather.httpx.AsyncClient") as mock_client_class:
        result = await get_current_weather(43.7, -79.4, mock_redis)
        mock_client_class.assert_not_called()

    assert result.temperature == 20.0
