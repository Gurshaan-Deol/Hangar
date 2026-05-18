import pytest
import uuid

from app.main import app


@pytest.mark.asyncio
async def test_get_clothing_requires_auth(client):
    response = await client.get("/api/v1/clothing")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_clothing_returns_empty_list(client, db_session, mock_current_user):
    from app.dependencies import get_current_user

    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    response = await client.get("/api/v1/clothing")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_upload_rejects_non_image(client, db_session, mock_current_user, tmp_path):
    from app.dependencies import get_current_user

    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    fake_file = tmp_path / "document.pdf"
    fake_file.write_bytes(b"not an image")

    with open(fake_file, "rb") as f:
        response = await client.post(
            "/api/v1/clothing/upload",
            files={"image": ("document.pdf", f, "application/pdf")},
        )

    # application/pdf fails the content-type check before the extension check → 415
    assert response.status_code == 415
    assert "not allowed" in response.json()["detail"].lower()

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_upload_rejects_bad_extension(client, db_session, mock_current_user, tmp_path):
    """Extension check (400) fires when content-type is valid but filename extension is not."""
    from app.dependencies import get_current_user

    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    fake_file = tmp_path / "photo.bmp"
    fake_file.write_bytes(b"\xff\xd8\xff")  # JPEG magic bytes

    with open(fake_file, "rb") as f:
        response = await client.post(
            "/api/v1/clothing/upload",
            files={"image": ("photo.bmp", f, "image/jpeg")},
        )

    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_get_clothing_item_404_for_other_user(client, db_session, mock_current_user):
    from app.dependencies import get_current_user
    from app.models.clothing_item import ClothingItem

    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    db_session.add(mock_current_user)
    await db_session.commit()

    # Item owned by a different user — no FK enforcement in SQLite by default
    other_item = ClothingItem(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        image_path="/uploads/other/image.jpg",
        status="ready",
    )
    db_session.add(other_item)
    await db_session.commit()

    response = await client.get(f"/api/v1/clothing/{other_item.id}")
    assert response.status_code == 404

    app.dependency_overrides.pop(get_current_user, None)
