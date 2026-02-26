"""
Celery task: process new deals and dispatch alerts.

Can be called directly from Airflow via the /internal/process-alerts HTTP
endpoint, or invoked as a Celery task for async processing.
"""

import asyncio
import logging

from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_new_deals(self, deals: list[dict]) -> dict:
    """
    Celery task: match a list of deals against user preferences and dispatch alerts.

    Args:
        deals: list of deal dicts from gold_deals (same shape as DealResponse)

    Returns:
        dict with keys: deals_processed, alerts_sent, errors
    """
    logger.info("Celery task process_new_deals: %d deals", len(deals))

    try:
        return asyncio.run(_run_matching(deals))
    except Exception as exc:
        logger.error("process_new_deals failed: %s", exc)
        raise self.retry(exc=exc)


async def _run_matching(deals: list[dict]) -> dict:
    """Runs the async alert matcher inside a new event loop."""
    from database import AsyncSessionLocal
    from services.alert_matcher import match_and_alert

    async with AsyncSessionLocal() as db:
        return await match_and_alert(deals, db)
