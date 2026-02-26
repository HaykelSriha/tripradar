"""SQLAlchemy ORM models for the app database (trigradar)."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_premium: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    # Relationships
    providers: Mapped[list["UserProvider"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    device_tokens: Mapped[list["UserDeviceToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    preferences: Mapped[Optional["UserPreferences"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    notification_prefs: Mapped[Optional["UserNotificationPrefs"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    watchlist: Mapped[list["UserWatchlistDestination"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    alerts_sent: Mapped[list["AlertSent"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserProvider(Base):
    __tablename__ = "user_providers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="providers")


class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    fcm_token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="device_tokens")


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    max_budget_eur: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="150"
    )
    date_flex_days: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="14"
    )
    departure_airports: Mapped[list] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )
    trip_duration_min: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="2"
    )
    trip_duration_max: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="7"
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="preferences")


class UserNotificationPrefs(Base):
    __tablename__ = "user_notification_prefs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    email_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    push_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    min_deal_score: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="70"
    )
    quiet_hours_start: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="22"
    )
    quiet_hours_end: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="8"
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="notification_prefs")


class UserWatchlistDestination(Base):
    __tablename__ = "user_watchlist_destinations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    destination_code: Mapped[str] = mapped_column(String(10), nullable=False)
    destination_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_region: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="watchlist")


class AlertSent(Base):
    __tablename__ = "alerts_sent"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    deal_id: Mapped[str] = mapped_column(String(255), nullable=False)
    route: Mapped[str] = mapped_column(String(20), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    opened_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="alerts_sent")
