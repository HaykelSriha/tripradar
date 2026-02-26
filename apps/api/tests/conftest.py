"""
Shared pytest fixtures for the API test suite.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user, get_db, get_warehouse_db
from main import app
from models.user import User


# ── HTTP client ───────────────────────────────────────────────────────────────

@pytest.fixture
async def client():
    """Async HTTP test client with no auth and no DB."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ── Mock DB sessions ──────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Mock AsyncSession — patches get_db dependency."""
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def mock_warehouse_db():
    """Mock AsyncSession for warehouse — patches get_warehouse_db dependency."""
    session = AsyncMock(spec=AsyncSession)
    return session


# ── Test user ─────────────────────────────────────────────────────────────────

@pytest.fixture
def test_user_id():
    return uuid.UUID("12345678-1234-1234-1234-123456789abc")


@pytest.fixture
def test_user(test_user_id):
    user = MagicMock(spec=User)
    user.id = test_user_id
    user.email = "test@example.com"
    user.name = "Test User"
    user.is_premium = False
    user.is_active = True
    user.avatar_url = None
    user.created_at = None
    return user


@pytest.fixture
def auth_headers(test_user):
    """Generate a valid JWT for the test user."""
    from services.auth import create_access_token

    token = create_access_token(
        test_user.id, test_user.email, test_user.name, test_user.is_premium
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def authed_client(test_user, mock_db, mock_warehouse_db, auth_headers):
    """
    HTTP client with:
    - Valid auth token for test_user
    - DB dependencies overridden with mocks
    """
    async def _get_db_override():
        yield mock_db

    async def _get_warehouse_db_override():
        yield mock_warehouse_db

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_warehouse_db] = _get_warehouse_db_override
    app.dependency_overrides[get_current_user] = lambda: test_user

    async def _make_client():
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            headers=auth_headers,
        ) as ac:
            return ac

    import asyncio
    client = asyncio.get_event_loop().run_until_complete(_make_client())

    yield client

    app.dependency_overrides.clear()
