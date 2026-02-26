"""
ingest_hostels_dag.py — Fetch hostel prices for active flight deals.

Runs every 12 hours. For each unique (destination, date_range) pair found in
gold_deals (deals departing in the next 90 days), fetches hostel options from
Hostelworld and writes results to the bronze_hostel_prices table.

Dependencies:
  - gold_deals must have been populated by run_dbt_transforms_dag first
  - HOSTELWORLD_API_KEY env var must be set

Task graph:
    fetch_active_deal_destinations
        → fetch_hostels_for_destination (dynamic task mapping)
        → log_summary
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta

import psycopg2
from airflow import DAG
from airflow.operators.python import PythonOperator

sys.path.insert(0, "/opt/airflow/scripts")

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://trigradar:trigradar@postgres:5432/trigradar",
)
WAREHOUSE_URL = os.environ.get(
    "WAREHOUSE_URL",
    "postgresql://trigradar:trigradar@postgres:5432/trigradar_dw",
)

default_args = {
    "owner": "trigradar",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "email_on_failure": False,
}


# ── Task 1: fetch unique destinations from gold_deals ─────────────────────────

def _get_active_destinations(**context) -> list[dict]:
    """
    Returns list of dicts: {dest_iata, departure_at, return_at}
    for deals valid in the next 90 days.
    """
    conn = psycopg2.connect(WAREHOUSE_URL.replace("+asyncpg", ""))
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT
                    dest_iata,
                    DATE(departure_at) AS checkin,
                    DATE(return_at) AS checkout
                FROM gold_deals
                WHERE
                    valid_until > NOW()
                    AND departure_at BETWEEN NOW() AND NOW() + INTERVAL '90 days'
                    AND return_at IS NOT NULL
                LIMIT 200
            """)
            rows = cur.fetchall()
    finally:
        conn.close()

    destinations = [
        {
            "dest_iata": row[0],
            "checkin": str(row[1]),
            "checkout": str(row[2]),
        }
        for row in rows
    ]
    logger.info("Found %d active destination/date combos in gold_deals", len(destinations))
    context["ti"].xcom_push(key="destinations", value=json.dumps(destinations))
    return destinations


# ── Task 2: ensure bronze_hostel_prices table exists ─────────────────────────

def _ensure_hostel_table(**context) -> None:
    conn = psycopg2.connect(DATABASE_URL.replace("+asyncpg", ""))
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bronze_hostel_prices (
                    id            BIGSERIAL PRIMARY KEY,
                    hostel_id     TEXT NOT NULL,
                    hostel_name   TEXT NOT NULL,
                    city          TEXT NOT NULL,
                    dest_iata     TEXT NOT NULL,
                    price_per_night_eur NUMERIC(8,2) NOT NULL,
                    rating        NUMERIC(5,2),
                    booking_url   TEXT,
                    image_url     TEXT,
                    dorm_available BOOLEAN DEFAULT FALSE,
                    private_available BOOLEAN DEFAULT FALSE,
                    checkin       DATE NOT NULL,
                    checkout      DATE NOT NULL,
                    nights        INTEGER NOT NULL,
                    fetched_at    TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (hostel_id, checkin, checkout)
                );
                CREATE INDEX IF NOT EXISTS idx_hostel_dest
                    ON bronze_hostel_prices (dest_iata, checkin, checkout);
            """)
            conn.commit()
    finally:
        conn.close()


# ── Task 3: fetch hostels for each destination ────────────────────────────────

def _fetch_and_store_hostels(**context) -> dict:
    from hostel_client import fetch_hostels  # type: ignore[import]

    raw = context["ti"].xcom_pull(key="destinations", task_ids="get_active_destinations")
    destinations: list[dict] = json.loads(raw or "[]")

    if not destinations:
        logger.info("No destinations to process")
        return {"fetched": 0, "stored": 0, "errors": 0}

    conn = psycopg2.connect(DATABASE_URL.replace("+asyncpg", ""))
    fetched_total = 0
    stored_total = 0
    error_count = 0

    try:
        for dest in destinations:
            try:
                hostels = asyncio.run(
                    fetch_hostels(
                        dest_iata=dest["dest_iata"],
                        checkin=dest["checkin"],
                        checkout=dest["checkout"],
                        max_price_per_night=50.0,
                        limit=5,
                    )
                )
                fetched_total += len(hostels)

                with conn.cursor() as cur:
                    for h in hostels:
                        cur.execute("""
                            INSERT INTO bronze_hostel_prices (
                                hostel_id, hostel_name, city, dest_iata,
                                price_per_night_eur, rating, booking_url, image_url,
                                dorm_available, private_available,
                                checkin, checkout, nights, fetched_at
                            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
                            ON CONFLICT (hostel_id, checkin, checkout)
                            DO UPDATE SET
                                price_per_night_eur = EXCLUDED.price_per_night_eur,
                                rating              = EXCLUDED.rating,
                                fetched_at          = NOW()
                        """, (
                            h.hostel_id, h.name, h.city, h.dest_iata,
                            h.price_per_night_eur, h.rating, h.booking_url, h.image_url,
                            h.dorm_available, h.private_available,
                            h.checkin, h.checkout, h.nights,
                        ))
                        stored_total += 1
                conn.commit()

            except Exception as exc:
                logger.error("Error fetching hostels for %s: %s", dest, exc)
                error_count += 1

    finally:
        conn.close()

    summary = {"fetched": fetched_total, "stored": stored_total, "errors": error_count}
    logger.info("Hostel ingestion summary: %s", summary)
    return summary


# ── DAG ───────────────────────────────────────────────────────────────────────

with DAG(
    dag_id="ingest_hostels",
    description="Fetch hostel prices for active flight deal destinations",
    schedule_interval="0 */12 * * *",  # every 12 hours
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["hostels", "ingestion"],
) as dag:

    t_ensure_table = PythonOperator(
        task_id="ensure_hostel_table",
        python_callable=_ensure_hostel_table,
    )

    t_get_destinations = PythonOperator(
        task_id="get_active_destinations",
        python_callable=_get_active_destinations,
    )

    t_fetch_hostels = PythonOperator(
        task_id="fetch_and_store_hostels",
        python_callable=_fetch_and_store_hostels,
    )

    t_ensure_table >> t_get_destinations >> t_fetch_hostels
