from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


def _to_asyncpg(url: str) -> str:
    """Convert standard postgresql:// or postgres:// URL to postgresql+asyncpg://."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TripRadar API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/trigradar"
    )
    WAREHOUSE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/trigradar_dw"
    )

    @field_validator("DATABASE_URL", "WAREHOUSE_URL", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        return _to_asyncpg(v)

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Auth
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "exp://localhost:8081",
    ]

    # External APIs
    AMADEUS_CLIENT_ID: str = ""
    AMADEUS_CLIENT_SECRET: str = ""
    AMADEUS_ENV: str = "test"
    OPENWEATHER_API_KEY: str = ""
    HOSTELWORLD_API_KEY: str = ""

    # Firebase (FCM)
    FIREBASE_CREDENTIALS_JSON: str = ""

    # Email
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "alertes@trigradar.fr"

    # Internal (Airflow → API)
    INTERNAL_API_TOKEN: str = "change-me-internal-token"

    class Config:
        env_file = "../../.env"   # local dev — ignored if file not found
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
