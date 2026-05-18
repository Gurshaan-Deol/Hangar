import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import AsyncMock

# ---------------------------------------------------------------------------
# SQLite compatibility: patch PostgreSQL-specific DDL types so that
# Base.metadata.create_all works against an in-memory SQLite engine.
# ARRAY becomes TEXT; UUID becomes CHAR(36). Result/bind processors handle
# None values (the only values stored in tests) without needing any changes.
# ---------------------------------------------------------------------------
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler  # noqa: E402


def _sqlite_visit_ARRAY(self, type_, **kw):
    return "TEXT"


def _sqlite_visit_UUID(self, type_, **kw):
    return "CHAR(36)"


SQLiteTypeCompiler.visit_ARRAY = _sqlite_visit_ARRAY
SQLiteTypeCompiler.visit_UUID = _sqlite_visit_UUID

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
from app.main import app
from app.database import Base, get_db
from app.dependencies import get_redis

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.setex = AsyncMock(return_value=True)
    mock_redis.enqueue_job = AsyncMock(return_value=True)

    async def override_get_db():
        yield db_session

    async def override_get_redis():
        return mock_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def mock_current_user():
    from app.models.user import User
    import uuid
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        provider="github",
        provider_id="12345",
    )
