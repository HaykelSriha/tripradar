"""
Tests for the auth endpoints: register, login, refresh, logout, Google OAuth.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_db
from main import app
from models.user import User, UserNotificationPrefs, UserPreferences


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user(email="alice@example.com", name="Alice", pw_hash=None, active=True):
    u = MagicMock(spec=User)
    u.id = uuid.uuid4()
    u.email = email
    u.name = name
    u.password_hash = pw_hash or _hash("secret123")
    u.is_active = active
    u.is_premium = False
    return u


def _hash(password: str) -> str:
    from services.auth import hash_password
    return hash_password(password)


async def _db_override(mock_session):
    async def _inner():
        yield mock_session
    return _inner


# ── Register ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success():
    new_user = _make_user()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    # First execute: no existing user → scalar_one_or_none returns None
    mock_result_none = MagicMock()
    mock_result_none.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result_none)
    mock_db.add = MagicMock()

    # After commit, refresh sets the user object
    async def _refresh(obj):
        obj.id = new_user.id
        obj.is_premium = False
    mock_db.refresh = _refresh

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    with patch("services.cache.store_refresh_token", AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/auth/register", json={
                "email": "alice@example.com",
                "name": "Alice",
                "password": "secret123",
            })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email():
    existing = _make_user()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/auth/register", json={
            "email": "alice@example.com",
            "name": "Alice",
            "password": "secret123",
        })

    app.dependency_overrides.clear()
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_password_too_short():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/auth/register", json={
            "email": "bob@example.com",
            "name": "Bob",
            "password": "short",
        })
    assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success():
    user = _make_user(pw_hash=_hash("secret123"))

    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    with patch("services.cache.store_refresh_token", AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/auth/login", json={
                "email": "alice@example.com",
                "password": "secret123",
            })

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password():
    user = _make_user(pw_hash=_hash("correctpassword"))

    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/auth/login", json={
            "email": "alice@example.com",
            "password": "wrongpassword",
        })

    app.dependency_overrides.clear()
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user():
    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/auth/login", json={
            "email": "nobody@example.com",
            "password": "anything",
        })

    app.dependency_overrides.clear()
    assert resp.status_code == 401


# ── Refresh ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token_success():
    user = _make_user()
    refresh_tok = "valid-refresh-token-uuid"

    mock_db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    with patch("routers.auth.get_refresh_token_user", AsyncMock(return_value=str(user.id))):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/auth/refresh", json={"refresh_token": refresh_tok})

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_refresh_token_invalid():
    mock_db = AsyncMock(spec=AsyncSession)

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override

    with patch("routers.auth.get_refresh_token_user", AsyncMock(return_value=None)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/auth/refresh", json={"refresh_token": "bad-token"})

    app.dependency_overrides.clear()
    assert resp.status_code == 401


# ── Logout ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_logout():
    with patch("routers.auth.delete_refresh_token", AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/auth/logout", json={"refresh_token": "some-token"})
    assert resp.status_code == 204


# ── JWT decode ────────────────────────────────────────────────────────────────

def test_jwt_round_trip():
    from services.auth import create_access_token, decode_access_token

    uid = uuid.uuid4()
    token = create_access_token(uid, "test@example.com", "Test", False)
    payload = decode_access_token(token)

    assert payload["sub"] == str(uid)
    assert payload["email"] == "test@example.com"
    assert payload["type"] == "access"


def test_jwt_invalid_raises():
    from jose import JWTError
    from services.auth import decode_access_token

    with pytest.raises(JWTError):
        decode_access_token("not-a-real-jwt")
