"""Auth router — handles user auto-provisioning after NextAuth OAuth sign-in."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateLocation
from app.services.user import get_or_create_user

router = APIRouter(prefix="/auth", tags=["auth"])


class SyncRequest(BaseModel):
    provider: str
    provider_id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None


@router.post("/sync", response_model=UserResponse)
@limiter.limit("20/minute")
async def sync_user(
    request: Request,
    body: SyncRequest,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Called by the frontend immediately after OAuth login succeeds.

    Creates the user in our database if they don't exist yet, or updates their
    profile fields if they do. No auth token required — this is how the account
    gets bootstrapped.
    """
    return await get_or_create_user(
        db,
        provider=body.provider,
        provider_id=body.provider_id,
        email=body.email,
        name=body.name,
        avatar_url=body.avatar_url,
    )


@router.get("/me", response_model=UserResponse)
@limiter.limit("60/minute")
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> User:
    """Return the profile of the currently authenticated user."""
    return current_user


@router.patch("/location", response_model=UserResponse)
async def update_location(
    body: UserUpdateLocation,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Update the current user's preferred weather location."""
    current_user.weather_lat = body.weather_lat
    current_user.weather_lon = body.weather_lon
    await db.commit()
    await db.refresh(current_user)
    return current_user
