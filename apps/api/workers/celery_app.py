"""Celery application configuration."""

from celery import Celery

from config import settings

celery_app = Celery(
    "trigradar",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["workers.alert_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Paris",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "workers.alert_worker.process_new_deals": {"queue": "alerts"},
    },
)
