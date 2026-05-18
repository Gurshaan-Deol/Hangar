"""Clothing router — CRUD for wardrobe items and photo upload."""

import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from redis.asyncio import Redis
from sqlalchemy import delete as sql_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies import get_current_user, get_db, get_redis
from app.models.clothing_item import ClothingItem
from app.models.outfit import outfit_items as outfit_items_table
from app.models.user import User
from app.schemas.clothing_item import (
    ClothingItemDetailsUpdate,
    ClothingItemListResponse,
    ClothingItemResponse,
    ClothingItemStatusResponse,
    ClothingItemUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clothing", tags=["clothing"])
settings = get_settings()

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


async def _get_owned_item(
    item_id: uuid.UUID, user: User, db: AsyncSession
) -> ClothingItem:
    """Fetch a ClothingItem that belongs to the given user, or raise 404."""
    result = await db.execute(
        select(ClothingItem).where(
            ClothingItem.id == item_id, ClothingItem.user_id == user.id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.get("", response_model=ClothingItemListResponse)
async def list_clothing(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClothingItemListResponse:
    """Return a paginated list of the current user's clothing items."""
    query = select(ClothingItem).where(ClothingItem.user_id == current_user.id)
    if category:
        query = query.where(ClothingItem.category == category)
    if status:
        query = query.where(ClothingItem.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * limit
    items_result = await db.execute(query.offset(offset).limit(limit))
    items = list(items_result.scalars().all())

    return ClothingItemListResponse(items=items, total=total, page=page, limit=limit)


@router.post("/upload", response_model=ClothingItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_clothing(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> ClothingItem:
    """Upload a clothing photo, create a pending item, and enqueue AI analysis."""
    if image.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File type not allowed. Accepted: jpeg, png, webp",
        )

    suffix = Path(image.filename or "").suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Upload a JPG, PNG, or WebP image.",
        )

    contents = await image.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB",
        )

    item_id = uuid.uuid4()
    user_dir = Path(settings.upload_dir) / str(current_user.id)
    filename = f"{item_id}{suffix}"
    file_path = user_dir / filename

    try:
        user_dir.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(contents)
    except OSError as exc:
        logger.error("Failed to save uploaded image to %s: %s", file_path, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save image. Please try again.",
        ) from exc

    image_url = f"/uploads/{current_user.id}/{filename}"
    item = ClothingItem(
        id=item_id,
        user_id=current_user.id,
        image_path=str(file_path),
        image_url=image_url,
        status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    try:
        await redis.enqueue_job("analyze_clothing_image", str(item.id))
    except Exception as e:
        logger.error("Failed to enqueue analysis job for item %s: %s", item.id, e)
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass
        await db.delete(item)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Upload service temporarily unavailable. Please try again.",
        )

    return item


@router.get("/{item_id}/status", response_model=ClothingItemStatusResponse)
async def get_clothing_item_status(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClothingItem:
    """Lightweight polling endpoint — returns only id, status, and name."""
    return await _get_owned_item(item_id, current_user, db)


@router.get("/{item_id}", response_model=ClothingItemResponse)
async def get_clothing_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClothingItem:
    """Return a single clothing item owned by the current user."""
    return await _get_owned_item(item_id, current_user, db)


@router.patch("/{item_id}", response_model=ClothingItemResponse)
async def update_clothing_item(
    item_id: uuid.UUID,
    body: ClothingItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClothingItem:
    """Partially update a clothing item (only provided fields are changed)."""
    item = await _get_owned_item(item_id, current_user, db)

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}/details", response_model=ClothingItemResponse)
async def update_clothing_details(
    item_id: uuid.UUID,
    body: ClothingItemDetailsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClothingItem:
    """Manually set clothing item details and force status to 'ready'.

    This is the manual fallback for when AI analysis fails or produces bad results.
    Unlike the general PATCH endpoint, this always marks the item as ready.
    """
    item = await _get_owned_item(item_id, current_user, db)

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)

    item.status = "ready"

    await db.commit()
    await db.refresh(item)
    return item


@router.post("/{item_id}/dismiss-duplicate", response_model=ClothingItemResponse)
async def dismiss_duplicate(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClothingItem:
    """Mark a duplicate warning as dismissed (user wants to keep both items)."""
    item = await _get_owned_item(item_id, current_user, db)
    item.dismissed_duplicate = True
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}")
async def delete_clothing_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a clothing item and its image file from disk."""
    item = await _get_owned_item(item_id, current_user, db)

    image_path = item.image_path

    # Remove join-table rows first — outfit_items has a FK to clothing_items
    # with no CASCADE, so deleting the item directly would violate the constraint.
    await db.execute(
        sql_delete(outfit_items_table).where(
            outfit_items_table.c.clothing_item_id == item.id
        )
    )

    await db.delete(item)
    await db.commit()

    if image_path and os.path.exists(image_path):
        os.remove(image_path)

    return {"message": "Item deleted"}


@router.get("/{item_id}/image")
async def get_clothing_image(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Serve the raw image file for a clothing item (ownership verified)."""
    item = await _get_owned_item(item_id, current_user, db)

    if not item.image_path or not os.path.exists(item.image_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image file not found on disk"
        )

    resolved = Path(item.image_path).resolve()
    upload_dir = Path(settings.upload_dir).resolve()
    if not str(resolved).startswith(str(upload_dir)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return FileResponse(item.image_path)
