"""
DAG: ingest_flights
Schedule: every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)

Pipeline:
  1. setup_bronze_tables   — ensure bronze_flight_prices exists (idempotent)
  2. fetch_{AIRPORT} ×9   — fetch cheapest EU flights from each French airport
     via Amadeus Flight Inspiration Search (1 API call per airport)
  3. trigger_dbt_transforms — trigger the run_dbt_transforms DAG

Uses Amadeus Self-Service API (test mode = unlimited; production = 2000 req/mo free).
Env vars required: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET, AMADEUS_ENV.
"""

import os
import sys
import logging
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.models import Variable

# Ensure data/scripts is importable from within the Airflow container
sys.path.insert(0, "/opt/airflow/scripts")

logger = logging.getLogger(__name__)

FRENCH_AIRPORTS = ["CDG", "ORY", "LYS", "MRS", "BOD", "NTE", "NCE", "TLS", "LIL"]

DEFAULT_ARGS = {
    "owner": "trigradar",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "email_on_failure": False,
}


def _setup_bronze_tables(**context):
    from db_utils import setup_bronze_tables
    setup_bronze_tables()


def _fetch_from_airport(airport: str, **context):
    """
    PythonOperator callable: fetch flights for one French airport.
    Pushes summary to XCom so the next task can inspect results.
    """
    from ingest_flights import airflow_ingest_from_airport

    result = airflow_ingest_from_airport(airport=airport)
    logger.info(
        f"[{airport}] Done — fetched={result['fetched']} "
        f"parsed={result['parsed']} inserted={result['inserted']}"
    )
    return result


with DAG(
    dag_id="ingest_flights",
    description="Fetch cheap EU flights from French airports via Amadeus API",
    schedule_interval="0 */6 * * *",  # every 6 hours
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,          # prevent overlapping runs
    tags=["data", "ingestion", "flights"],
    default_args=DEFAULT_ARGS,
    doc_md=__doc__,
) as dag:

    # ── Step 1: ensure bronze tables exist ────────────────────────────────────
    setup_task = PythonOperator(
        task_id="setup_bronze_tables",
        python_callable=_setup_bronze_tables,
        doc_md="Create bronze_flight_prices if not exists. Idempotent.",
    )

    # ── Step 2: fetch from each airport ──────────────────────────────────────
    # Amadeus flight_destinations = 1 call per airport, no pool needed in test mode.
    fetch_tasks = []
    for airport_code in FRENCH_AIRPORTS:
        task = PythonOperator(
            task_id=f"fetch_{airport_code}",
            python_callable=_fetch_from_airport,
            op_kwargs={"airport": airport_code},
            doc_md=f"Fetch cheapest EU flights from {airport_code} via Amadeus.",
        )
        setup_task >> task
        fetch_tasks.append(task)

    # ── Step 3: trigger dbt transforms once all fetches complete ─────────────
    trigger_transforms = TriggerDagRunOperator(
        task_id="trigger_dbt_transforms",
        trigger_dag_id="run_dbt_transforms",
        wait_for_completion=False,      # fire-and-forget; transforms run async
        conf={"triggered_by": "ingest_flights"},
        doc_md="Trigger the dbt transform pipeline after ingestion completes.",
    )

    fetch_tasks >> trigger_transforms
