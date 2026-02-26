"""
Kiwi Tequila API client.
Docs: https://tequila.kiwi.com/portal/docs/tequila_api/search_api

Free tier: register at https://tequila.kiwi.com and get an API key.
Rate limits: ~10 req/s, monthly quota depends on partner tier.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# EU destinations we care about — grouped by region for easier maintenance
EU_DESTINATIONS = [
    # Western Europe
    "BCN", "LIS", "OPO", "DUB", "AMS", "BRU",
    # Eastern Europe
    "PRG", "BUD", "WAW", "KRK", "VIE", "BTS",
    # Southern Europe / Mediterranean
    "FCO", "CIA", "ATH", "SVQ", "PMI", "VLC", "AGP",
    # Northern / Baltic
    "CPH", "ARN", "HEL", "TLL", "RIX", "VNO",
    # Balkans / Southeast
    "ZAG", "SOF", "OTP", "SKP", "TIA", "BEG",
]

FRENCH_AIRPORTS = ["CDG", "ORY", "LYS", "MRS", "BOD", "NTE", "NCE", "TLS", "LIL"]


class KiwiTequilaClient:
    BASE_URL = "https://tequila.kiwi.com/v2"

    def __init__(self, api_key: str, max_retries: int = 3):
        self.api_key = api_key
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers={"apikey": self.api_key},
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=5, max_keepalive_connections=3),
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()

    async def search_cheapest_round_trips(
        self,
        fly_from: str,
        destinations: Optional[list[str]] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        nights_in_dst_from: int = 2,
        nights_in_dst_to: int = 10,
        limit: int = 100,
        curr: str = "EUR",
        max_stopovers: int = 1,
    ) -> list[dict]:
        """
        Search for the cheapest round-trip flights from `fly_from` to a list of
        EU destinations. Uses Kiwi's `one_for_city=1` to return only the cheapest
        option per destination city.

        Args:
            fly_from: Origin IATA airport code (e.g. "CDG").
            destinations: List of destination IATA codes. Defaults to EU_DESTINATIONS.
            date_from: Earliest departure date "dd/mm/yyyy". Defaults to today+3d.
            date_to: Latest departure date "dd/mm/yyyy". Defaults to today+90d.
            nights_in_dst_from: Minimum nights at destination.
            nights_in_dst_to: Maximum nights at destination.
            limit: Max results returned (Kiwi default 200).
            curr: Currency code (EUR).
            max_stopovers: Max stopovers per leg (1 = at most 1 connection).

        Returns:
            List of raw Kiwi flight dicts (see parse_kiwi_result for structure).
        """
        if destinations is None:
            destinations = EU_DESTINATIONS

        # Default date window: +3 days to +90 days from today
        now = datetime.utcnow()
        if date_from is None:
            date_from = (now + timedelta(days=3)).strftime("%d/%m/%Y")
        if date_to is None:
            date_to = (now + timedelta(days=90)).strftime("%d/%m/%Y")

        fly_to = ",".join(destinations)

        params = {
            "fly_from": fly_from,
            "fly_to": fly_to,
            "date_from": date_from,
            "date_to": date_to,
            "nights_in_dst_from": nights_in_dst_from,
            "nights_in_dst_to": nights_in_dst_to,
            "flight_type": "round",
            "one_for_city": 1,  # cheapest flight per destination city
            "curr": curr,
            "limit": limit,
            "sort": "price",
            "max_stopovers": max_stopovers,
        }

        return await self._get_with_retry("/search", params, context=f"{fly_from}→EU")

    async def _get_with_retry(
        self,
        endpoint: str,
        params: dict,
        context: str = "",
    ) -> list[dict]:
        """Make a GET request with exponential backoff on rate limit / server errors."""
        url = f"{self.BASE_URL}{endpoint}"

        for attempt in range(1, self.max_retries + 1):
            try:
                response = await self.client.get(url, params=params)

                if response.status_code == 429:
                    wait = 60 * attempt
                    logger.warning(
                        f"[{context}] Rate limited (attempt {attempt}). "
                        f"Waiting {wait}s..."
                    )
                    await asyncio.sleep(wait)
                    continue

                if response.status_code >= 500:
                    wait = 10 * attempt
                    logger.warning(
                        f"[{context}] Server error {response.status_code} "
                        f"(attempt {attempt}). Waiting {wait}s..."
                    )
                    await asyncio.sleep(wait)
                    continue

                response.raise_for_status()
                data = response.json()
                results = data.get("data", [])

                logger.info(
                    f"[{context}] Fetched {len(results)} flights "
                    f"(currency: {data.get('currency', 'EUR')})"
                )
                return results

            except httpx.HTTPStatusError as e:
                logger.error(f"[{context}] HTTP error (attempt {attempt}): {e}")
                if attempt == self.max_retries:
                    return []
            except httpx.RequestError as e:
                logger.error(f"[{context}] Request error (attempt {attempt}): {e}")
                if attempt == self.max_retries:
                    return []
            except Exception as e:
                logger.error(f"[{context}] Unexpected error (attempt {attempt}): {e}")
                return []

        return []
