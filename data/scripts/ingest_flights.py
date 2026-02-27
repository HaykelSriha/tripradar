"""
Flight ingestion script.
Fetches cheapest round-trip flights from all French airports to EU destinations
using the Amadeus flight_offers_search API, and inserts raw results into
bronze_flight_prices.

Strategy: for each (French airport, EU destination) pair, search on N date
windows. This uses the only Amadeus endpoint that works in both test and
production environments, and returns richer data (airline, stops, exact times).

API call count per full run: 9 airports × 30 destinations × 2 dates = 540 calls.

Can be run standalone:
    python ingest_flights.py --airport CDG
    python ingest_flights.py --airport CDG --airport LYS
    python ingest_flights.py            # all French airports

Or called from Airflow DAG tasks via the airflow_* wrappers below.
"""

import argparse
import logging
import os
import time
from datetime import date, timedelta

from amadeus_client import AmadeusClient, EU_DESTINATIONS, FRENCH_AIRPORTS
from db_utils import (
    get_warehouse_conn,
    insert_bronze_flights,
    parse_amadeus_offer,
    setup_bronze_tables,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_search_date_windows(n: int = 2) -> list[tuple[str, str]]:
    """
    Return N (departure_date, return_date) pairs spread over the next 3 months.
    Departure windows: +22d, +45d, +75d  (short, medium, long range).
    Trip length: fixed 4 nights (typical short EU trip).
    """
    today = date.today()
    offsets = [22, 45, 75]
    trip_nights = 4
    windows = []
    for offset in offsets[:n]:
        dep = today + timedelta(days=offset)
        ret = dep + timedelta(days=trip_nights)
        windows.append((dep.isoformat(), ret.isoformat()))
    return windows


def ingest_from_airport(
    airport: str,
    client_id: str,
    client_secret: str,
    amadeus_env: str = "test",
    destinations: list[str] | None = None,
    n_date_windows: int = 2,
    delay_between_calls: float = 0.5,
) -> dict:
    """
    For `airport`, search all EU destinations across N date windows and
    insert cheapest offers into bronze_flight_prices.

    Returns: {airport, routes_searched, fetched, parsed, inserted}
    """
    if destinations is None:
        destinations = EU_DESTINATIONS

    client = AmadeusClient(
        client_id=client_id,
        client_secret=client_secret,
        hostname=amadeus_env,
    )
    date_windows = get_search_date_windows(n_date_windows)
    logger.info(
        f"[{airport}] Searching {len(destinations)} destinations "
        f"x {len(date_windows)} date windows = {len(destinations) * len(date_windows)} calls"
    )

    all_parsed: list[dict] = []
    routes_searched = 0
    total_fetched = 0

    for dest in destinations:
        for dep_date, ret_date in date_windows:
            offers = client.search_flight_offers(
                origin=airport,
                destination=dest,
                departure_date=dep_date,
                return_date=ret_date,
                max_results=1,  # only the cheapest per route/date
            )
            routes_searched += 1
            total_fetched += len(offers)

            for offer in offers:
                row = parse_amadeus_offer(offer)
                if row is not None:
                    all_parsed.append(row)

            if delay_between_calls > 0:
                time.sleep(delay_between_calls)

    logger.info(
        f"[{airport}] Done — {routes_searched} route/date combos, "
        f"{total_fetched} offers fetched, {len(all_parsed)} parsed"
    )

    conn = get_warehouse_conn()
    try:
        inserted = insert_bronze_flights(all_parsed, conn=conn)
    finally:
        conn.close()

    logger.info(f"[{airport}] Inserted {inserted} new rows into bronze_flight_prices")
    return {
        "airport": airport,
        "routes_searched": routes_searched,
        "fetched": total_fetched,
        "parsed": len(all_parsed),
        "inserted": inserted,
    }


def run_full_ingestion(
    airports: list[str] | None = None,
    client_id: str | None = None,
    client_secret: str | None = None,
    amadeus_env: str = "test",
    n_date_windows: int = 2,
) -> list[dict]:
    """
    Run ingestion for all (or a subset of) French airports sequentially.
    Returns list of per-airport summary dicts.
    """
    if airports is None:
        airports = FRENCH_AIRPORTS
    if client_id is None:
        client_id = os.environ["AMADEUS_CLIENT_ID"]
    if client_secret is None:
        client_secret = os.environ["AMADEUS_CLIENT_SECRET"]
    amadeus_env = amadeus_env or os.getenv("AMADEUS_ENV", "test")

    results = []
    for airport in airports:
        try:
            result = ingest_from_airport(
                airport,
                client_id=client_id,
                client_secret=client_secret,
                amadeus_env=amadeus_env,
                n_date_windows=n_date_windows,
            )
            results.append(result)
        except Exception as e:
            logger.error(f"[{airport}] Ingestion failed: {e}")
            results.append({
                "airport": airport, "routes_searched": 0,
                "fetched": 0, "parsed": 0, "inserted": 0, "error": str(e),
            })

    total_inserted = sum(r["inserted"] for r in results)
    logger.info(
        f"Full ingestion complete - {len(airports)} airports, "
        f"{total_inserted} new rows total."
    )
    return results


# ── Airflow-callable wrappers (synchronous) ────────────────────────────────────

def airflow_setup_bronze_tables(**context) -> None:
    """Airflow PythonOperator callable: create bronze tables if not exists."""
    setup_bronze_tables()
    logger.info("Bronze tables ready for ingestion.")


def airflow_ingest_from_airport(airport: str, **context) -> dict:
    """Airflow PythonOperator callable: ingest flights for one airport."""
    client_id = os.environ.get("AMADEUS_CLIENT_ID", "")
    client_secret = os.environ.get("AMADEUS_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise ValueError(
            "AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET environment variables are required."
        )
    amadeus_env = os.getenv("AMADEUS_ENV", "test")
    return ingest_from_airport(
        airport,
        client_id=client_id,
        client_secret=client_secret,
        amadeus_env=amadeus_env,
    )


# ── CLI entrypoint ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="TripRadar flight ingestion (Amadeus)")
    parser.add_argument(
        "--airport", nargs="+", default=None,
        help="IATA codes to ingest (default: all French airports)",
    )
    parser.add_argument(
        "--setup-only", action="store_true",
        help="Only create warehouse tables, do not fetch data",
    )
    parser.add_argument(
        "--date-windows", type=int, default=2,
        help="Number of departure date windows to search per route (default: 2)",
    )
    args = parser.parse_args()

    # Always ensure tables exist
    setup_bronze_tables()

    if args.setup_only:
        print("Bronze tables created. Exiting (--setup-only).")
        return

    client_id = os.environ.get("AMADEUS_CLIENT_ID")
    client_secret = os.environ.get("AMADEUS_CLIENT_SECRET")
    if not client_id or not client_secret:
        print("ERROR: AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET env vars are required.")
        raise SystemExit(1)

    amadeus_env = os.getenv("AMADEUS_ENV", "test")
    airports = args.airport or FRENCH_AIRPORTS
    total_calls = len(airports) * len(EU_DESTINATIONS) * args.date_windows
    logger.info(f"Starting ingestion: {len(airports)} airports, ~{total_calls} API calls")

    results = run_full_ingestion(
        airports=airports,
        client_id=client_id,
        client_secret=client_secret,
        amadeus_env=amadeus_env,
        n_date_windows=args.date_windows,
    )

    print("\n=== Ingestion Summary ===")
    for r in results:
        if "error" in r:
            print(f"  {r['airport']}: ERROR: {r['error']}")
        else:
            print(
                f"  {r['airport']}: {r['routes_searched']} routes searched, "
                f"{r['fetched']} fetched, {r['inserted']} inserted"
            )
    print(f"\nTotal: {sum(r['inserted'] for r in results)} new records")


if __name__ == "__main__":
    # Load .env from project root when running as a standalone script
    try:
        from dotenv import load_dotenv
        import pathlib
        root = pathlib.Path(__file__).parent.parent.parent
        env_file = root / ".env"
        if env_file.exists():
            load_dotenv(env_file)
    except ImportError:
        pass

    main()
