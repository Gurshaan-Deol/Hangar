"""FastAPI dependency injection: database session and authenticated current user."""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User

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


async def get_current_user(
    email: str = Depends(get_current_user_email),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the JWT email to a database User, or 401 if they haven't synced yet."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — call POST /api/v1/auth/sync first",
        )
    return user


async def get_arq_pool(request: Request):
    """Return the arq Redis pool stored on app state at startup."""
    return request.app.state.arq_pool


__all__ = ["get_db", "get_current_user", "get_arq_pool"]
