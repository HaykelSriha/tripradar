"""
Tests for the deals endpoints.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from dependencies import get_warehouse_db
from main import app


def _make_deal_row(
    flight_hash: str = "abc123def456abc123def456abc12345",
    origin_iata: str = "CDG",
    dest_iata: str = "BCN",
    deal_score: int = 82,
    deal_tier: str = "hot",
    price_eur: float = 44.0,
    savings_pct: float = 38.0,
):
    now = datetime.now(timezone.utc)
    mapping = {
        "flight_hash": flight_hash,
        "origin_iata": origin_iata,
        "dest_iata": dest_iata,
        "origin_city": "Paris",
        "dest_city": "Barcelone",
        "origin_country": "France",
        "dest_country": "Espagne",
        "origin_flag": "🇫🇷",
        "dest_flag": "🇪🇸",
        "departure_at": now + timedelta(days=10),
        "return_at": now + timedelta(days=15),
        "duration_h": 130.0,
        "duration_days": 5.0,
        "airline": "VY",
        "is_direct": True,
        "stops": 0,
        "price_eur": price_eur,
        "avg_price_90d": price_eur / (1 - savings_pct / 100),
        "savings_pct": savings_pct,
        "deal_score": deal_score,
        "deal_tier": deal_tier,
        "price_score": 38,
        "price_tier_score": 15,
        "directness_score": 10,
        "duration_score": 10,
        "dest_score": 9,
        "deep_link": "https://www.kiwi.com/booking?token=test",
        "created_at": now,
        "valid_until": now + timedelta(hours=7),
    }
    row = MagicMock()
    row._mapping = mapping
    return row


async def _no_cache_get(key):
    return None


async def _noop_cache_set(key, value, ttl=900):
    pass


@pytest.fixture(autouse=True)
def disable_cache(monkeypatch):
    monkeypatch.setattr("routers.deals.cache_get", _no_cache_get)
    monkeypatch.setattr("routers.deals.cache_set", _noop_cache_set)


# ── GET /deals ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_deals_returns_paginated():
    rows = [_make_deal_row(flight_hash=f"{'a' * 31}{i}") for i in range(3)]

    mock_wh = AsyncMock()
    # First execute: items, second: count
    mock_wh.execute = AsyncMock(side_effect=[
        MagicMock(fetchall=MagicMock(return_value=rows)),
        MagicMock(scalar=MagicMock(return_value=3)),
    ])

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/deals")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["total"] == 3
    assert len(data["items"]) == 3


@pytest.mark.asyncio
async def test_list_deals_empty():
    mock_wh = AsyncMock()
    mock_wh.execute = AsyncMock(side_effect=[
        MagicMock(fetchall=MagicMock(return_value=[])),
        MagicMock(scalar=MagicMock(return_value=0)),
    ])

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/deals")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["items"] == []
    assert resp.json()["total"] == 0


# ── GET /deals/top ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_top_deals():
    rows = [_make_deal_row(flight_hash=f"{'b' * 31}{i}", deal_score=90 - i) for i in range(5)]

    mock_wh = AsyncMock()
    mock_wh.execute = AsyncMock(return_value=MagicMock(fetchall=MagicMock(return_value=rows)))

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/deals/top?limit=5")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 5


# ── GET /deals/inspire ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_inspire_deals():
    rows = [_make_deal_row(flight_hash=f"{'c' * 31}{i}") for i in range(4)]

    mock_wh = AsyncMock()
    mock_wh.execute = AsyncMock(return_value=MagicMock(fetchall=MagicMock(return_value=rows)))

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/deals/inspire")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── GET /deals/{id} ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_deal_found():
    deal_hash = "abc123def456abc123def456abc12345"
    row = _make_deal_row(flight_hash=deal_hash)

    mock_wh = AsyncMock()
    mock_wh.execute = AsyncMock(return_value=MagicMock(fetchone=MagicMock(return_value=row)))

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/deals/{deal_hash}")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["flight_hash"] == deal_hash


@pytest.mark.asyncio
async def test_get_deal_not_found():
    mock_wh = AsyncMock()
    mock_wh.execute = AsyncMock(return_value=MagicMock(fetchone=MagicMock(return_value=None)))

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/deals/nonexistenthash000000000000000")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


# ── Deal filter validation ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_tier_filter():
    mock_wh = AsyncMock()

    async def _override():
        yield mock_wh

    app.dependency_overrides[get_warehouse_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/deals?tier=invalid")

    app.dependency_overrides.clear()

    assert resp.status_code == 422  # Validation error
