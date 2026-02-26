"""
DAG: score_and_alert
Triggered by: run_dbt_transforms (after gold_deals is refreshed)

Phase 1 behaviour:
  - Queries gold_deals for deals created in the last 6h
  - Logs a summary of new deals (count, top 5 by score)
  - Calls FastAPI /internal/process-alerts to match deals to users
    (no-op if no users exist yet — API gracefully returns 0 notifications)

Phase 2 will:
  - Full user preference matching already in FastAPI
  - FCM push + email dispatch via Celery workers
"""

import json
import logging
import os
import sys
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

sys.path.insert(0, "/opt/airflow/scripts")
logger = logging.getLogger(__name__)

DEFAULT_ARGS = {
    "owner": "trigradar",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": False,
}


def _log_new_deals(**context) -> dict:
    """
    Query gold_deals for deals created in the last 6 hours.
    Log a human-readable summary. Returns summary dict pushed to XCom.
    """
    import psycopg2

    execution_date: datetime = context["execution_date"]
    since = execution_date - timedelta(hours=6)

    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "postgres"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        dbname=os.getenv("WAREHOUSE_DB", "trigradar_dw"),
        user=os.getenv("POSTGRES_USER", "trigradar"),
        password=os.getenv("POSTGRES_PASSWORD", "trigradar"),
    )

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    origin_iata, dest_iata, dest_city,
                    price_eur, avg_price_90d, savings_pct,
                    deal_score, deal_tier, airline,
                    departure_at, return_at, duration_days
                FROM gold_deals
                WHERE created_at >= %s
                  AND deal_score >= 40
                ORDER BY deal_score DESC
                LIMIT 20
                """,
                (since,),
            )
            rows = cur.fetchall()
            columns = [d[0] for d in cur.description]

            cur.execute(
                "SELECT COUNT(*) FROM gold_deals WHERE created_at >= %s",
                (since,),
            )
            total = cur.fetchone()[0]
    finally:
        conn.close()

    deals = [dict(zip(columns, row)) for row in rows]

    # Pretty-print summary to Airflow logs
    logger.info(f"\n{'='*60}")
    logger.info(f"NEW DEALS — since {since.strftime('%Y-%m-%d %H:%M UTC')}")
    logger.info(f"Total new deals: {total}")
    logger.info(f"{'='*60}")

    for d in deals[:5]:
        logger.info(
            f"  [{d['deal_score']:3}/100] {d['deal_tier'].upper():4} | "
            f"{d['origin_iata']} → {d['dest_iata']} ({d['dest_city']}) | "
            f"{d['price_eur']:.0f}€ (−{d['savings_pct']:.0f}% vs avg) | "
            f"{d['airline']} | {d['departure_at'].strftime('%d %b') if d['departure_at'] else '?'}"
        )

    if total == 0:
        logger.info("  No new deals found in the last 6 hours.")

    logger.info(f"{'='*60}\n")

    return {"total_new_deals": total, "top_deals": len(deals)}


def _notify_api(**context) -> dict:
    """
    POST to FastAPI /internal/process-alerts.
    Triggers user-deal matching + notification dispatch.

    In Phase 1 with no registered users, the API returns
    {"processed": N, "notifications_sent": 0} — which is correct.
    """
    import httpx

    execution_date: datetime = context["execution_date"]
    since_iso = (execution_date - timedelta(hours=6)).isoformat()

    api_base_url = os.getenv("API_BASE_URL", "http://api:8000")
    internal_token = os.getenv("INTERNAL_API_TOKEN", "")

    try:
        response = httpx.post(
            f"{api_base_url}/internal/process-alerts",
            json={"since": since_iso},
            headers={"X-Internal-Token": internal_token},
            timeout=30.0,
        )

        if response.status_code == 200:
            result = response.json()
            logger.info(
                f"Alert processing complete: "
                f"processed={result.get('processed', 0)} "
                f"notifications_sent={result.get('notifications_sent', 0)}"
            )
            return result
        else:
            # Non-fatal in Phase 1 — API might not have the endpoint yet
            logger.warning(
                f"API returned {response.status_code} for /internal/process-alerts. "
                f"This is expected in Phase 1 before the endpoint is implemented."
            )
            return {"processed": 0, "notifications_sent": 0}

    except httpx.ConnectError:
        logger.warning(
            "Could not connect to API. Is the API container running? "
            "Skipping alert dispatch."
        )
        return {"processed": 0, "notifications_sent": 0}
    except Exception as e:
        logger.error(f"Alert notification failed: {e}")
        return {"processed": 0, "notifications_sent": 0}


with DAG(
    dag_id="score_and_alert",
    description="Match new deals to users and send notifications",
    schedule_interval=None,            # triggered by run_dbt_transforms
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["data", "alerts", "notifications"],
    default_args=DEFAULT_ARGS,
    doc_md=__doc__,
) as dag:

    log_deals = PythonOperator(
        task_id="log_new_deals",
        python_callable=_log_new_deals,
        doc_md="Log a summary of deals created in the last 6h.",
    )

    notify_api = PythonOperator(
        task_id="notify_api",
        python_callable=_notify_api,
        doc_md="POST to /internal/process-alerts — triggers user matching + push/email dispatch.",
    )

    log_deals >> notify_api
