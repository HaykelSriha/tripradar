"""
DAG: cleanup_old_prices
Schedule: daily at 02:00 UTC (03:00 Paris winter, 04:00 summer)

Tasks:
  1. delete_old_bronze  — remove bronze records older than 180 days
  2. vacuum_analyze     — VACUUM ANALYZE bronze tables for query performance
  3. log_table_sizes    — log current row counts and table sizes for monitoring
"""

import logging
import os
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

DEFAULT_ARGS = {
    "owner": "trigradar",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": False,
}

RETENTION_DAYS = 180


def _get_conn():
    import psycopg2
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "postgres"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        dbname=os.getenv("WAREHOUSE_DB", "trigradar_dw"),
        user=os.getenv("POSTGRES_USER", "trigradar"),
        password=os.getenv("POSTGRES_PASSWORD", "trigradar"),
    )


def _delete_old_bronze(**context) -> dict:
    """Delete bronze records older than RETENTION_DAYS days."""
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM bronze_flight_prices WHERE fetched_at < %s",
                (cutoff,),
            )
            deleted_flights = cur.rowcount

            cur.execute(
                "DELETE FROM bronze_hostel_prices WHERE fetched_at < %s",
                (cutoff,),
            )
            deleted_hostels = cur.rowcount

        conn.commit()
        logger.info(
            f"Cleanup complete: deleted {deleted_flights} flight rows "
            f"and {deleted_hostels} hostel rows older than {cutoff.date()}"
        )
        return {"deleted_flights": deleted_flights, "deleted_hostels": deleted_hostels}
    finally:
        conn.close()


def _vacuum_analyze(**context) -> None:
    """VACUUM ANALYZE bronze tables to reclaim space and update statistics."""
    import psycopg2

    # VACUUM cannot run inside a transaction, so use autocommit
    conn = _get_conn()
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            for table in ["bronze_flight_prices", "bronze_hostel_prices", "gold_deals"]:
                logger.info(f"VACUUM ANALYZE {table}...")
                cur.execute(f"VACUUM ANALYZE {table}")
        logger.info("VACUUM ANALYZE complete.")
    finally:
        conn.close()


def _log_table_sizes(**context) -> dict:
    """Log row counts and table sizes for monitoring."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
                    (SELECT reltuples::BIGINT
                     FROM pg_class
                     WHERE relname = tablename) AS approx_rows
                FROM pg_tables
                WHERE tablename IN (
                    'bronze_flight_prices',
                    'bronze_hostel_prices',
                    'silver_flights',
                    'gold_route_stats',
                    'gold_deals'
                )
                ORDER BY tablename
                """
            )
            rows = cur.fetchall()

        logger.info("\n── Table Sizes ──────────────────────────────────")
        sizes = {}
        for schema, table, size, approx_rows in rows:
            logger.info(f"  {table:30} {size:>10}  (~{approx_rows:,} rows)")
            sizes[table] = {"size": size, "approx_rows": approx_rows}
        logger.info("─────────────────────────────────────────────────\n")
        return sizes
    except Exception as e:
        logger.warning(f"Could not fetch table sizes: {e}")
        return {}
    finally:
        conn.close()


with DAG(
    dag_id="cleanup_old_prices",
    description="Remove old bronze data and VACUUM ANALYZE warehouse tables",
    schedule_interval="0 2 * * *",    # daily at 02:00 UTC
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["data", "maintenance"],
    default_args=DEFAULT_ARGS,
    doc_md=__doc__,
) as dag:

    delete_old = PythonOperator(
        task_id="delete_old_bronze",
        python_callable=_delete_old_bronze,
        doc_md=f"Delete bronze records older than {RETENTION_DAYS} days.",
    )

    vacuum = PythonOperator(
        task_id="vacuum_analyze",
        python_callable=_vacuum_analyze,
        doc_md="VACUUM ANALYZE bronze + gold tables.",
    )

    log_sizes = PythonOperator(
        task_id="log_table_sizes",
        python_callable=_log_table_sizes,
        doc_md="Log current table sizes to Airflow logs for monitoring.",
    )

    delete_old >> vacuum >> log_sizes
