import pytest


@pytest.mark.asyncio
async def test_auth_sync_creates_new_user(client, db_session):
    payload = {
        "provider": "github",
        "provider_id": "gh_123",
        "email": "newuser@example.com",
        "name": "New User",
        "avatar_url": None,
    }
    response = await client.post("/api/v1/auth/sync", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["name"] == "New User"
    assert "id" in data


@pytest.mark.asyncio
async def test_auth_sync_returns_existing_user(client, db_session):
    payload = {
        "provider": "github",
        "provider_id": "gh_123",
        "email": "existing@example.com",
        "name": "Original Name",
        "avatar_url": None,
    }
    await client.post("/api/v1/auth/sync", json=payload)
    payload["name"] = "Updated Name"
    response = await client.post("/api/v1/auth/sync", json=payload)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_auth_sync_updates_name_on_repeat_login(client, db_session):
    payload = {
        "provider": "google",
        "provider_id": "g_456",
        "email": "user@gmail.com",
        "name": "Old Name",
        "avatar_url": None,
    }
    first = await client.post("/api/v1/auth/sync", json=payload)
    first_id = first.json()["id"]
    payload["name"] = "New Name"
    second = await client.post("/api/v1/auth/sync", json=payload)
    assert second.json()["id"] == first_id
    assert second.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_auth_me_requires_auth(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
