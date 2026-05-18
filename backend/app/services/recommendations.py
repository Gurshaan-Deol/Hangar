"""Outfit recommendation service — matches wardrobe items to current weather conditions."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clothing_item import ClothingItem
from app.models.outfit import Outfit
from app.models.user import User
from app.services.ai.base import get_ai_provider
from app.services.weather import WeatherData

logger = logging.getLogger(__name__)


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
    result = await db.execute(
        select(ClothingItem).where(
            ClothingItem.user_id == user.id,
            ClothingItem.status == "ready",
        )
    )
    items = result.scalars().all()

    if len(items) < 3:
        return {
            "error": "not_enough_items",
            "message": "Add at least 3 clothing items to get recommendations",
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
        weather_temp_min=weather.temperature - 2,
        weather_temp_max=weather.temperature + 2,
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
