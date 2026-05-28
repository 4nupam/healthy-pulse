"""
Antigravity Food Scanner — Configuration Management
=====================================================
Centralized settings via pydantic-settings with .env file support.
All environment variables are loaded here with safe development defaults.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/food_scanner"
    )

    # ── AI / Model ───────────────────────────────────────────────────────
    MODEL_PATH: str = "./models/food_detector.onnx"
    CONFIDENCE_THRESHOLD: float = 0.45

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["*"]

    # ── Server ───────────────────────────────────────────────────────────
    APP_NAME: str = "Antigravity Food Scanner"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False


# Singleton settings instance — imported across the application
settings = Settings()
