from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Auth
    nextauth_secret: str

    # Database
    database_url: str

    # Redis
    redis_url: str

    # OAuth providers
    github_client_id: str = ""
    github_client_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""

    # AI provider
    ai_provider: str = "openai"
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_vision_model: str = ""
    ai_text_model: str = ""

    # Storage
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 10

    # Weather (Open-Meteo — no key required)
    weather_lat: float = 0.0
    weather_lon: float = 0.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
