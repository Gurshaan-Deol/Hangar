"""Geocoding service — reverse geocode and city search via Nominatim (no API key required)."""

import json
import logging

import httpx
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
_HEADERS = {"User-Agent": "Hangar-Wardrobe-App/1.0"}
_REVERSE_TTL = 86400  # 24 hours
_SEARCH_TTL = 3600    # 1 hour


async def reverse_geocode(lat: float, lon: float, redis: Redis) -> dict:
    """Return city/region/country for given coordinates using Nominatim.

    Results are cached in Redis for 24 hours keyed by coords rounded to 2 decimal places.
    """
    rounded_lat = round(lat, 2)
    rounded_lon = round(lon, 2)
    cache_key = f"geocode:reverse:{rounded_lat}:{rounded_lon}"

    cached = await _redis_get(redis, cache_key)
    if cached is not None:
        return cached

    result = await _fetch_reverse(lat, lon)
    await _redis_set(redis, cache_key, result, _REVERSE_TTL)
    return result


async def search_city(query: str, redis: Redis) -> list[dict]:
    """Search for cities matching a query string using Nominatim.

    Results are cached in Redis for 1 hour keyed by the normalised query string.
    """
    normalized = query.strip().lower()
    cache_key = f"geocode:search:{normalized}"

    try:
        raw = await redis.get(cache_key)
        if raw:
            return json.loads(raw)
    except Exception:
        logger.warning("Redis read failed for geocode search key: %s", cache_key)

    results = await _fetch_search(query)

    try:
        await redis.setex(cache_key, _SEARCH_TTL, json.dumps(results))
    except Exception:
        logger.warning("Redis write failed for geocode search key: %s", cache_key)

    return results


async def _fetch_reverse(lat: float, lon: float) -> dict:
    async with httpx.AsyncClient(timeout=10.0, headers=_HEADERS) as client:
        try:
            response = await client.get(
                f"{_NOMINATIM_BASE}/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Nominatim reverse returned {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Nominatim reverse request failed: {exc}") from exc

    address = response.json().get("address", {})

    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("county")
        or "Unknown"
    )
    region = address.get("state", "")
    country = address.get("country", "")

    # ISO 3166-2 subdivision code gives short region labels (e.g. "CA-ON" → "ON")
    iso_subdiv = address.get("ISO3166-2-lvl4", "")
    region_short = iso_subdiv.split("-")[-1] if "-" in iso_subdiv else region

    display = f"{city}, {region_short}" if region_short else city

    return {"city": city, "region": region, "country": country, "display": display}


async def _fetch_search(query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0, headers=_HEADERS) as client:
        try:
            response = await client.get(
                f"{_NOMINATIM_BASE}/search",
                params={"q": query, "format": "json", "limit": 5},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Nominatim search returned {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Nominatim search request failed: {exc}") from exc

    return [
        {
            "display": item.get("display_name", ""),
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
        }
        for item in response.json()[:5]
    ]


async def _redis_get(redis: Redis, key: str) -> dict | None:
    try:
        raw = await redis.get(key)
    except Exception:
        logger.warning("Redis read failed for key: %s", key)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        logger.warning("Corrupt cache entry for key: %s", key)
        return None


async def _redis_set(redis: Redis, key: str, data: dict, ttl: int) -> None:
    try:
        await redis.setex(key, ttl, json.dumps(data))
    except Exception:
        logger.warning("Redis write failed for key: %s", key)
