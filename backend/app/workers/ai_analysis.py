"""arq background worker — runs AI clothing analysis jobs outside the HTTP request cycle."""

import asyncio
import dataclasses
import json
import logging
import os
import uuid
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageStat
from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.clothing_item import ClothingItem
from app.services.ai.base import BaseAIProvider, ClothingAnalysis, get_ai_provider
from app.services.background_removal import remove_background

logging.basicConfig(level=logging.INFO, force=True)
logger = logging.getLogger(__name__)
settings = get_settings()


def preprocess_image(image_path: str) -> str:
    """Preprocess a clothing image before AI analysis.

    - Converts to RGB (strips alpha channel)
    - Resizes so the longest dimension is at most 1024px, preserving aspect ratio
    - Applies a sharpening filter
    - Boosts brightness by 1.3× when the mean pixel value is below 80

    Saves the result as a sibling file with a ``_processed.jpg`` suffix and
    returns its path.  The caller is responsible for deleting the file when done.
    """
    img = Image.open(image_path).convert("RGB")

    w, h = img.size
    max_dim = 1024
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img = img.filter(ImageFilter.SHARPEN)

    stat = ImageStat.Stat(img)
    mean_brightness = sum(stat.mean) / len(stat.mean)
    if mean_brightness < 80:
        img = ImageEnhance.Brightness(img).enhance(1.3)

    processed_path = str(Path(image_path).with_suffix("")) + "_processed.jpg"
    img.save(processed_path, "JPEG", quality=95)
    return processed_path


async def analyze_with_retry(
    provider: BaseAIProvider,
    image_path: str,
    max_attempts: int = 3,
) -> ClothingAnalysis:
    """Run AI clothing analysis with automatic retries on any failure.

    Sleeps 2 seconds between attempts.  Logs a warning before the final retry
    to indicate the model is struggling.
    """
    for attempt in range(1, max_attempts + 1):
        logger.info("Analysis attempt %d/%d for %s", attempt, max_attempts, image_path)
        try:
            return await provider.analyze_clothing_image(image_path)
        except Exception as exc:
            logger.error(
                "Analysis attempt %d/%d failed for %s: %s",
                attempt, max_attempts, image_path, exc,
            )
            if attempt == max_attempts:
                raise
            if attempt == 2:
                logger.warning(
                    "Model is struggling with item at %s — retrying one more time", image_path
                )
            await asyncio.sleep(2)

    # Unreachable, but satisfies type checkers.
    raise RuntimeError("analyze_with_retry: exhausted attempts without raising")


async def on_startup(ctx: dict) -> None:
    logger.info("Hangar worker starting up")
    provider = get_ai_provider()
    healthy = await provider.health_check()
    if healthy:
        logger.info("AI provider health check passed: %s", type(provider).__name__)
    else:
        logger.warning(
            "AI provider health check FAILED — analysis jobs may fail: %s",
            type(provider).__name__,
        )


async def on_shutdown(ctx: dict) -> None:
    logger.info("Hangar worker shutting down")


async def analyze_clothing_image(ctx: dict, item_id: str) -> None:
    """Analyse a clothing photo and update the ClothingItem record with extracted metadata.

    Flow:
    1. Load ClothingItem by item_id from the database
    2. Set status="analyzing" and commit
    3. Remove background (rembg)
    4. Preprocess image (resize, sharpen, brightness)
    5. Call the configured AI provider via analyze_with_retry (up to 3 attempts)
    6. Persist the returned ClothingAnalysis fields and set status="ready"
    7. On any error: set status="failed", store the traceback, re-raise
    """
    item_uuid = uuid.UUID(item_id)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ClothingItem).where(ClothingItem.id == item_uuid)
        )
        item = result.scalar_one_or_none()

        if not item:
            logger.warning("ClothingItem %s not found — skipping analysis", item_id)
            return

        try:
            item.status = "analyzing"
            await db.commit()

            cleaned_path = await asyncio.to_thread(remove_background, item.image_path)
            if cleaned_path != item.image_path:
                item.image_path = cleaned_path
                item.image_url = f"/uploads/{item.user_id}/{Path(cleaned_path).name}"
                await db.commit()

            provider = get_ai_provider()

            processed_path = await asyncio.to_thread(preprocess_image, cleaned_path)
            try:
                analysis = await analyze_with_retry(provider, processed_path)
            finally:
                if processed_path != cleaned_path and os.path.exists(processed_path):
                    os.unlink(processed_path)

            item.name = analysis.name
            item.category = analysis.category
            item.color = analysis.color
            item.style = analysis.style
            item.season = analysis.season
            item.tags = analysis.tags
            item.ai_raw_response = json.dumps(dataclasses.asdict(analysis))

            # Duplicate detection — query other ready items in the same category
            existing_result = await db.execute(
                select(ClothingItem).where(
                    ClothingItem.user_id == item.user_id,
                    ClothingItem.status == "ready",
                    ClothingItem.id != item_uuid,
                    ClothingItem.category == analysis.category,
                )
            )
            existing_items = existing_result.scalars().all()

            if existing_items:
                candidates = [
                    {
                        "id": str(e.id),
                        "name": e.name,
                        "category": e.category,
                        "color": e.color,
                        "tags": e.tags or [],
                    }
                    for e in existing_items[:5]
                ]
                new_item_data = {
                    "name": analysis.name,
                    "category": analysis.category,
                    "color": analysis.color,
                    "tags": analysis.tags or [],
                }
                try:
                    dup = await provider.check_duplicate(new_item_data, candidates)
                    if dup.get("duplicate_found") and float(dup.get("confidence", 0)) > 0.8:
                        dup_id_str = dup.get("duplicate_id")
                        if dup_id_str:
                            try:
                                item.duplicate_of = uuid.UUID(str(dup_id_str))
                                item.duplicate_confidence = float(dup.get("confidence", 0))
                                item.duplicate_reason = dup.get("reason", "")
                                logger.info(
                                    "Duplicate detected for item %s → %s (confidence %.2f)",
                                    item_id, dup_id_str, item.duplicate_confidence,
                                )
                            except ValueError:
                                logger.warning(
                                    "AI returned invalid duplicate_id %r for item %s",
                                    dup_id_str, item_id,
                                )
                except Exception:
                    logger.exception(
                        "Duplicate check failed for item %s — skipping", item_id
                    )

            item.status = "ready"
            await db.commit()

            logger.info("Analysis complete for item %s: %s", item_id, analysis.name)

        except Exception as exc:
            logger.exception("Analysis failed for item %s", item_id)
            try:
                await db.rollback()
                refetch = await db.execute(
                    select(ClothingItem).where(ClothingItem.id == item_uuid)
                )
                failed_item = refetch.scalar_one_or_none()
                if failed_item:
                    failed_item.status = "failed"
                    failed_item.ai_raw_response = str(exc)
                    await db.commit()
            except Exception:
                logger.exception(
                    "Failed to persist failure status for item %s", item_id
                )
            raise


class WorkerSettings:
    functions = [analyze_clothing_image]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300
    keep_result = 3600
    on_startup = on_startup
    on_shutdown = on_shutdown
    retry_jobs = True
    max_tries = 2
