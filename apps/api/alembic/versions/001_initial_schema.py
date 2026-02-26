"""Initial schema — all app-db tables

Revision ID: 001
Revises:
Create Date: 2025-02-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("is_premium", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean, nullable=False,
                  server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── user_providers (OAuth) ────────────────────────────────────────────────
    op.create_table(
        "user_providers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("provider_id", sa.String(255), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "provider_id",
                            name="uq_user_providers_provider_id"),
    )

    # ── user_device_tokens (FCM push) ────────────────────────────────────────
    op.create_table(
        "user_device_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fcm_token", sa.Text, nullable=False, unique=True),
        sa.Column("platform", sa.String(10), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
    )

    # ── user_preferences ──────────────────────────────────────────────────────
    op.create_table(
        "user_preferences",
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("max_budget_eur", sa.Integer, nullable=False,
                  server_default=sa.text("150")),
        sa.Column("date_flex_days", sa.Integer, nullable=False,
                  server_default=sa.text("14")),
        sa.Column("departure_airports", ARRAY(sa.String), nullable=False,
                  server_default=sa.text("'{}'::text[]")),
        sa.Column("trip_duration_min", sa.Integer, nullable=False,
                  server_default=sa.text("2")),
        sa.Column("trip_duration_max", sa.Integer, nullable=False,
                  server_default=sa.text("7")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
    )

    # ── user_notification_prefs ───────────────────────────────────────────────
    op.create_table(
        "user_notification_prefs",
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("email_enabled", sa.Boolean, nullable=False,
                  server_default=sa.text("true")),
        sa.Column("push_enabled", sa.Boolean, nullable=False,
                  server_default=sa.text("true")),
        sa.Column("min_deal_score", sa.Integer, nullable=False,
                  server_default=sa.text("70")),
        sa.Column("quiet_hours_start", sa.Integer, nullable=False,
                  server_default=sa.text("22")),
        sa.Column("quiet_hours_end", sa.Integer, nullable=False,
                  server_default=sa.text("8")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
    )

    # ── user_watchlist_destinations ───────────────────────────────────────────
    op.create_table(
        "user_watchlist_destinations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("destination_code", sa.String(10), nullable=False),
        sa.Column("destination_name", sa.String(255), nullable=False),
        sa.Column("is_region", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "destination_code",
                            name="uq_watchlist_user_dest"),
    )

    # ── alerts_sent (dedup + history) ─────────────────────────────────────────
    op.create_table(
        "alerts_sent",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("deal_id", sa.String(255), nullable=False),
        sa.Column("route", sa.String(20), nullable=False),  # e.g. "CDG-PRG"
        sa.Column("channel", sa.String(20), nullable=False),  # "push" | "email"
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.func.now()),
        sa.Column("opened_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    # ── indexes ───────────────────────────────────────────────────────────────
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_device_tokens_user", "user_device_tokens", ["user_id"])
    op.create_index("ix_watchlist_user", "user_watchlist_destinations", ["user_id"])
    op.create_index("ix_alerts_user_route_sent",
                    "alerts_sent", ["user_id", "route", "sent_at"])


def downgrade() -> None:
    op.drop_index("ix_alerts_user_route_sent", table_name="alerts_sent")
    op.drop_index("ix_watchlist_user", table_name="user_watchlist_destinations")
    op.drop_index("ix_device_tokens_user", table_name="user_device_tokens")
    op.drop_index("ix_users_email", table_name="users")

    op.drop_table("alerts_sent")
    op.drop_table("user_watchlist_destinations")
    op.drop_table("user_notification_prefs")
    op.drop_table("user_preferences")
    op.drop_table("user_device_tokens")
    op.drop_table("user_providers")
    op.drop_table("users")
