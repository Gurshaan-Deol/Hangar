"""Health check endpoint — verifies API, database, and Redis connectivity."""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> JSONResponse:
    checks: dict[str, str] = {"api": "healthy", "database": "unknown", "redis": "unknown"}
    status_code = 200

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception:
        logger.exception("Health check: database unreachable")
        checks["database"] = "unhealthy"
        status_code = 503

    try:
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception:
        logger.exception("Health check: Redis unreachable")
        checks["redis"] = "unhealthy"
        status_code = 503

    checks["status"] = "healthy" if status_code == 200 else "degraded"
    return JSONResponse(content=checks, status_code=status_code)
