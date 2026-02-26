"""
Tests for user-facing endpoints: profile, preferences, watchlist, alerts, devices.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from dependencies import get_current_user, get_db
from main import app
from models.user import (
    AlertSent,
    User,
    UserDeviceToken,
    UserNotificationPrefs,
    UserPreferences,
    UserWatchlistDestination,
)
from services.auth import create_access_token


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _make_test_user():
    user = MagicMock(spec=User)
    user.id = uuid.UUID("aaaabbbb-cccc-dddd-eeee-ffffffffffff")
    user.email = "testuser@example.com"
    user.name = "Test User"
    user.is_premium = False
    user.is_active = True
    user.avatar_url = None
    user.created_at = datetime.now(timezone.utc)
    return user


def _auth_override(user):
    def _dep():
        return user
    return _dep


def _db_override(mock_session):
    async def _inner():
        yield mock_session
    return _inner


# ── GET /users/me ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_profile_authenticated():
    user = _make_test_user()

    app.dependency_overrides[get_current_user] = _auth_override(user)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/users/me")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "testuser@example.com"
    assert data["name"] == "Test User"


@pytest.mark.asyncio
async def test_get_profile_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/users/me")
    # Missing Authorization header → 403 (FastAPI HTTPBearer returns 403 if no credentials)
    assert resp.status_code in (401, 403)


# ── PATCH /users/me ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_profile():
    user = _make_test_user()
    user.name = "Original Name"

    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()

    async def _refresh(obj):
        pass

    mock_db.refresh = _refresh

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.patch("/users/me", json={"name": "New Name"})

    app.dependency_overrides.clear()

    assert resp.status_code == 200


# ── GET /users/me/preferences ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_preferences():
    user = _make_test_user()

    prefs = MagicMock(spec=UserPreferences)
    prefs.user_id = user.id
    prefs.max_budget_eur = 150
    prefs.date_flex_days = 14
    prefs.departure_airports = ["CDG", "ORY"]
    prefs.trip_duration_min = 2
    prefs.trip_duration_max = 7
    prefs.updated_at = datetime.now(timezone.utc)

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = prefs
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/users/me/preferences")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["max_budget_eur"] == 150
    assert data["departure_airports"] == ["CDG", "ORY"]


# ── GET /users/me/watchlist ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_watchlist():
    user = _make_test_user()

    item = MagicMock(spec=UserWatchlistDestination)
    item.id = uuid.uuid4()
    item.destination_code = "BCN"
    item.destination_name = "Barcelone"
    item.is_region = False
    item.created_at = datetime.now(timezone.utc)

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [item]
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/users/me/watchlist")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["destination_code"] == "BCN"


@pytest.mark.asyncio
async def test_add_to_watchlist():
    user = _make_test_user()

    new_item = MagicMock(spec=UserWatchlistDestination)
    new_item.id = uuid.uuid4()
    new_item.destination_code = "PRG"
    new_item.destination_name = "Prague"
    new_item.is_region = False
    new_item.created_at = datetime.now(timezone.utc)

    mock_db = AsyncMock()
    # First execute: check duplicate → None
    mock_none = MagicMock()
    mock_none.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_none)
    mock_db.commit = AsyncMock()

    async def _refresh(obj):
        obj.id = new_item.id
        obj.destination_code = "PRG"
        obj.destination_name = "Prague"
        obj.is_region = False
        obj.created_at = new_item.created_at

    mock_db.refresh = _refresh
    mock_db.add = MagicMock()

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/users/me/watchlist", json={
            "destination_code": "PRG",
            "destination_name": "Prague",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["destination_code"] == "PRG"


@pytest.mark.asyncio
async def test_add_watchlist_duplicate():
    user = _make_test_user()

    existing_item = MagicMock(spec=UserWatchlistDestination)
    existing_item.destination_code = "PRG"

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_item
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/users/me/watchlist", json={
            "destination_code": "PRG",
            "destination_name": "Prague",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 409


# ── GET /users/me/alerts ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_alert_history():
    user = _make_test_user()

    alert = MagicMock(spec=AlertSent)
    alert.id = uuid.uuid4()
    alert.deal_id = "abc123"
    alert.route = "CDG-BCN"
    alert.channel = "push"
    alert.sent_at = datetime.now(timezone.utc)
    alert.opened_at = None

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [alert]
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/users/me/alerts")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["route"] == "CDG-BCN"


# ── Device registration ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_device():
    user = _make_test_user()

    new_token = MagicMock(spec=UserDeviceToken)
    new_token.id = uuid.uuid4()
    new_token.fcm_token = "test-fcm-token"
    new_token.platform = "android"
    new_token.created_at = datetime.now(timezone.utc)

    mock_db = AsyncMock()
    mock_none = MagicMock()
    mock_none.scalar_one_or_none.return_value = None  # no existing token
    mock_db.execute = AsyncMock(return_value=mock_none)
    mock_db.commit = AsyncMock()

    async def _refresh(obj):
        obj.id = new_token.id
        obj.fcm_token = "test-fcm-token"
        obj.platform = "android"
        obj.created_at = new_token.created_at

    mock_db.refresh = _refresh
    mock_db.add = MagicMock()

    app.dependency_overrides[get_current_user] = _auth_override(user)
    app.dependency_overrides[get_db] = _db_override(mock_db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/users/me/devices", json={
            "fcm_token": "test-fcm-token",
            "platform": "android",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["fcm_token"] == "test-fcm-token"
    assert resp.json()["platform"] == "android"
