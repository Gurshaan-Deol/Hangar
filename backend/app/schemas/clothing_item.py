"""Pydantic request/response schemas for clothing item endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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
