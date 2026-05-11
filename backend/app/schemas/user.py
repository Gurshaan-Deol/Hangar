"""Pydantic request/response schemas for user endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    name: str | None = None
    avatar_url: str | None = None


class UserCreate(UserBase):
    provider: str
    provider_id: str


class UserResponse(UserBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
