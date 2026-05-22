"""Pydantic request/response schemas for clothing item endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, computed_field


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


class ClothingItemDetailsUpdate(BaseModel):
    """Manual override schema — same fields as ClothingItemUpdate, but the endpoint
    always forces status to 'ready' regardless of the item's current status."""

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
    status: str
    attempt_count: int = 0
    duplicate_of: UUID | None = None
    duplicate_confidence: float | None = None
    duplicate_reason: str | None = None
    dismissed_duplicate: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def image_endpoint(self) -> str:
        return f"/api/v1/clothing/{self.id}/image"


class ClothingItemStatusResponse(BaseModel):
    id: UUID
    status: str
    name: str | None = None
    attempt_count: int = 0

    model_config = {"from_attributes": True}


class ClothingItemListResponse(BaseModel):
    items: list[ClothingItemResponse]
    total: int
    page: int
    limit: int
