"""Outfit recommendation service — matches wardrobe items to current weather conditions."""

import logging
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clothing_item import ClothingItem
from app.models.outfit import Outfit
from app.models.user import User
from app.services.ai.base import get_ai_provider
from app.services.weather import WeatherData

logger = logging.getLogger(__name__)

_MAX_ITEMS = 30
_MIN_ITEMS = 3


async def get_relevant_items(
    db: AsyncSession,
    user_id: uuid.UUID,
    weather: WeatherData,
) -> list[ClothingItem]:
    """Return a weather-filtered subset of the user's ready clothing items.

    Applies a season filter based on temperature, boosts rain/stormy outerwear,
    and caps the result at _MAX_ITEMS. Falls back to all ready items when fewer
    than _MIN_ITEMS pass the filter so we never return an empty set.
    """
    count_result = await db.execute(
        select(func.count()).select_from(ClothingItem).where(
            ClothingItem.user_id == user_id,
            ClothingItem.status == "ready",
        )
    )
    total = count_result.scalar_one()

    temp = weather.temperature
    if temp < 10:
        seasons = ["fall", "winter"]
    elif temp > 20:
        seasons = ["spring", "summer"]
    else:
        seasons = ["spring", "fall"]

    season_filter = or_(
        ClothingItem.season.is_(None),
        ClothingItem.season.overlap(seasons),
    )

    query = select(ClothingItem).where(
        ClothingItem.user_id == user_id,
        ClothingItem.status == "ready",
    )

    if weather.condition in ("rain", "stormy"):
        # Always include outerwear regardless of season filter
        query = query.where(
            or_(season_filter, ClothingItem.category.in_(["jacket", "coat"]))
        )
    else:
        query = query.where(season_filter)

    query = query.limit(_MAX_ITEMS)
    result = await db.execute(query)
    items = list(result.scalars().all())

    if len(items) < _MIN_ITEMS:
        logger.info("Pre-filter returned only %d items — falling back to all ready items", len(items))
        fallback_result = await db.execute(
            select(ClothingItem)
            .where(ClothingItem.user_id == user_id, ClothingItem.status == "ready")
            .limit(_MAX_ITEMS)
        )
        items = list(fallback_result.scalars().all())

    logger.info("Pre-filtered to %d relevant items from %d total", len(items), total)
    return items


async def get_outfit_recommendation(
    db: AsyncSession,
    user: User,
    weather: WeatherData,
    occasion: str = "casual",
    custom_request: str | None = None,
) -> Outfit | dict:
    """Generate an AI outfit recommendation based on the user's wardrobe and current weather.

    When custom_request is provided it is passed to the AI instead of the occasion label.
    Returns an Outfit ORM instance on success, or an error dict when preconditions fail.
    """
    items = await get_relevant_items(db, user.id, weather)

    if len(items) < _MIN_ITEMS:
        return {
            "error": "not_enough_items",
            "message": "Not enough items",
            "current_count": len(items),
            "required_count": _MIN_ITEMS,
            "items_needed": _MIN_ITEMS - len(items),
        }

    inventory = [
        {
            "id": str(item.id),
            "name": item.name,
            "category": item.category,
            "color": item.color,
            "style": item.style,
            "season": item.season or [],
            "tags": item.tags or [],
        }
        for item in items
    ]

    ai = get_ai_provider()
    ai_response = await ai.generate_outfit_recommendation(inventory, weather, occasion, custom_request)

    selected_ids = ai_response.get("selected_item_ids", [])
    reasoning = ai_response.get("reasoning", "")
    returned_occasion = ai_response.get("occasion", occasion)

    # Convert string IDs from AI to UUID objects for the IN query
    selected_uuids = []
    for sid in selected_ids:
        try:
            selected_uuids.append(uuid.UUID(str(sid)))
        except ValueError:
            logger.warning("AI returned invalid item ID: %s", sid)

    selected_result = await db.execute(
        select(ClothingItem).where(
            ClothingItem.id.in_(selected_uuids),
            ClothingItem.user_id == user.id,
        )
    )
    selected_items = selected_result.scalars().all()

    outfit = Outfit(
        user_id=user.id,
        occasion=returned_occasion,
        weather_temp_min=weather.temp_min,
        weather_temp_max=weather.temp_max,
        ai_reasoning=reasoning,
        items=list(selected_items),
    )
    db.add(outfit)
    await db.commit()
    await db.refresh(outfit)

    # Re-fetch with items eagerly loaded so the relationship is accessible
    outfit_result = await db.execute(
        select(Outfit)
        .where(Outfit.id == outfit.id)
        .options(selectinload(Outfit.items))
    )
    return outfit_result.scalar_one()
