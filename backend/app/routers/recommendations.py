"""Recommendations router — AI outfit suggestions based on weather and wardrobe."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user, get_redis
from app.models.outfit import Outfit, OutfitFeedback
from app.models.user import User
from app.schemas.outfit import OutfitFeedbackCreate, OutfitFeedbackResponse, OutfitListResponse, OutfitResponse, OutfitUpdate
from app.services.geocoding import reverse_geocode, search_city
from app.services.recommendations import get_outfit_recommendation
from app.services.weather import WeatherData, get_current_weather

_VALID_OCCASIONS = "^(casual|work|formal|outdoor|date|party|travel|gym|brunch)$"
_MIN_REQUIRED = 3


class RecommendationRequest(BaseModel):
    occasion: str | None = Field(None, pattern=_VALID_OCCASIONS)
    custom_request: str | None = Field(None, max_length=300)
    locked_item_ids: list[str] = Field(default_factory=list)
    user_instruction: str | None = Field(None, max_length=150)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _weather_dict(weather: WeatherData) -> dict:
    return {
        "temperature": weather.temperature,
        "feels_like": weather.feels_like,
        "condition": weather.condition,
        "humidity": weather.humidity,
        "wind_speed": weather.wind_speed,
        "is_daytime": weather.is_daytime,
        "location": weather.location,
        "fetched_at": weather.fetched_at.isoformat(),
    }


def _resolve_location(user: User) -> tuple[float, float]:
    """Return the user's saved location, or fall back to the server default."""
    settings = get_settings()
    if user.weather_lat is not None and user.weather_lon is not None:
        logger.info("Using user location (%.4f, %.4f)", user.weather_lat, user.weather_lon)
        return user.weather_lat, user.weather_lon
    logger.info("Using default location (%.4f, %.4f)", settings.weather_lat, settings.weather_lon)
    return settings.weather_lat, settings.weather_lon


async def _get_owned_outfit(outfit_id: str, user: User, db: AsyncSession) -> Outfit:
    """Fetch an outfit by ID, verifying it belongs to the current user."""
    result = await db.execute(
        select(Outfit)
        .where(Outfit.id == outfit_id, Outfit.user_id == user.id)
        .options(selectinload(Outfit.items))
    )
    outfit = result.scalar_one_or_none()
    if outfit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    return outfit


@router.get("/weather")
async def current_weather(
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
) -> dict:
    """Return current weather conditions for the given or user-configured location.

    If lat/lon query params are supplied they take precedence; otherwise the user's
    saved location (or the server default from .env) is used.
    """
    if lat is not None and lon is not None:
        resolved_lat, resolved_lon = lat, lon
    else:
        resolved_lat, resolved_lon = _resolve_location(user)
    weather = await get_current_weather(resolved_lat, resolved_lon, redis)
    return _weather_dict(weather)


@router.get("/geocode/reverse")
async def geocode_reverse(
    lat: float = Query(...),
    lon: float = Query(...),
    _user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
) -> dict:
    """Return city/region/country for given coordinates using Nominatim."""
    try:
        return await reverse_geocode(lat, lon, redis)
    except Exception:
        logger.exception("Reverse geocode failed for (%.4f, %.4f)", lat, lon)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service unavailable. Please try again.",
        )


@router.get("/geocode/search")
async def geocode_search(
    q: str = Query(..., min_length=1, max_length=100),
    _user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
) -> list[dict]:
    """Search for cities matching a query string using Nominatim."""
    try:
        return await search_city(q, redis)
    except Exception:
        logger.exception("City search failed for query: %s", q)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service unavailable. Please try again.",
        )


@router.get("/history", response_model=OutfitListResponse)
async def recommendation_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitListResponse:
    """Return the user's previously generated outfits, newest first."""
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(Outfit.id)).where(Outfit.user_id == user.id)
    )
    total = total_result.scalar_one()

    outfits_result = await db.execute(
        select(Outfit)
        .where(Outfit.user_id == user.id)
        .options(selectinload(Outfit.items))
        .order_by(Outfit.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    outfits = outfits_result.scalars().all()

    return OutfitListResponse(outfits=outfits, total=total, page=page, limit=limit)


@router.post("")
async def get_recommendation(
    body: RecommendationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> dict:
    """Generate a weather-appropriate outfit recommendation from the user's wardrobe."""
    lat, lon = _resolve_location(user)
    weather = await get_current_weather(lat, lon, redis)

    occasion = body.occasion or "casual"
    result = await get_outfit_recommendation(
        db,
        user,
        weather,
        occasion,
        body.custom_request,
        locked_item_ids=body.locked_item_ids,
        user_instruction=body.user_instruction,
    )

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": result["error"],
                "current_count": result.get("current_count", 0),
                "items_needed": result.get("items_needed", _MIN_REQUIRED),
            },
        )

    outfit_response = OutfitResponse.model_validate(result)

    return {
        "weather": _weather_dict(weather),
        "outfit": outfit_response.model_dump(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/{outfit_id}/feedback", response_model=OutfitFeedbackResponse)
async def submit_feedback(
    outfit_id: str,
    body: OutfitFeedbackCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitFeedbackResponse:
    """Submit thumbs-up or thumbs-down feedback for an outfit (upsert per user)."""
    outfit = await _get_owned_outfit(outfit_id, user, db)

    existing_result = await db.execute(
        select(OutfitFeedback).where(
            OutfitFeedback.outfit_id == outfit.id,
            OutfitFeedback.user_id == user.id,
        )
    )
    feedback = existing_result.scalar_one_or_none()

    if feedback:
        feedback.rating = body.rating
    else:
        feedback = OutfitFeedback(
            outfit_id=outfit.id,
            user_id=user.id,
            rating=body.rating,
        )
        db.add(feedback)

    await db.commit()
    return OutfitFeedbackResponse(rating=body.rating)


@router.patch("/{outfit_id}", response_model=OutfitResponse)
async def update_outfit(
    outfit_id: str,
    body: OutfitUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Update rating or favourite status for an outfit."""
    outfit = await _get_owned_outfit(outfit_id, user, db)

    if body.rating is not None:
        outfit.rating = body.rating
    if body.is_favourite is not None:
        outfit.is_favourite = body.is_favourite

    await db.commit()
    await db.refresh(outfit)
    return OutfitResponse.model_validate(outfit)


@router.post("/{outfit_id}/wear", response_model=OutfitResponse)
async def mark_outfit_worn(
    outfit_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Log that the user wore this outfit today."""
    outfit = await _get_owned_outfit(outfit_id, user, db)

    outfit.worn_at = datetime.now(timezone.utc)
    outfit.wear_count = (outfit.wear_count or 0) + 1

    await db.commit()
    await db.refresh(outfit)
    return OutfitResponse.model_validate(outfit)


@router.delete("/{outfit_id}")
async def delete_outfit(
    outfit_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete an outfit from the user's history."""
    outfit = await _get_owned_outfit(outfit_id, user, db)
    await db.delete(outfit)
    await db.commit()
    return {"message": "Outfit deleted"}
