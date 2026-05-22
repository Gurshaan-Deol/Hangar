from functools import lru_cache
from typing import Literal

from pydantic import ValidationInfo, field_validator
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

    # AI provider — order matters: ai_provider must be defined before ai_api_key
    # so the api key validator can read it from info.data
    ai_provider: Literal["openai", "google", "ollama"] = "ollama"
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

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]
    frontend_url: str = "http://localhost:3000"

    @field_validator("database_url")
    @classmethod
    def database_url_must_be_set(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL is required")
        return v

    @field_validator("nextauth_secret")
    @classmethod
    def nextauth_secret_must_be_set(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError(
                "NEXTAUTH_SECRET must be at least 32 characters for HS256 security. "
                "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
            )
        return v

    @field_validator("ai_api_key")
    @classmethod
    def ai_api_key_must_be_set(cls, v: str, info: ValidationInfo) -> str:
        provider = info.data.get("ai_provider")
        if provider in ["openai", "google"] and (not v or v == "your-api-key-here"):
            raise ValueError(f"AI_API_KEY is required when AI_PROVIDER is {provider}")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
