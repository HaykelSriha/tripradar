from typing import List

from pydantic_settings import BaseSettings


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

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Auth
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — Next.js dev + Expo
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "exp://localhost:8081",
    ]

    # External APIs — Amadeus (replaces Kiwi Tequila)
    AMADEUS_CLIENT_ID: str = ""
    AMADEUS_CLIENT_SECRET: str = ""
    AMADEUS_ENV: str = "test"           # "test" (sandbox) or "production"
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
        env_file = "../../.env"   # project root when running from apps/api/
        env_file_encoding = "utf-8"
        extra = "ignore"          # .env has fields for other services (Airflow, Next.js)


settings = Settings()
