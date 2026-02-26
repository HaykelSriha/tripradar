"""User-related Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── User Profile ──────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str]
    is_premium: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Preferences ───────────────────────────────────────────────────────────────

class UserPreferencesResponse(BaseModel):
    max_budget_eur: int
    date_flex_days: int
    departure_airports: list[str]
    trip_duration_min: int
    trip_duration_max: int
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdatePreferencesRequest(BaseModel):
    max_budget_eur: Optional[int] = None
    date_flex_days: Optional[int] = None
    departure_airports: Optional[list[str]] = None
    trip_duration_min: Optional[int] = None
    trip_duration_max: Optional[int] = None


# ── Notification Preferences ──────────────────────────────────────────────────

class NotificationPrefsResponse(BaseModel):
    email_enabled: bool
    push_enabled: bool
    min_deal_score: int
    quiet_hours_start: int
    quiet_hours_end: int
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateNotificationPrefsRequest(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    min_deal_score: Optional[int] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None


# ── Watchlist ─────────────────────────────────────────────────────────────────

class WatchlistItem(BaseModel):
    id: uuid.UUID
    destination_code: str
    destination_name: str
    is_region: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AddWatchlistRequest(BaseModel):
    destination_code: str
    destination_name: str
    is_region: bool = False


# ── Alert History ─────────────────────────────────────────────────────────────

class AlertRecord(BaseModel):
    id: uuid.UUID
    deal_id: str
    route: str
    channel: str
    sent_at: datetime
    opened_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Device Registration ───────────────────────────────────────────────────────

class RegisterDeviceRequest(BaseModel):
    fcm_token: str
    platform: str  # "android" | "ios"


class DeviceResponse(BaseModel):
    id: uuid.UUID
    fcm_token: str
    platform: str
    created_at: datetime

    class Config:
        from_attributes = True
