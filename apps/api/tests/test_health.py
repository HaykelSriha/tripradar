import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from main import app


@pytest.mark.asyncio
async def test_health_check_returns_ok():
    """Health endpoint returns 200 with status ok."""
    # Mock DB so tests don't need a running Postgres
    with patch("routers.health.get_db") as mock_get_db:
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=None)

        async def mock_dependency():
            yield mock_session

        app.dependency_overrides = {}

        from dependencies import get_db
        app.dependency_overrides[get_db] = mock_dependency

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health")

        app.dependency_overrides = {}

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "version" in data
