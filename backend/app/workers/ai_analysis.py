"""arq background worker — runs AI clothing analysis jobs outside the HTTP request cycle."""

from arq.connections import RedisSettings

from app.config import get_settings

settings = get_settings()


async def analyze_clothing_image(ctx: dict, item_id: str) -> None:
    """Analyse a clothing photo and update the ClothingItem record with extracted metadata.

    Flow:
    1. Load ClothingItem by item_id from the database
    2. Read the image file from UPLOAD_DIR
    3. Call the configured AI provider's analyze_clothing_image()
    4. Persist the returned ClothingAnalysis fields and set status="ready"
    5. On any error: set status="failed" and log the exception
    """
    # TODO: implement the job body described above


class WorkerSettings:
    functions = [analyze_clothing_image]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
