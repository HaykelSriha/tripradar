"""Deal-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DealResponse(BaseModel):
    """A single flight deal as returned by the API."""

    flight_hash: str = Field(..., description="Unique deal identifier (MD5)")
    origin_iata: str
    dest_iata: str
    origin_city: str
    dest_city: str
    origin_country: str
    dest_country: str
    origin_flag: str
    dest_flag: str

    departure_at: datetime
    return_at: Optional[datetime]
    duration_h: float
    duration_days: float

    airline: str
    is_direct: bool
    stops: int

    price_eur: float
    avg_price_90d: float
    savings_pct: float

    deal_score: int
    deal_tier: str  # "hot" | "good" | "fair"

    price_score: int
    price_tier_score: int
    directness_score: int
    duration_score: int
    dest_score: int

    deep_link: str
    created_at: datetime
    valid_until: datetime

    class Config:
        from_attributes = True


class PaginatedDeals(BaseModel):
    items: list[DealResponse]
    total: int
    cursor: Optional[str] = None  # next page cursor (deal_score:flight_hash)
    has_more: bool


class DealFilters(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    max_price: Optional[float] = None
    min_score: Optional[int] = None
    tier: Optional[str] = None      # "hot" | "good" | "fair"
    is_direct: Optional[bool] = None
    max_duration_days: Optional[int] = None


class HostelResponse(BaseModel):
    """A hostel option associated with a deal destination."""

    hostel_id: str
    name: str
    city: str
    dest_iata: str
    price_per_night_eur: float
    total_hostel_price_eur: float
    rating: float
    booking_url: str
    image_url: Optional[str] = None
    dorm_available: bool
    private_available: bool
    nights: int
    checkin: str
    checkout: str

    class Config:
        from_attributes = True


class PricePoint(BaseModel):
    """Single point in a price history time series."""

    date: str    # ISO date string YYYY-MM-DD
    price: float


class PriceHistoryResponse(BaseModel):
    """90-day price history for a route."""

    origin_iata: str
    dest_iata: str
    points: list[PricePoint]
    avg_price: float
    min_price: float
    current_price: float
