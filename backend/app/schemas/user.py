"""Pydantic request/response schemas for user endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


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
    weather_lat: float | None = None
    weather_lon: float | None = None

    model_config = {"from_attributes": True}


class UserUpdateLocation(BaseModel):
    weather_lat: float
    weather_lon: float

    @field_validator("weather_lat")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("weather_lon")
    @classmethod
    def validate_lon(cls, v: float) -> float:
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v
