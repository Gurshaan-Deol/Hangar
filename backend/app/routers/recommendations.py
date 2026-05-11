"""Recommendations router — AI outfit suggestions based on weather and wardrobe."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.outfit import Outfit
from app.models.user import User
from app.schemas.outfit import OutfitListResponse, OutfitResponse
from app.services.recommendations import get_outfit_recommendation
from app.services.weather import WeatherData, get_current_weather

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


@router.get("/weather")
async def current_weather(
    _: User = Depends(get_current_user),
) -> dict:
    """Return current weather conditions for the configured location."""
    settings = get_settings()
    weather = await get_current_weather(settings.weather_lat, settings.weather_lon)
    return _weather_dict(weather)


@router.get("/history", response_model=OutfitListResponse)
async def recommendation_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
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


@router.get("")
async def get_recommendation(
    occasion: str = Query("casual", pattern="^(casual|work|formal|outdoor|date)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate a weather-appropriate outfit recommendation from the user's wardrobe."""
    settings = get_settings()
    weather = await get_current_weather(settings.weather_lat, settings.weather_lon)

    result = await get_outfit_recommendation(db, user, weather, occasion)

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    outfit_response = OutfitResponse.model_validate(result)

    return {
        "weather": _weather_dict(weather),
        "outfit": outfit_response.model_dump(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
