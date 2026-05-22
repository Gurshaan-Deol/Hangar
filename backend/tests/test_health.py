import pytest
from unittest.mock import AsyncMock, patch

from app.main import app
from app.dependencies import get_db, get_redis


@pytest.mark.asyncio
async def test_health_returns_200_when_all_healthy(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"
    assert data["redis"] == "healthy"
    assert data["api"] == "healthy"


@pytest.mark.asyncio
async def test_health_returns_503_when_database_down(client, db_session):
    async def broken_db():
        raise Exception("DB connection refused")

    async def _gen():
        # Yield a session that will fail on execute
        from unittest.mock import AsyncMock as AM
        mock_session = AM()
        mock_session.execute = AM(side_effect=Exception("DB connection refused"))
        yield mock_session

    app.dependency_overrides[get_db] = _gen
    try:
        response = await client.get("/api/v1/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unhealthy"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_health_returns_503_when_redis_down(client):
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(side_effect=Exception("Redis connection refused"))

    async def broken_redis():
        return mock_redis

    app.dependency_overrides[get_redis] = broken_redis
    try:
        response = await client.get("/api/v1/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["redis"] == "unhealthy"
    finally:
        app.dependency_overrides.pop(get_redis, None)
