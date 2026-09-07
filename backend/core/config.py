from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path

# Look for .env file either in backend/.env or root .env
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Demand Decision Intelligence"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "super-secret-development-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:yash@localhost:5432/demand_decision_db"

    class Config:
        case_sensitive = True
        env_file = str(ENV_FILE)
        extra = "allow"

settings = Settings()
