from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.db.session import get_db

router = APIRouter()

@router.get("/health", summary="Health Check")
def health_check():
    return {
        "status": "healthy",
        "service": "Demand Decision Intelligence API",
        "version": "1.0.0"
    }

@router.get("/health/db", summary="Database Connection Health Check")
def database_health_check(db: Session = Depends(get_db)):
    try:
        query = text("SELECT current_database(), current_user, inet_server_port(), version();")
        result = db.execute(query).fetchone()
        return {
            "status": "connected",
            "database": result[0],
            "user": result[1],
            "port": result[2],
            "postgres_version": result[3]
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e)
        }
