"""
Unit tests for the Kiwi Tequila API client.
Uses pytest-httpx to mock HTTP responses — no real API calls made.
"""

import pytest
import httpx
from pytest_httpx import HTTPXMock

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from kiwi_client import KiwiTequilaClient


MOCK_FLIGHT_RESPONSE = {
    "data": [
        {
            "id": "abc123",
            "flyFrom": "CDG",
            "flyTo": "PRG",
            "cityFrom": "Paris",
            "cityTo": "Prague",
            "countryFrom": {"code": "FR", "name": "France"},
            "countryTo": {"code": "CZ", "name": "Czech Republic"},
            "utc_departure": "2025-03-15T06:30:00.000Z",
            "price": 34.0,
            "airlines": ["FR"],
            "route": [
                {
                    "flyFrom": "CDG",
                    "flyTo": "PRG",
                    "utc_departure": "2025-03-15T06:30:00.000Z",
                    "utc_arrival": "2025-03-15T08:45:00.000Z",
                    "local_departure": "2025-03-15T07:30:00.000Z",
                    "local_arrival": "2025-03-15T09:45:00.000Z",
                    "return": 0,
                    "airline": "FR",
                },
                {
                    "flyFrom": "PRG",
                    "flyTo": "CDG",
                    "utc_departure": "2025-03-18T19:00:00.000Z",
                    "utc_arrival": "2025-03-18T21:15:00.000Z",
                    "local_departure": "2025-03-18T20:00:00.000Z",
                    "local_arrival": "2025-03-18T22:15:00.000Z",
                    "return": 1,
                    "airline": "FR",
                },
            ],
            "deep_link": "https://www.kiwi.com/booking?token=xyz",
        }
    ],
    "currency": "EUR",
    "search_id": "test-search-id",
}


@pytest.mark.asyncio
async def test_search_returns_flights(httpx_mock: HTTPXMock):
    """Client correctly parses a successful API response."""
    httpx_mock.add_response(
        url=httpx.URL("https://tequila.kiwi.com/v2/search"),
        match_headers={"apikey": "test-key"},
        json=MOCK_FLIGHT_RESPONSE,
    )

    client = KiwiTequilaClient(api_key="test-key")
    results = await client.search_cheapest_round_trips(
        fly_from="CDG",
        destinations=["PRG"],
        date_from="15/03/2025",
        date_to="30/04/2025",
    )
    await client.close()

    assert len(results) == 1
    assert results[0]["flyFrom"] == "CDG"
    assert results[0]["flyTo"] == "PRG"
    assert results[0]["price"] == 34.0


@pytest.mark.asyncio
async def test_empty_response_on_api_error(httpx_mock: HTTPXMock):
    """Client returns empty list on server error (5xx)."""
    httpx_mock.add_response(
        url=httpx.URL("https://tequila.kiwi.com/v2/search"),
        status_code=500,
    )

    client = KiwiTequilaClient(api_key="test-key", max_retries=1)
    results = await client.search_cheapest_round_trips(
        fly_from="CDG",
        destinations=["PRG"],
    )
    await client.close()

    assert results == []


@pytest.mark.asyncio
async def test_empty_response_on_404(httpx_mock: HTTPXMock):
    """Client returns empty list on 404."""
    httpx_mock.add_response(
        url=httpx.URL("https://tequila.kiwi.com/v2/search"),
        status_code=404,
    )

    client = KiwiTequilaClient(api_key="test-key", max_retries=1)
    results = await client.search_cheapest_round_trips(
        fly_from="CDG",
        destinations=["PRG"],
    )
    await client.close()

    assert results == []


@pytest.mark.asyncio
async def test_context_manager():
    """Client works as async context manager."""
    async with KiwiTequilaClient(api_key="test-key") as client:
        assert client is not None
    # After __aexit__, client should be closed (no error)
