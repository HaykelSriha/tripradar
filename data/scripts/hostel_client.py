"""
hostel_client.py — Hostelworld API client for TripRadar.

Fetches hostel/budget accommodation availability and prices for a given
destination and date range. Falls back gracefully when the API is unavailable.

Usage (CLI):
    python hostel_client.py --dest BCN --checkin 2025-03-15 --checkout 2025-03-18

Usage (importable):
    from hostel_client import fetch_hostels
    hostels = await fetch_hostels("BCN", "2025-03-15", "2025-03-18")
"""

import argparse
import asyncio
import logging
import os
import sys
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

HOSTELWORLD_API_KEY = os.getenv("HOSTELWORLD_API_KEY", "")
HOSTELWORLD_BASE_URL = "https://api.hostelworld.com/2.0"

# City → Hostelworld city ID mapping for popular EU destinations
HW_CITY_IDS: dict[str, str] = {
    "BCN": "99",    # Barcelona
    "LIS": "119",   # Lisbon
    "PRG": "52",    # Prague
    "BUD": "85",    # Budapest
    "KRK": "112",   # Krakow
    "ATH": "80",    # Athens
    "DUB": "87",    # Dublin
    "AMS": "37",    # Amsterdam
    "BER": "66",    # Berlin
    "FCO": "92",    # Rome
    "VIE": "56",    # Vienna
    "CPH": "53",    # Copenhagen
    "WAW": "113",   # Warsaw
    "OPO": "123",   # Porto
    "MAD": "125",   # Madrid
    "NAP": "101",   # Naples
    "MXP": "91",    # Milan
}


@dataclass
class HostelResult:
    hostel_id: str
    name: str
    city: str
    dest_iata: str
    price_per_night_eur: float
    rating: float  # 0-100 Hostelworld rating
    booking_url: str
    image_url: Optional[str]
    dorm_available: bool
    private_available: bool
    checkin: str
    checkout: str
    nights: int


async def fetch_hostels(
    dest_iata: str,
    checkin: str,
    checkout: str,
    max_price_per_night: float = 40.0,
    limit: int = 5,
) -> list[HostelResult]:
    """
    Fetch hostel options for a destination and date range.

    Args:
        dest_iata: Destination IATA code (e.g. "BCN")
        checkin: Check-in date ISO string (YYYY-MM-DD)
        checkout: Check-out date ISO string (YYYY-MM-DD)
        max_price_per_night: Filter out hostels above this nightly rate
        limit: Maximum number of results to return

    Returns:
        List of HostelResult objects sorted by price ascending.
        Empty list on error or unsupported destination.
    """
    city_id = HW_CITY_IDS.get(dest_iata.upper())
    if not city_id:
        logger.info("No Hostelworld city ID for IATA %s — skipping", dest_iata)
        return []

    if not HOSTELWORLD_API_KEY:
        logger.warning("HOSTELWORLD_API_KEY not set — returning empty hostel list")
        return []

    from datetime import date

    checkin_date = date.fromisoformat(checkin)
    checkout_date = date.fromisoformat(checkout)
    nights = (checkout_date - checkin_date).days
    if nights <= 0:
        return []

    params = {
        "city_id": city_id,
        "date_from": checkin,
        "date_to": checkout,
        "currency": "EUR",
        "language": "fr",
        "number_of_guests": 1,
        "sort": "price",
        "limit": limit * 2,  # fetch extra, filter below
    }

    headers = {
        "Authorization": f"Bearer {HOSTELWORLD_API_KEY}",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{HOSTELWORLD_BASE_URL}/properties",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Hostelworld API error %d for %s: %s", exc.response.status_code, dest_iata, exc)
        return []
    except Exception as exc:
        logger.error("Hostelworld fetch failed for %s: %s", dest_iata, exc)
        return []

    results: list[HostelResult] = []
    for prop in data.get("properties", []):
        try:
            price_per_night = float(prop.get("lowestPricePerPerson", {}).get("value", 9999))
            if price_per_night > max_price_per_night:
                continue

            rating_raw = prop.get("overallRating", {}).get("overall", 0)
            rating = float(rating_raw) if rating_raw else 0.0

            images = prop.get("images", [])
            image_url = images[0].get("prefix", "") + "/{width}x{height}/" + images[0].get("suffix", "") if images else None

            results.append(
                HostelResult(
                    hostel_id=str(prop.get("id", "")),
                    name=prop.get("name", ""),
                    city=prop.get("address", {}).get("city", dest_iata),
                    dest_iata=dest_iata.upper(),
                    price_per_night_eur=price_per_night,
                    rating=rating,
                    booking_url=f"https://www.hostelworld.com/pwa/hosteldetails.php/{prop.get('urlFriendlyName', '')}/{city_id}/{prop.get('id', '')}",
                    image_url=image_url,
                    dorm_available=any(r.get("type") == "dorm" for r in prop.get("roomTypes", [])),
                    private_available=any(r.get("type") == "private" for r in prop.get("roomTypes", [])),
                    checkin=checkin,
                    checkout=checkout,
                    nights=nights,
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            logger.debug("Skipping property due to parse error: %s", exc)
            continue

    results.sort(key=lambda h: h.price_per_night_eur)
    return results[:limit]


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch hostels for a destination")
    parser.add_argument("--dest", required=True, help="IATA destination code (e.g. BCN)")
    parser.add_argument("--checkin", required=True, help="Check-in date (YYYY-MM-DD)")
    parser.add_argument("--checkout", required=True, help="Check-out date (YYYY-MM-DD)")
    parser.add_argument("--max-price", type=float, default=40.0, help="Max price per night EUR")
    parser.add_argument("--limit", type=int, default=5, help="Max results")
    return parser.parse_args()


async def _main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = _parse_args()
    hostels = await fetch_hostels(
        dest_iata=args.dest,
        checkin=args.checkin,
        checkout=args.checkout,
        max_price_per_night=args.max_price,
        limit=args.limit,
    )
    if not hostels:
        print("No hostels found.")
        sys.exit(0)
    for h in hostels:
        print(f"  [{h.rating:.0f}] {h.name} — {h.price_per_night_eur:.0f}€/nuit — {h.booking_url}")


if __name__ == "__main__":
    asyncio.run(_main())
