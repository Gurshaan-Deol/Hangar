"""Auth router — handles user auto-provisioning after NextAuth OAuth sign-in."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.user import get_or_create_user

router = APIRouter(prefix="/auth", tags=["auth"])


class SyncRequest(BaseModel):
    provider: str
    provider_id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None


@router.post("/sync", response_model=UserResponse)
async def sync_user(body: SyncRequest, db: AsyncSession = Depends(get_db)) -> User:
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
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the profile of the currently authenticated user."""
    return current_user
