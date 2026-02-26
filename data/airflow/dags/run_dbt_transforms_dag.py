"""
DAG: run_dbt_transforms
Triggered by: ingest_flights (via TriggerDagRunOperator)
Can also be triggered manually from the Airflow UI.

Pipeline (in dependency order):
  1. dbt_seed          — load ref_airports seed into warehouse
  2. dbt_silver_flights — clean & normalise bronze_flight_prices → silver_flights
  3. dbt_gold_route_stats — compute 30/90-day price stats per route
  4. dbt_gold_deals    — score deals (0–100) using route stats baseline
  5. dbt_test          — run all dbt schema tests
  6. trigger_alerts    — trigger score_and_alert DAG
"""

import logging
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

logger = logging.getLogger(__name__)

# dbt runs inside the Airflow container — the dbt project is mounted at /opt/airflow/dbt
DBT_CMD = "cd /opt/airflow/dbt && dbt {command} --profiles-dir /opt/airflow/dbt --target dev"

DEFAULT_ARGS = {
    "owner": "trigradar",
    "retries": 1,
    "retry_delay": timedelta(minutes=3),
    "email_on_failure": False,
}


def dbt(command: str, select: str = "", doc: str = "") -> BashOperator:
    """Helper that returns a BashOperator running a dbt command."""
    full_cmd = DBT_CMD.format(command=command)
    if select:
        full_cmd += f" --select {select}"
    return BashOperator(
        task_id=f"dbt_{command.split()[0]}{'_' + select.replace('.', '_') if select else ''}",
        bash_command=full_cmd,
        doc_md=doc or f"dbt {command} {select}",
    )


with DAG(
    dag_id="run_dbt_transforms",
    description="Run dbt models: Bronze → Silver → Gold (deal scoring)",
    schedule_interval=None,            # triggered only by ingest_flights DAG
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["data", "dbt", "transforms"],
    default_args=DEFAULT_ARGS,
    doc_md=__doc__,
) as dag:

    # ── 1. Seed reference data ────────────────────────────────────────────────
    seed = BashOperator(
        task_id="dbt_seed",
        bash_command=DBT_CMD.format(command="seed --select ref_airports"),
        doc_md="Load ref_airports.csv seed into the warehouse.",
    )

    # ── 2. Silver: clean flights ──────────────────────────────────────────────
    silver_flights = BashOperator(
        task_id="dbt_silver_flights",
        bash_command=DBT_CMD.format(command="run --select silver_flights"),
        doc_md="Clean & normalise bronze_flight_prices → silver_flights (incremental).",
    )

    # ── 3. Gold: route statistics ─────────────────────────────────────────────
    gold_route_stats = BashOperator(
        task_id="dbt_gold_route_stats",
        bash_command=DBT_CMD.format(command="run --select gold_route_stats"),
        doc_md="Compute 30/90-day avg, min, p20 price per route → gold_route_stats (full refresh).",
    )

    # ── 4. Gold: deal scoring ─────────────────────────────────────────────────
    gold_deals = BashOperator(
        task_id="dbt_gold_deals",
        bash_command=DBT_CMD.format(command="run --select gold_deals"),
        doc_md="Score deals 0–100 using route stats baseline → gold_deals (incremental).",
    )

    # ── 5. Tests ──────────────────────────────────────────────────────────────
    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command=DBT_CMD.format(command="test"),
        doc_md="Run all dbt schema + data quality tests. Fails the DAG on violation.",
    )

    # ── 6. Trigger alert matching ─────────────────────────────────────────────
    trigger_alerts = TriggerDagRunOperator(
        task_id="trigger_score_and_alert",
        trigger_dag_id="score_and_alert",
        wait_for_completion=False,
        conf={"triggered_by": "run_dbt_transforms"},
        doc_md="Trigger the score_and_alert DAG to notify users of new deals.",
    )

    # ── Dependencies ──────────────────────────────────────────────────────────
    seed >> silver_flights >> gold_route_stats >> gold_deals >> dbt_test >> trigger_alerts
