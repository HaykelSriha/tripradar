"""
Unit tests for db_utils.py — parsing and hashing functions.
No database connection required (uses pure Python logic only).
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db_utils import compute_flight_hash, parse_kiwi_result


MOCK_RAW_FLIGHT = {
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
            "return": 0,
            "airline": "FR",
        },
        {
            "flyFrom": "PRG",
            "flyTo": "CDG",
            "utc_departure": "2025-03-18T19:00:00.000Z",
            "utc_arrival": "2025-03-18T21:15:00.000Z",
            "return": 1,
            "airline": "FR",
        },
    ],
    "deep_link": "https://www.kiwi.com/booking?token=xyz",
}


class TestComputeFlightHash:
    def test_produces_32_char_hex_string(self):
        h = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 34.0)
        assert len(h) == 32
        assert all(c in "0123456789abcdef" for c in h)

    def test_same_inputs_same_hash(self):
        h1 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 34.0)
        h2 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 34.0)
        assert h1 == h2

    def test_different_price_different_hash(self):
        h1 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 34.0)
        h2 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 35.0)
        assert h1 != h2

    def test_different_route_different_hash(self):
        h1 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 34.0)
        h2 = compute_flight_hash("kiwi", "CDG", "BUD", "2025-03-15T06:30:00Z", None, 34.0)
        assert h1 != h2

    def test_return_at_none_vs_set(self):
        h1 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", None, 34.0)
        h2 = compute_flight_hash("kiwi", "CDG", "PRG", "2025-03-15T06:30:00Z", "2025-03-18T21:15:00Z", 34.0)
        assert h1 != h2


class TestParseKiwiResult:
    def test_parses_valid_flight(self):
        result = parse_kiwi_result(MOCK_RAW_FLIGHT)

        assert result is not None
        assert result["source"] == "kiwi"
        assert result["origin"] == "CDG"
        assert result["destination"] == "PRG"
        assert result["origin_city"] == "Paris"
        assert result["dest_city"] == "Prague"
        assert result["origin_country"] == "France"
        assert result["dest_country"] == "Czech Republic"
        assert result["price_eur"] == 34.0
        assert result["departure_at"] == "2025-03-15T06:30:00.000Z"
        assert result["return_at"] == "2025-03-18T21:15:00.000Z"  # last return leg's utc_arrival
        assert result["airline"] == "FR"
        assert result["airlines"] == ["FR"]
        assert result["is_direct"] is True        # 1 outbound + 1 return leg
        assert result["stops"] == 0
        assert result["deep_link"] == "https://www.kiwi.com/booking?token=xyz"
        assert len(result["flight_hash"]) == 32

    def test_returns_none_on_missing_required_key(self):
        bad_flight = {"flyTo": "PRG", "price": 34.0}  # missing flyFrom, route, etc.
        result = parse_kiwi_result(bad_flight)
        assert result is None

    def test_multi_stop_flight(self):
        flight = dict(MOCK_RAW_FLIGHT)
        flight["route"] = [
            {"flyFrom": "CDG", "flyTo": "FRA", "return": 0, "utc_arrival": "2025-03-15T08:00:00Z", "airline": "LH"},
            {"flyFrom": "FRA", "flyTo": "PRG", "return": 0, "utc_arrival": "2025-03-15T10:00:00Z", "airline": "LH"},
            {"flyFrom": "PRG", "flyTo": "CDG", "return": 1, "utc_arrival": "2025-03-18T21:00:00Z", "airline": "LH"},
        ]
        result = parse_kiwi_result(flight)

        assert result is not None
        assert result["is_direct"] is False
        assert result["stops"] == 1   # 2 outbound legs → 1 stop

    def test_hash_is_stable(self):
        r1 = parse_kiwi_result(MOCK_RAW_FLIGHT)
        r2 = parse_kiwi_result(MOCK_RAW_FLIGHT)
        assert r1 is not None
        assert r2 is not None
        assert r1["flight_hash"] == r2["flight_hash"]
