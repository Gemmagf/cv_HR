"""
Configuració central de CV Hunter
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "CV Hunter"
    APP_ENV: str = "development"
    SECRET_KEY: str = "canvia-aquesta-clau-en-produccio"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Base de dades
    DATABASE_URL: str = "postgresql+asyncpg://cvhunter:cvhunter@localhost:5432/cvhunter"

    # Redis (cua de tasques)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Anthropic (IA per parsing i matching)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-5"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Upload
    MAX_CV_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "/tmp/cvhunter_uploads"

    # Multi-tenant
    DEFAULT_TENANT_PLAN: str = "starter"  # starter | professional | enterprise

    # Free trial
    FREE_TRIAL_CV_LIMIT: int = 50
    FREE_TRIAL_DAYS: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
