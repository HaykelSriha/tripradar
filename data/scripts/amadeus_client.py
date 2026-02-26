"""
Amadeus Self-Service API client.
Docs: https://developers.amadeus.com

Free tiers:
  - Test environment: unlimited calls with simulated data
  - Production: 2000 API calls/month (free tier)

Sign up: https://developers.amadeus.com → create an app → get Client ID + Secret.
Set AMADEUS_ENV=test for development, AMADEUS_ENV=production for real data.
"""

import logging
import os
from typing import Optional

from amadeus import Client, ResponseError

logger = logging.getLogger(__name__)

# ── Target airports ────────────────────────────────────────────────────────────

FRENCH_AIRPORTS = ["CDG", "ORY", "LYS", "MRS", "BOD", "NTE", "NCE", "TLS", "LIL"]

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

_EU_DEST_SET = set(EU_DESTINATIONS)


class AmadeusClient:
    """
    Synchronous Amadeus API client for flight search.

    Usage:
        client = AmadeusClient()  # reads from env vars
        results = client.search_cheap_destinations("CDG")
        for item in results:
            print(item["destination"], item["price"]["total"])
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        hostname: Optional[str] = None,
    ):
        self._client_id = client_id or os.environ["AMADEUS_CLIENT_ID"]
        self._client_secret = client_secret or os.environ["AMADEUS_CLIENT_SECRET"]
        # "test" = free unlimited sandbox; "production" = real data (2000 req/mo free)
        self._hostname = hostname or os.getenv("AMADEUS_ENV", "test")
        self._amadeus: Optional[Client] = None

    @property
    def amadeus(self) -> Client:
        if self._amadeus is None:
            self._amadeus = Client(
                client_id=self._client_id,
                client_secret=self._client_secret,
                hostname=self._hostname,
                log_level="warning",
            )
        return self._amadeus

    def search_flight_offers(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: Optional[str] = None,
        max_results: int = 3,
        currency: str = "EUR",
    ) -> list[dict]:
        """
        Search flight offers for a specific (origin, destination, departure_date).

        Uses GET /v2/shopping/flight-offers — the only Amadeus endpoint that
        works reliably in both test and production environments.

        Returns full FlightOffer objects which include:
          - Exact departure/arrival times
          - Carrier codes (airlines)
          - Number of stops per itinerary
          - Total price in EUR

        departure_date / return_date format: "YYYY-MM-DD"
        """
        try:
            kwargs: dict = {
                "originLocationCode": origin,
                "destinationLocationCode": destination,
                "departureDate": departure_date,
                "adults": 1,
                "max": max_results,
                "currencyCode": currency,
            }
            if return_date:
                kwargs["returnDate"] = return_date

            response = self.amadeus.shopping.flight_offers_search.get(**kwargs)
            results = response.data or []
            if results:
                logger.debug(
                    f"[{origin}->{destination} {departure_date}] "
                    f"{len(results)} offers, cheapest {results[0]['price']['total']} EUR"
                )
            return results

        except ResponseError as exc:
            # 400 = no flights found for this route/date — normal, log as debug
            status = getattr(getattr(exc, "response", None), "status_code", 0)
            if status == 400:
                logger.debug(f"[{origin}->{destination} {departure_date}] No flights found")
            else:
                logger.warning(f"[{origin}->{destination}] Amadeus error {status}: {exc}")
            return []
        except Exception as exc:
            logger.error(f"[{origin}->{destination}] Unexpected error: {exc}")
            return []
