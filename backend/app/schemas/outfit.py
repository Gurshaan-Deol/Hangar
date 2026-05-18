"""Pydantic request/response schemas for outfit endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.clothing_item import ClothingItemResponse


class OutfitBase(BaseModel):
    name: str | None = None
    occasion: str | None = None
    weather_temp_min: float | None = None
    weather_temp_max: float | None = None
    ai_reasoning: str | None = None
    rating: int | None = None


class OutfitResponse(OutfitBase):
    id: UUID
    user_id: UUID
    items: list[ClothingItemResponse]
    created_at: datetime
    worn_at: datetime | None = None

    model_config = {"from_attributes": True}


class OutfitListResponse(BaseModel):
    outfits: list[OutfitResponse]
    total: int
    page: int
    limit: int
