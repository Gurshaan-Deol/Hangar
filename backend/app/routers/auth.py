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


# SECURITY NOTE: This endpoint is intentionally unauthenticated.
# It is called server-side by NextAuth.js immediately after OAuth completes.
# The trust model relies on:
#   1. NEXTAUTH_SECRET being kept private (tokens are HS256-signed with it)
#   2. Rate limiting (20/min per IP) to prevent spam account creation
#   3. The endpoint only being called from the Next.js server, not the browser
# A production hardening option would be to require a shared secret header
# (e.g. X-Internal-Secret) that only the Next.js server knows.
# This is documented as a known tradeoff for self-hosted deployments.
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
@limiter.limit("30/minute")
async def update_location(
    request: Request,
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
