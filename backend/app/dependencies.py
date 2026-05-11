"""FastAPI dependency injection: database session and authenticated current user."""

import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# auto_error=False so we can return a clearer 401 instead of a 403 when the
# Authorization header is missing entirely.
_bearer = HTTPBearer(auto_error=False)
settings = get_settings()


async def get_current_user_email(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Verify the NextAuth JWT and return the authenticated user's email."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.nextauth_secret, algorithms=["HS256"])
        email: str | None = payload.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            )
        return email
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please sign in again.",
        ) from exc
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from exc


async def get_current_user(
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the JWT email to a database User, or 401 if the account is missing."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please sign in again.",
        )
    return user


async def get_arq_pool(request: Request):
    """Return the arq Redis pool stored on app state at startup."""
    return request.app.state.arq_pool


__all__ = ["get_db", "get_current_user", "get_arq_pool"]
