"""Pydantic request/response schemas for clothing item endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ClothingItemBase(BaseModel):
    name: str | None = None
    category: str | None = None
    color: str | None = None
    style: str | None = None
    season: list[str] | None = None
    tags: list[str] | None = None
    notes: str | None = None


class ClothingItemCreate(ClothingItemBase):
    pass


class ClothingItemUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    category: str | None = None
    color: str | None = None
    style: str | None = None
    season: list[str] | None = None
    tags: list[str] | None = None
    notes: str | None = None


class ClothingItemResponse(ClothingItemBase):
    id: UUID
    user_id: UUID
    image_url: str | None = None
    status: str
    duplicate_of: UUID | None = None
    duplicate_confidence: float | None = None
    duplicate_reason: str | None = None
    dismissed_duplicate: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class ClothingItemStatusResponse(BaseModel):
    id: UUID
    status: str
    name: str | None = None

    model_config = {"from_attributes": True}


class ClothingItemListResponse(BaseModel):
    items: list[ClothingItemResponse]
    total: int
    page: int
    limit: int
