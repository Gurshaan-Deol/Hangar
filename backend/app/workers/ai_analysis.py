"""arq background worker — runs AI clothing analysis jobs outside the HTTP request cycle."""

import asyncio
import dataclasses
import json
import logging
import uuid
from pathlib import Path

import httpx
from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.clothing_item import ClothingItem
from app.services.ai.base import get_ai_provider
from app.services.background_removal import remove_background

logging.basicConfig(level=logging.INFO, force=True)
logger = logging.getLogger(__name__)
settings = get_settings()


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
    3. Call the configured AI provider's analyze_clothing_image()
    4. Persist the returned ClothingAnalysis fields and set status="ready"
    5. On any error: set status="failed", store the traceback, re-raise
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
            _retry_delays = [10, 30, 60]
            analysis = None
            for attempt, delay in enumerate([0] + _retry_delays, start=1):
                if delay:
                    logger.warning(
                        "Item %s: rate-limited by AI provider, retrying in %ds (attempt %d/%d)",
                        item_id, delay, attempt, len(_retry_delays) + 1,
                    )
                    await asyncio.sleep(delay)
                try:
                    analysis = await provider.analyze_clothing_image(cleaned_path)
                    break
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code == 429 and attempt <= len(_retry_delays):
                        continue
                    raise

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
    job_timeout = 300  # up to 100s of retry sleep + AI call time
    keep_result = 3600
    on_startup = on_startup
    on_shutdown = on_shutdown
