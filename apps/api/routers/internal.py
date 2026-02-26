"""
Internal router — endpoints called by Airflow, not exposed to the public.
Protected by a static token (INTERNAL_API_TOKEN env var).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from dependencies import get_db
from services.alert_matcher import match_and_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["internal"])


def verify_internal_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


class ProcessAlertsRequest(BaseModel):
    """Airflow sends the new deals it wants processed."""
    deals: list[dict]


class ProcessAlertsResponse(BaseModel):
    deals_processed: int
    alerts_sent: int
    errors: int


@router.post(
    "/process-alerts",
    response_model=ProcessAlertsResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def process_alerts(
    body: ProcessAlertsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by Airflow's score_and_alert DAG after each pipeline run.
    Matches new deals against user preferences and dispatches notifications.
    """
    logger.info("process-alerts called with %d deals", len(body.deals))
    stats = await match_and_alert(body.deals, db)
    logger.info("process-alerts done: %s", stats)
    return ProcessAlertsResponse(**stats)
