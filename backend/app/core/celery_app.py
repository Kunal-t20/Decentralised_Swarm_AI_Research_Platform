from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "swarm_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Standard celery configuration options
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
