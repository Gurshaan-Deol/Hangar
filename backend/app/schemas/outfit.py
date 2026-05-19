"""Pydantic request/response schemas for outfit endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.schemas.clothing_item import ClothingItemResponse


class OutfitBase(BaseModel):
    name: str | None = None
    occasion: str | None = None
    weather_temp_min: float | None = None
    weather_temp_max: float | None = None
    ai_reasoning: str | None = None
    rating: int | None = None


class OutfitUpdate(BaseModel):
    rating: int | None = None
    is_favourite: bool | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class OutfitResponse(OutfitBase):
    id: UUID
    user_id: UUID
    items: list[ClothingItemResponse]
    is_favourite: bool
    wear_count: int
    created_at: datetime
    worn_at: datetime | None = None

    model_config = {"from_attributes": True}


class OutfitListResponse(BaseModel):
    outfits: list[OutfitResponse]
    total: int
    page: int
    limit: int
