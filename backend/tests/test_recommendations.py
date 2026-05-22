"""Tests for the recommendations endpoints."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.main import app
from app.dependencies import get_current_user
from app.models.clothing_item import ClothingItem
from app.models.user import User
from app.services.weather import WeatherData
from datetime import datetime, timezone


def _make_user() -> User:
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        provider="github",
        provider_id="gh_test",
    )


def _make_ready_item(user_id, category="shirt") -> ClothingItem:
    return ClothingItem(
        id=uuid.uuid4(),
        user_id=user_id,
        image_path="/tmp/img.jpg",
        status="ready",
        category=category,
        color="blue",
        style="casual",
        name=f"Test {category}",
    )


def _mock_weather() -> WeatherData:
    return WeatherData(
        temperature=18.0,
        feels_like=16.0,
        condition="clear",
        humidity=60,
        wind_speed=10.0,
        is_daytime=True,
        location="43.7,-79.4",
        fetched_at=datetime.now(timezone.utc),
        temp_max=22.0,
        temp_min=14.0,
    )


@pytest.mark.asyncio
async def test_weather_endpoint_returns_data(client, db_session, mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    weather = _mock_weather()
    with patch("app.routers.recommendations.get_current_weather", new_callable=AsyncMock) as mock_w:
        mock_w.return_value = weather
        response = await client.get("/api/v1/recommendations/weather")

    assert response.status_code == 200
    data = response.json()
    assert data["temperature"] == 18.0
    assert data["condition"] == "clear"
    assert data["is_daytime"] is True

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_recommendations_returns_400_with_no_items(client, db_session, mock_current_user):
    """No ready items → 400 not_enough_items.

    get_relevant_items uses PostgreSQL-specific .overlap() which SQLite can't parse,
    so we mock it to return an empty list and verify the router-level 400 logic.
    """
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    weather = _mock_weather()
    with (
        patch("app.routers.recommendations.get_current_weather", new_callable=AsyncMock) as mock_w,
        patch("app.services.recommendations.get_relevant_items", new_callable=AsyncMock) as mock_items,
    ):
        mock_w.return_value = weather
        mock_items.return_value = []
        response = await client.post("/api/v1/recommendations", json={})

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "not_enough_items"

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_recommendations_returns_400_with_two_ready_items(client, db_session, mock_current_user):
    """Only 2 ready items (need 3) → 400 not_enough_items."""
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    item1 = _make_ready_item(mock_current_user.id, "shirt")
    item2 = _make_ready_item(mock_current_user.id, "pants")

    weather = _mock_weather()
    with (
        patch("app.routers.recommendations.get_current_weather", new_callable=AsyncMock) as mock_w,
        patch("app.services.recommendations.get_relevant_items", new_callable=AsyncMock) as mock_items,
    ):
        mock_w.return_value = weather
        mock_items.return_value = [item1, item2]
        response = await client.post("/api/v1/recommendations", json={})

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "not_enough_items"
    assert detail["current_count"] == 2

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_outfit_history_empty(client, db_session, mock_current_user):
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    response = await client.get("/api/v1/recommendations/history")
    assert response.status_code == 200
    data = response.json()
    assert data["outfits"] == []
    assert data["total"] == 0

    app.dependency_overrides.pop(get_current_user, None)
