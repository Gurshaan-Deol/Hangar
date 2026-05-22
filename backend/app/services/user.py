"""User service — look up and auto-provision OAuth users."""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_or_create_user(
    db: AsyncSession,
    *,
    provider: str,
    provider_id: str,
    email: str,
    name: str | None,
    avatar_url: str | None,
) -> User:
    """Return the user for this OAuth identity, creating them if they don't exist yet.

    On every login we refresh name and avatar_url since those can change on the provider side.
    Concurrent sign-ins for the same new user are handled by catching IntegrityError on INSERT
    and falling back to a SELECT, which avoids the TOCTOU race of check-then-insert.
    """
    result = await db.execute(
        select(User).where(User.provider == provider, User.provider_id == provider_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Same email, different OAuth provider — treat as the same account
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user:
        user.name = name
        user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
        return user

    # New user — handle concurrent sign-ins via IntegrityError retry
    try:
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            provider=provider,
            provider_id=provider_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError:
        await db.rollback()
        # A concurrent request already created this user — fetch and update them
        result = await db.execute(
            select(User).where(User.provider == provider, User.provider_id == provider_id)
        )
        user = result.scalar_one()
        user.name = name
        user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
        return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Return a user by primary key, or None if not found."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
