import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import get_db, redis_client
from app.services.qdrant_service import qdrant_client

router = APIRouter()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    health_status = {"status": "healthy", "services": {}}

    # 1. Check Postgres
    try:
        db.execute(text("SELECT 1"))
        health_status["services"]["postgres"] = "online"
    except Exception as e:
        health_status["services"]["postgres"] = f"offline: {e}"
        health_status["status"] = "unhealthy"

    # 2. Check Redis
    try:
        if redis_client.ping():
            health_status["services"]["redis"] = "online"
        else:
            health_status["services"]["redis"] = "offline"
            health_status["status"] = "unhealthy"
    except Exception as e:
        health_status["services"]["redis"] = f"offline: {e}"
        health_status["status"] = "unhealthy"

    # 3. Check Qdrant
    try:
        qdrant_client.get_collections()
        health_status["services"]["qdrant"] = "online"
    except Exception as e:
        health_status["services"]["qdrant"] = f"offline: {e}"
        health_status["status"] = "unhealthy"

    # 4. Check Celery Broker
    try:
        conn = celery_app.connection()
        conn.connect()
        conn.release()
        health_status["services"]["celery_broker"] = "online"
    except Exception as e:
        health_status["services"]["celery_broker"] = f"offline: {e}"
        health_status["status"] = "unhealthy"

    # 5. Check Ollama
    if settings.OLLAMA_BASE_URL:
        try:
            response = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=2.0)
            if response.status_code == 200:
                health_status["services"]["ollama"] = "online"
            else:
                health_status["services"]["ollama"] = (
                    f"offline (status {response.status_code})"
                )
                health_status["status"] = "unhealthy"
        except Exception as e:
            health_status["services"]["ollama"] = f"offline: {e}"
            health_status["status"] = "unhealthy"
    else:
        health_status["services"]["ollama"] = "disabled"

    if health_status["status"] == "unhealthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_status,
        )

    return health_status
