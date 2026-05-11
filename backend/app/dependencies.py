"""FastAPI dependency injection: database session and authenticated current user."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db

_bearer = HTTPBearer()
settings = get_settings()


async def get_current_user_email(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Verify the NextAuth JWT and return the authenticated user's email."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.nextauth_secret, algorithms=["HS256"])
        email: str | None = payload.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token does not contain a valid email",
            )
        return email
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


# Re-export get_db so routers only need to import from dependencies
__all__ = ["get_db", "get_current_user_email"]
