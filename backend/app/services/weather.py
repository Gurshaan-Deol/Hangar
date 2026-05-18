"""Fetch current weather data from the Open-Meteo API (no API key required)."""

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import httpx
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

_WMO_CONDITION: dict[int, str] = {
    0: "clear",
    1: "cloudy",
    2: "cloudy",
    3: "cloudy",
    45: "foggy",
    48: "foggy",
    51: "rain",
    53: "rain",
    55: "rain",
    61: "rain",
    63: "rain",
    65: "rain",
    71: "snow",
    73: "snow",
    75: "snow",
    77: "snow",
    80: "rain",
    81: "rain",
    82: "rain",
    85: "snow",
    86: "snow",
    95: "stormy",
    96: "stormy",
    99: "stormy",
}

_CACHE_TTL_SECONDS = 1800  # 30 minutes


@dataclass
class WeatherData:
    temperature: float
    feels_like: float
    condition: str
    humidity: int
    wind_speed: float
    is_daytime: bool
    location: str
    fetched_at: datetime


async def get_current_weather(lat: float, lon: float, redis: Redis) -> WeatherData:
    """Return current weather for the given coordinates, cached in Redis for 30 minutes."""
    cache_key = f"weather:{lat}:{lon}"

    cached = await _read_from_redis(redis, cache_key)
    if cached is not None:
        return cached

    weather = await _fetch_from_api(lat, lon)
    await _write_to_redis(redis, cache_key, weather)
    return weather


async def _fetch_from_api(lat: float, lon: float) -> WeatherData:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,apparent_temperature,weathercode,relativehumidity_2m,windspeed_10m,is_day",
        "wind_speed_unit": "kmh",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(_OPEN_METEO_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Open-Meteo returned {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Open-Meteo request failed: {exc}") from exc

    current = response.json()["current"]
    weather_code = int(current["weathercode"])

    return WeatherData(
        temperature=float(current["temperature_2m"]),
        feels_like=float(current["apparent_temperature"]),
        condition=_WMO_CONDITION.get(weather_code, "cloudy"),
        humidity=int(current["relativehumidity_2m"]),
        wind_speed=float(current["windspeed_10m"]),
        is_daytime=bool(current["is_day"]),
        location=f"{lat},{lon}",
        fetched_at=datetime.now(timezone.utc),
    )


async def _read_from_redis(redis: Redis, key: str) -> WeatherData | None:
    try:
        raw = await redis.get(key)
    except Exception:
        logger.warning("Redis cache read failed; will fetch fresh weather data")
        return None

    if raw is None:
        return None

    try:
        # json.loads handles both str and bytes
        data = json.loads(raw)
        return WeatherData(
            temperature=data["temperature"],
            feels_like=data["feels_like"],
            condition=data["condition"],
            humidity=data["humidity"],
            wind_speed=data["wind_speed"],
            is_daytime=data["is_daytime"],
            location=data["location"],
            fetched_at=datetime.fromisoformat(data["fetched_at"]),
        )
    except Exception:
        logger.warning("Corrupt weather cache entry; fetching fresh data")
        return None


async def _write_to_redis(redis: Redis, key: str, weather: WeatherData) -> None:
    try:
        payload = asdict(weather)
        payload["fetched_at"] = weather.fetched_at.isoformat()
        await redis.setex(key, _CACHE_TTL_SECONDS, json.dumps(payload))
    except Exception:
        logger.warning("Redis cache write failed; continuing without caching")
