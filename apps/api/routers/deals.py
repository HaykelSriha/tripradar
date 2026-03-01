"""Deals router — read from gold_deals warehouse table."""

import hashlib
import json
import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_warehouse_db
from schemas.deals import DealResponse, HostelResponse, PaginatedDeals, PriceHistoryResponse, PricePoint
from services.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deals", tags=["deals"])

# ── Helper: map raw SQL row → DealResponse dict ───────────────────────────────

def _row_to_dict(row) -> dict:
    """Convert a SQLAlchemy Row to a plain dict for Pydantic validation."""
    return dict(row._mapping)


def _cache_key_for_filters(**kwargs) -> str:
    key_str = json.dumps(kwargs, sort_keys=True, default=str)
    return f"deals:list:{hashlib.md5(key_str.encode()).hexdigest()}"


def _resolve_date_range(date_range: Optional[str]) -> tuple[Optional[date], Optional[date]]:
    """Convert a shorthand date_range string to (depart_from, depart_until)."""
    if not date_range:
        return None, None
    today = date.today()
    mapping = {
        "1m": timedelta(days=31),
        "2m": timedelta(days=62),
        "3m": timedelta(days=93),
    }
    delta = mapping.get(date_range)
    if delta is None:
        return None, None
    return today, today + delta


# ── GET /deals ────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedDeals)
async def list_deals(
    origin: Optional[str] = Query(None, description="IATA origin airport, e.g. CDG"),
    destinations: Optional[list[str]] = Query(None, description="IATA destination codes, e.g. BCN,LIS"),
    # Date range: shorthand (1m/2m/3m) or explicit from/until
    date_range: Optional[str] = Query(None, pattern="^(1m|2m|3m)$", description="Departure window: 1m, 2m or 3m from today"),
    depart_from: Optional[date] = Query(None, description="Earliest departure date (YYYY-MM-DD)"),
    depart_until: Optional[date] = Query(None, description="Latest departure date (YYYY-MM-DD)"),
    # Price range
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price in EUR"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price in EUR"),
    # Nights
    min_nights: Optional[int] = Query(None, ge=1, description="Minimum trip length in nights"),
    max_nights: Optional[int] = Query(None, ge=1, description="Maximum trip length in nights"),
    # Pagination
    cursor: Optional[str] = Query(None, description="Pagination cursor: score:hash"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_warehouse_db),
):
    # Resolve shorthand date range
    if date_range and not depart_from and not depart_until:
        depart_from, depart_until = _resolve_date_range(date_range)

    cache_key = _cache_key_for_filters(
        origin=origin, destinations=destinations,
        date_range=date_range, depart_from=depart_from, depart_until=depart_until,
        min_price=min_price, max_price=max_price,
        min_nights=min_nights, max_nights=max_nights,
        cursor=cursor, limit=limit,
    )
    cached = await cache_get(cache_key)
    if cached:
        return PaginatedDeals(**cached)

    # Build WHERE clauses
    # valid_until filter removed — show all existing deals regardless of expiry
    conditions: list[str] = []
    params: dict = {"limit": limit + 1}

    if origin:
        conditions.append("origin_iata = :origin")
        params["origin"] = origin.upper()

    if destinations:
        dest_list = [d.upper() for d in destinations]
        placeholders = ", ".join(f":dest_{i}" for i in range(len(dest_list)))
        conditions.append(f"dest_iata IN ({placeholders})")
        for i, d in enumerate(dest_list):
            params[f"dest_{i}"] = d

    if depart_from is not None:
        conditions.append("departure_at::date >= :depart_from")
        params["depart_from"] = depart_from
    if depart_until is not None:
        conditions.append("departure_at::date <= :depart_until")
        params["depart_until"] = depart_until

    if min_price is not None:
        conditions.append("price_eur >= :min_price")
        params["min_price"] = min_price
    if max_price is not None:
        conditions.append("price_eur <= :max_price")
        params["max_price"] = max_price

    if min_nights is not None:
        conditions.append("duration_days >= :min_nights")
        params["min_nights"] = min_nights
    if max_nights is not None:
        conditions.append("duration_days <= :max_nights")
        params["max_nights"] = max_nights

    # Cursor-based pagination (deal_score DESC, flight_hash ASC)
    if cursor:
        try:
            cursor_score, cursor_hash = cursor.split(":", 1)
            conditions.append(
                "(deal_score < :cursor_score OR (deal_score = :cursor_score AND flight_hash > :cursor_hash))"
            )
            params["cursor_score"] = int(cursor_score)
            params["cursor_hash"] = cursor_hash
        except (ValueError, AttributeError):
            pass  # invalid cursor — ignore and return from beginning

    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    sql = text(f"""
        SELECT
            flight_hash, origin_iata, dest_iata,
            origin_city, dest_city, origin_country, dest_country,
            origin_flag, dest_flag,
            departure_at, return_at, duration_h, duration_days,
            airline, is_direct, stops,
            price_eur, avg_price_90d, savings_pct,
            deal_score, deal_tier,
            price_score, price_tier_score, directness_score, duration_score, dest_score,
            deep_link, created_at, valid_until
        FROM gold_deals
        WHERE {where_clause}
        ORDER BY deal_score DESC, flight_hash ASC
        LIMIT :limit
    """)

    result = await db.execute(sql, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    items_rows = rows[:limit]
    items = [DealResponse(**_row_to_dict(r)) for r in items_rows]

    next_cursor = None
    if has_more and items:
        last = items[-1]
        next_cursor = f"{last.deal_score}:{last.flight_hash}"

    # Count total (for display; uses a separate query without cursor/limit)
    count_conditions = [c for c in conditions if "cursor" not in c]
    count_where = " AND ".join(count_conditions) if count_conditions else "TRUE"
    count_sql = text(f"SELECT COUNT(*) FROM gold_deals WHERE {count_where}")
    count_params = {k: v for k, v in params.items() if "cursor" not in k and k != "limit"}
    total_result = await db.execute(count_sql, count_params)
    total = total_result.scalar() or 0

    response = PaginatedDeals(items=items, total=total, cursor=next_cursor, has_more=has_more)
    await cache_set(cache_key, response.model_dump(), ttl=900)
    return response


# ── GET /deals/top ────────────────────────────────────────────────────────────

@router.get("/top", response_model=list[DealResponse])
async def top_deals(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_warehouse_db),
):
    cache_key = f"deals:top:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return [DealResponse(**d) for d in cached]

    sql = text("""
        SELECT
            flight_hash, origin_iata, dest_iata,
            origin_city, dest_city, origin_country, dest_country,
            origin_flag, dest_flag,
            departure_at, return_at, duration_h, duration_days,
            airline, is_direct, stops,
            price_eur, avg_price_90d, savings_pct,
            deal_score, deal_tier,
            price_score, price_tier_score, directness_score, duration_score, dest_score,
            deep_link, created_at, valid_until
        FROM gold_deals
        ORDER BY deal_score DESC
        LIMIT :limit
    """)
    result = await db.execute(sql, {"limit": limit})
    items = [DealResponse(**_row_to_dict(r)) for r in result.fetchall()]

    await cache_set(cache_key, [d.model_dump() for d in items], ttl=900)
    return items


# ── GET /deals/inspire ────────────────────────────────────────────────────────

@router.get("/inspire", response_model=list[DealResponse])
async def inspire_deals(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_warehouse_db),
):
    """Returns a random selection of good-value deals (score ≥ 60)."""
    cache_key = f"deals:inspire:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return [DealResponse(**d) for d in cached]

    sql = text("""
        SELECT
            flight_hash, origin_iata, dest_iata,
            origin_city, dest_city, origin_country, dest_country,
            origin_flag, dest_flag,
            departure_at, return_at, duration_h, duration_days,
            airline, is_direct, stops,
            price_eur, avg_price_90d, savings_pct,
            deal_score, deal_tier,
            price_score, price_tier_score, directness_score, duration_score, dest_score,
            deep_link, created_at, valid_until
        FROM gold_deals
        WHERE deal_score >= 60
        ORDER BY RANDOM()
        LIMIT :limit
    """)
    result = await db.execute(sql, {"limit": limit})
    items = [DealResponse(**_row_to_dict(r)) for r in result.fetchall()]

    await cache_set(cache_key, [d.model_dump() for d in items], ttl=3600)
    return items


# ── GET /deals/{id} ───────────────────────────────────────────────────────────

@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(
    deal_id: str,
    db: AsyncSession = Depends(get_warehouse_db),
):
    cache_key = f"deals:{deal_id}"
    cached = await cache_get(cache_key)
    if cached:
        return DealResponse(**cached)

    sql = text("""
        SELECT
            flight_hash, origin_iata, dest_iata,
            origin_city, dest_city, origin_country, dest_country,
            origin_flag, dest_flag,
            departure_at, return_at, duration_h, duration_days,
            airline, is_direct, stops,
            price_eur, avg_price_90d, savings_pct,
            deal_score, deal_tier,
            price_score, price_tier_score, directness_score, duration_score, dest_score,
            deep_link, created_at, valid_until
        FROM gold_deals
        WHERE flight_hash = :deal_id
        LIMIT 1
    """)
    result = await db.execute(sql, {"deal_id": deal_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal introuvable.")

    deal = DealResponse(**_row_to_dict(row))
    await cache_set(cache_key, deal.model_dump(), ttl=900)
    return deal


# ── GET /deals/{id}/hostels ───────────────────────────────────────────────────

@router.get("/{deal_id}/hostels", response_model=list[HostelResponse])
async def get_deal_hostels(
    deal_id: str,
    db: AsyncSession = Depends(get_warehouse_db),
    app_db: AsyncSession = Depends(__import__("dependencies").get_db),
):
    """Returns hostel options matching the deal's destination and travel dates."""
    cache_key = f"deals:{deal_id}:hostels"
    cached = await cache_get(cache_key)
    if cached:
        return [HostelResponse(**h) for h in cached]

    deal_sql = text("SELECT dest_iata, departure_at, return_at, duration_days FROM gold_deals WHERE flight_hash = :id LIMIT 1")
    deal_result = await db.execute(deal_sql, {"id": deal_id})
    deal_row = deal_result.fetchone()
    if not deal_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal introuvable.")

    row_dict = dict(deal_row._mapping)
    checkin_date = row_dict["departure_at"].date()
    if not row_dict["return_at"]:
        return []

    hostel_sql = text("""
        SELECT
            hostel_name AS name, city_code AS dest_iata,
            price_per_night_eur, rating, booking_url,
            hostel_hash AS hostel_id,
            check_in::TEXT AS checkin, check_out::TEXT AS checkout
        FROM bronze_hostel_prices
        WHERE
            city_code = :dest_iata
            AND check_in BETWEEN :checkin - INTERVAL '1 day' AND :checkin + INTERVAL '1 day'
        ORDER BY price_per_night_eur ASC
        LIMIT 5
    """)
    hostel_result = await app_db.execute(hostel_sql, {
        "dest_iata": row_dict["dest_iata"],
        "checkin": checkin_date,
    })
    hostels = [HostelResponse(**_row_to_dict(r)) for r in hostel_result.fetchall()]
    await cache_set(cache_key, [h.model_dump() for h in hostels], ttl=3600)
    return hostels


# ── GET /deals/{id}/price-history ─────────────────────────────────────────────

@router.get("/{deal_id}/price-history", response_model=PriceHistoryResponse)
async def get_price_history(
    deal_id: str,
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_warehouse_db),
):
    """Returns 90-day price history for the route of a given deal."""
    cache_key = f"deals:{deal_id}:price-history:{days}"
    cached = await cache_get(cache_key)
    if cached:
        return PriceHistoryResponse(**cached)

    deal_sql = text("SELECT origin_iata, dest_iata, price_eur, avg_price_90d FROM gold_deals WHERE flight_hash = :id LIMIT 1")
    deal_result = await db.execute(deal_sql, {"id": deal_id})
    deal_row = deal_result.fetchone()
    if not deal_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal introuvable.")

    dr = dict(deal_row._mapping)

    history_sql = text("""
        SELECT
            time_bucket('1 day', fetched_at)::DATE::TEXT AS date,
            ROUND(MIN(price_eur)::NUMERIC, 2) AS price
        FROM silver_flights
        WHERE
            origin_iata = :origin
            AND dest_iata = :dest
            AND fetched_at >= NOW() - (:days * INTERVAL '1 day')
        GROUP BY 1
        ORDER BY 1 ASC
    """)
    try:
        history_result = await db.execute(history_sql, {
            "origin": dr["origin_iata"],
            "dest": dr["dest_iata"],
            "days": days,
        })
        history_rows = history_result.fetchall()
        points = [PricePoint(date=r[0], price=float(r[1])) for r in history_rows]
    except Exception:
        points = []

    response = PriceHistoryResponse(
        origin_iata=dr["origin_iata"],
        dest_iata=dr["dest_iata"],
        points=points,
        avg_price=float(dr["avg_price_90d"]),
        min_price=min((p.price for p in points), default=float(dr["price_eur"])),
        current_price=float(dr["price_eur"]),
    )
    await cache_set(cache_key, response.model_dump(), ttl=3600)
    return response
