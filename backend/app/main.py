import logging

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import auth, clothing, health, recommendations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(title="Hangar API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(clothing.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Hangar API starting up")
    app.state.arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    logger.info("arq Redis pool connected")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await app.state.arq_pool.close()
    logger.info("arq Redis pool closed")
