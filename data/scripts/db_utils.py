"""
Database utilities for the data pipeline.
Uses psycopg2 (sync) since Airflow tasks run in regular Python threads.
"""

import hashlib
import json
import logging
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator

import psycopg2
from psycopg2.extras import execute_values, Json

# Re-export so ingest scripts can import from a single place
from amadeus_client import EU_DESTINATIONS, FRENCH_AIRPORTS  # noqa: F401

logger = logging.getLogger(__name__)


def get_warehouse_conn(
    host: str | None = None,
    port: int | None = None,
    dbname: str | None = None,
    user: str | None = None,
    password: str | None = None,
) -> psycopg2.extensions.connection:
    """Return a psycopg2 connection to the warehouse database.

    Prefers WAREHOUSE_URL (full connection string) when set — this handles
    SSL correctly for cloud providers like Render. Falls back to individual
    POSTGRES_* env vars for local development.
    """
    dsn = os.getenv("WAREHOUSE_URL") or os.getenv("DATABASE_URL")
    if dsn and not host:
        # Strip asyncpg driver prefix if present
        dsn = dsn.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")
        if "sslmode=" not in dsn:
            sep = "&" if "?" in dsn else "?"
            dsn += f"{sep}sslmode={os.getenv('PGSSLMODE', 'prefer')}"
        return psycopg2.connect(dsn)

    return psycopg2.connect(
        host=host or os.getenv("POSTGRES_HOST", "localhost"),
        port=port or int(os.getenv("POSTGRES_PORT", "5432")),
        dbname=dbname or os.getenv("WAREHOUSE_DB", "trigradar_dw"),
        user=user or os.getenv("POSTGRES_USER", "postgres"),
        password=password or os.getenv("POSTGRES_PASSWORD", ""),
        sslmode=os.getenv("PGSSLMODE", "prefer"),
    )


@contextmanager
def warehouse_cursor(
    conn: psycopg2.extensions.connection | None = None,
) -> Generator[tuple, None, None]:
    """Context manager: yields (conn, cursor) and commits on success, rolls back on error."""
    should_close = conn is None
    if conn is None:
        conn = get_warehouse_conn()
    try:
        with conn.cursor() as cur:
            yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        if should_close:
            conn.close()


# ── Bronze table DDL ──────────────────────────────────────────────────────────

BRONZE_FLIGHT_PRICES_DDL = """
CREATE TABLE IF NOT EXISTS bronze_flight_prices (
    id            BIGSERIAL PRIMARY KEY,
    source        VARCHAR(50)      NOT NULL DEFAULT 'amadeus',
    origin        VARCHAR(10)      NOT NULL,
    destination   VARCHAR(10)      NOT NULL,
    origin_city   VARCHAR(100),
    dest_city     VARCHAR(100),
    origin_country VARCHAR(100),
    dest_country  VARCHAR(100),
    departure_at  TIMESTAMPTZ      NOT NULL,
    return_at     TIMESTAMPTZ,
    price_eur     DECIMAL(10, 2)   NOT NULL,
    airline       VARCHAR(200),
    airlines      TEXT[],
    is_direct     BOOLEAN,
    stops         INTEGER,
    deep_link     TEXT,
    flight_hash   CHAR(32)         NOT NULL,
    raw_json      JSONB,
    fetched_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bronze_flight_hash UNIQUE (flight_hash)
);
"""

# Migration for existing tables: drop NOT NULL constraints if the table was
# already created with the old schema (safe to run multiple times).
BRONZE_FLIGHT_PRICES_MIGRATE_DDL = """
DO $$
BEGIN
    -- Drop NOT NULL on is_direct if it still has it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bronze_flight_prices'
          AND column_name = 'is_direct'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE bronze_flight_prices ALTER COLUMN is_direct DROP NOT NULL;
        ALTER TABLE bronze_flight_prices ALTER COLUMN is_direct DROP DEFAULT;
    END IF;

    -- Drop NOT NULL on stops if it still has it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bronze_flight_prices'
          AND column_name = 'stops'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE bronze_flight_prices ALTER COLUMN stops DROP NOT NULL;
        ALTER TABLE bronze_flight_prices ALTER COLUMN stops DROP DEFAULT;
    END IF;
END $$;
"""

BRONZE_HOSTEL_PRICES_DDL = """
CREATE TABLE IF NOT EXISTS bronze_hostel_prices (
    id                    BIGSERIAL PRIMARY KEY,
    source                VARCHAR(50)    NOT NULL DEFAULT 'hostelworld',
    city_code             VARCHAR(20)    NOT NULL,
    hostel_name           VARCHAR(255)   NOT NULL,
    price_per_night_eur   DECIMAL(10, 2) NOT NULL,
    rating                DECIMAL(3, 1),
    check_in              DATE           NOT NULL,
    check_out             DATE           NOT NULL,
    booking_url           TEXT,
    hostel_hash           CHAR(32)       NOT NULL,
    raw_json              JSONB,
    fetched_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bronze_hostel_hash UNIQUE (hostel_hash)
);
"""

TIMESCALE_HYPERTABLE_SQL = """
DO $$
DECLARE
    has_timescale BOOLEAN;
BEGIN
    -- Check if TimescaleDB extension is installed
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')
    INTO has_timescale;

    IF has_timescale THEN
        -- Use EXECUTE (dynamic SQL) so PostgreSQL does NOT validate
        -- timescaledb_information.* at parse time on plain PG installs.
        EXECUTE $dyn$
            SELECT create_hypertable(
                'bronze_flight_prices',
                'fetched_at',
                chunk_time_interval => INTERVAL '7 days',
                if_not_exists => TRUE
            )
        $dyn$;
        RAISE NOTICE 'bronze_flight_prices hypertable ready';
    ELSE
        RAISE NOTICE 'TimescaleDB not installed — skipping hypertable conversion';
    END IF;
END $$;
"""


def setup_bronze_tables(conn: psycopg2.extensions.connection | None = None) -> None:
    """
    Create bronze tables and enable TimescaleDB hypertable if available.
    Also runs column migrations for existing tables (idempotent).
    """
    should_close = conn is None
    if conn is None:
        conn = get_warehouse_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(BRONZE_FLIGHT_PRICES_DDL)
            cur.execute(BRONZE_HOSTEL_PRICES_DDL)
            cur.execute(BRONZE_FLIGHT_PRICES_MIGRATE_DDL)
            cur.execute(TIMESCALE_HYPERTABLE_SQL)
        conn.commit()
        logger.info("Bronze tables ready.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to create bronze tables: {e}")
        raise
    finally:
        if should_close:
            conn.close()


# ── Flight hash ───────────────────────────────────────────────────────────────

def compute_flight_hash(
    source: str,
    origin: str,
    destination: str,
    departure_at: str,
    return_at: str | None,
    price_eur: float,
) -> str:
    """Stable MD5 hash used as a dedup key for bronze_flight_prices."""
    key = f"{source}:{origin}:{destination}:{departure_at}:{return_at}:{price_eur:.2f}"
    return hashlib.md5(key.encode()).hexdigest()


# ── Flight parsing ────────────────────────────────────────────────────────────

def parse_amadeus_offer(offer: dict) -> dict | None:
    """
    Parse a single Amadeus FlightOffer (from flight_offers_search) into
    the bronze_flight_prices schema.

    FlightOffer structure (abbreviated):
      itineraries[0]          — outbound leg
        .segments[0].departure.iataCode / .at  — origin / departure time
        .segments[-1].arrival.iataCode / .at   — destination / arrival time
      itineraries[1]          — return leg (round trips)
        .segments[-1].arrival.at               — return arrival time
      price.total             — total price string e.g. "89.50"
      validatingAirlineCodes  — main airline codes
    """
    try:
        itineraries = offer.get("itineraries", [])
        if not itineraries:
            return None

        outbound_segs = itineraries[0].get("segments", [])
        if not outbound_segs:
            return None

        # Origin / destination / departure
        origin_iata = outbound_segs[0]["departure"]["iataCode"].upper()
        dest_iata = outbound_segs[-1]["arrival"]["iataCode"].upper()
        departure_at = outbound_segs[0]["departure"]["at"]  # "2026-04-01T10:00:00"

        # Return time (last arrival of return leg)
        return_at = None
        if len(itineraries) > 1:
            return_segs = itineraries[1].get("segments", [])
            if return_segs:
                return_at = return_segs[-1]["arrival"]["at"]

        # Make timestamps timezone-aware if they aren't already
        def _to_utc(ts: str) -> str:
            if ts and "+" not in ts and "Z" not in ts:
                return ts + "+00:00"
            return ts

        departure_at = _to_utc(departure_at)
        return_at = _to_utc(return_at) if return_at else None

        # Directness / stops
        is_direct = len(outbound_segs) == 1
        stops = len(outbound_segs) - 1

        # Airlines
        validating = offer.get("validatingAirlineCodes", [])
        carrier_codes = list({s.get("carrierCode", "") for s in outbound_segs})
        airlines = list({a for a in (validating + carrier_codes) if a})
        airline_str = ", ".join(airlines) if airlines else None

        price_eur = float(offer["price"]["total"])

        flight_hash = compute_flight_hash(
            source="amadeus",
            origin=origin_iata,
            destination=dest_iata,
            departure_at=departure_at,
            return_at=return_at,
            price_eur=price_eur,
        )

        return {
            "source": "amadeus",
            "origin": origin_iata,
            "destination": dest_iata,
            "origin_city": None,      # enriched in silver via ref_airports
            "dest_city": None,
            "origin_country": None,
            "dest_country": None,
            "departure_at": departure_at,
            "return_at": return_at,
            "price_eur": price_eur,
            "airline": airline_str,
            "airlines": airlines,
            "is_direct": is_direct,
            "stops": stops,
            "deep_link": "",          # flight_offers_search has no deep link
            "flight_hash": flight_hash,
            "raw_json": json.dumps(offer),
        }
    except (KeyError, TypeError, ValueError, IndexError) as e:
        logger.warning(f"Failed to parse Amadeus offer: {e}")
        return None


def parse_amadeus_result(item: dict, origin: str) -> dict | None:
    """
    Parse a single Amadeus flight-destination item into the bronze_flight_prices schema.

    Amadeus flight-destination item structure:
      {
        "type": "flight-destination",
        "origin": "CDG",
        "destination": "PRG",
        "departureDate": "2026-04-01",   ← date only, no time
        "returnDate": "2026-04-05",      ← date only, no time
        "price": {"total": "39.00"},
        "links": {
          "flightDates": "...",
          "flightOffers": "https://..."
        }
      }

    Note: airline and directness info are NOT available from this endpoint.
    Those fields will be NULL in bronze and scored as 0pts in the deal model.
    """
    try:
        dest = item["destination"]
        dep_date = item["departureDate"]        # "YYYY-MM-DD"
        ret_date = item.get("returnDate")       # "YYYY-MM-DD" or absent
        price_eur = float(item["price"]["total"])

        # Store as midnight UTC timestamps — Amadeus gives date only
        departure_at = f"{dep_date}T00:00:00+00:00"
        return_at = f"{ret_date}T00:00:00+00:00" if ret_date else None

        flight_hash = compute_flight_hash(
            source="amadeus",
            origin=origin.upper(),
            destination=dest.upper(),
            departure_at=departure_at,
            return_at=return_at,
            price_eur=price_eur,
        )

        deep_link = item.get("links", {}).get("flightOffers", "") or ""

        return {
            "source": "amadeus",
            "origin": origin.upper(),
            "destination": dest.upper(),
            "origin_city": None,        # enriched in silver via ref_airports
            "dest_city": None,
            "origin_country": None,
            "dest_country": None,
            "departure_at": departure_at,
            "return_at": return_at,
            "price_eur": price_eur,
            "airline": None,            # not provided by flight_destinations
            "airlines": [],
            "is_direct": None,          # unknown — scores 0pts in gold_deals
            "stops": None,
            "deep_link": deep_link,
            "flight_hash": flight_hash,
            "raw_json": json.dumps(item),
        }
    except (KeyError, TypeError, ValueError) as e:
        logger.warning(f"Failed to parse Amadeus result: {e} | item: {item}")
        return None


def parse_kiwi_result(raw: dict) -> dict | None:
    """
    Parse a single Kiwi API flight result into the bronze_flight_prices schema.

    Kiwi round-trip response structure:
      - flyFrom / flyTo: IATA codes
      - cityFrom / cityTo: city names
      - countryFrom / countryTo: {"code": "FR", "name": "France"}
      - utc_departure: ISO 8601 departure UTC
      - price: float (in requested currency)
      - airlines: list of IATA airline codes
      - route: list of legs, each with "return" (0=outbound, 1=return)
      - deep_link: booking URL
    """
    try:
        route = raw.get("route", [])
        return_legs = [leg for leg in route if leg.get("return") == 1]
        outbound_legs = [leg for leg in route if leg.get("return") == 0]

        departure_at: str = raw["utc_departure"]

        # Return time = UTC arrival of the last return leg
        return_at: str | None = None
        if return_legs:
            last_leg = return_legs[-1]
            return_at = last_leg.get("utc_arrival") or last_leg.get("local_arrival")

        airlines: list[str] = raw.get("airlines", [])
        airline_str: str | None = ", ".join(airlines) if airlines else None
        is_direct: bool = len(outbound_legs) == 1 and len(return_legs) <= 1
        stops: int = max(0, len(outbound_legs) - 1)
        price_eur: float = float(raw["price"])

        flight_hash = compute_flight_hash(
            source="kiwi",
            origin=raw["flyFrom"],
            destination=raw["flyTo"],
            departure_at=departure_at,
            return_at=return_at,
            price_eur=price_eur,
        )

        return {
            "source": "kiwi",
            "origin": raw["flyFrom"].upper(),
            "destination": raw["flyTo"].upper(),
            "origin_city": raw.get("cityFrom"),
            "dest_city": raw.get("cityTo"),
            "origin_country": (raw.get("countryFrom") or {}).get("name"),
            "dest_country": (raw.get("countryTo") or {}).get("name"),
            "departure_at": departure_at,
            "return_at": return_at,
            "price_eur": price_eur,
            "airline": airline_str,
            "airlines": airlines,
            "is_direct": is_direct,
            "stops": stops,
            "deep_link": raw.get("deep_link"),
            "flight_hash": flight_hash,
            "raw_json": json.dumps(raw),
        }
    except (KeyError, TypeError, ValueError) as e:
        logger.warning(f"Failed to parse Kiwi result: {e} | raw keys: {list(raw.keys())}")
        return None


# ── Bronze insert ─────────────────────────────────────────────────────────────

INSERT_BRONZE_FLIGHTS = """
INSERT INTO bronze_flight_prices (
    source, origin, destination,
    origin_city, dest_city, origin_country, dest_country,
    departure_at, return_at,
    price_eur, airline, airlines,
    is_direct, stops, deep_link,
    flight_hash, raw_json, fetched_at
) VALUES %s
ON CONFLICT (flight_hash) DO NOTHING
"""


def insert_bronze_flights(
    rows: list[dict],
    conn: psycopg2.extensions.connection | None = None,
) -> int:
    """
    Bulk insert parsed flight rows into bronze_flight_prices.
    Uses ON CONFLICT DO NOTHING for deduplication via flight_hash.

    Returns the number of new rows inserted.
    """
    if not rows:
        return 0

    fetched_at = datetime.now(timezone.utc)

    values = [
        (
            r["source"],
            r["origin"],
            r["destination"],
            r["origin_city"],
            r["dest_city"],
            r["origin_country"],
            r["dest_country"],
            r["departure_at"],
            r["return_at"],
            r["price_eur"],
            r["airline"],
            r["airlines"],
            r["is_direct"],
            r["stops"],
            r["deep_link"],
            r["flight_hash"],
            Json(json.loads(r["raw_json"])),
            fetched_at,
        )
        for r in rows
    ]

    should_close = conn is None
    if conn is None:
        conn = get_warehouse_conn()

    try:
        with conn.cursor() as cur:
            # execute_values is faster than executemany for bulk inserts
            execute_values(cur, INSERT_BRONZE_FLIGHTS, values)
            inserted = cur.rowcount
        conn.commit()
        return max(0, inserted)
    except Exception as e:
        conn.rollback()
        logger.error(f"Bronze insert failed: {e}")
        raise
    finally:
        if should_close:
            conn.close()
