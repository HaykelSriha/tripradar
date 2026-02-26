"""
Alert matcher service.

Finds users who should receive alerts for a given set of new deals,
enforces dedup (no repeat alert on same route within 24h), and dispatches
FCM push + email notifications.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import (
    User,
    UserDeviceToken,
    UserPreferences,
    UserNotificationPrefs,
    UserWatchlistDestination,
    AlertSent,
)
from services.fcm import send_push_to_tokens
from services.email import send_deal_alert_email

logger = logging.getLogger(__name__)


async def match_and_alert(deals: list[dict], db: AsyncSession) -> dict:
    """
    For each deal, find matching users and send alerts.

    Matching criteria:
    - User has destination in watchlist OR destination matches user prefs implicitly
    - Deal price <= user's max_budget_eur
    - Deal departure airport in user's departure_airports
    - No alert sent for same route in past 24h (dedup)
    - Deal score >= user's min_deal_score
    - Not in quiet hours (checked at send time)

    Returns a dict with stats.
    """
    if not deals:
        return {"deals_processed": 0, "alerts_sent": 0, "errors": 0}

    stats = {"deals_processed": len(deals), "alerts_sent": 0, "errors": 0}
    now = datetime.now(timezone.utc)
    dedup_window = now - timedelta(hours=24)

    for deal in deals:
        try:
            await _process_deal(deal, db, now, dedup_window, stats)
        except Exception as exc:
            logger.error("Error processing deal %s: %s", deal.get("flight_hash"), exc)
            stats["errors"] += 1

    return stats


async def _process_deal(
    deal: dict,
    db: AsyncSession,
    now: datetime,
    dedup_window: datetime,
    stats: dict,
) -> None:
    route = f"{deal['origin_iata']}-{deal['dest_iata']}"
    deal_id = deal["flight_hash"]

    # ── Find users whose watchlist includes this destination ──────────────────
    watchlist_result = await db.execute(
        select(UserWatchlistDestination.user_id)
        .where(UserWatchlistDestination.destination_code == deal["dest_iata"])
    )
    watchlist_user_ids = {row[0] for row in watchlist_result.fetchall()}

    if not watchlist_user_ids:
        return  # No one watching this destination

    # ── Load matching users with their prefs ──────────────────────────────────
    result = await db.execute(
        select(User, UserPreferences, UserNotificationPrefs)
        .join(UserPreferences, User.id == UserPreferences.user_id, isouter=True)
        .join(UserNotificationPrefs, User.id == UserNotificationPrefs.user_id, isouter=True)
        .where(
            and_(
                User.id.in_(watchlist_user_ids),
                User.is_active == True,
            )
        )
    )
    user_rows = result.fetchall()

    for user, prefs, notif_prefs in user_rows:
        try:
            await _alert_user_if_matched(
                user=user,
                prefs=prefs,
                notif_prefs=notif_prefs,
                deal=deal,
                deal_id=deal_id,
                route=route,
                db=db,
                now=now,
                dedup_window=dedup_window,
                stats=stats,
            )
        except Exception as exc:
            logger.error("Error alerting user %s for deal %s: %s", user.id, deal_id, exc)
            stats["errors"] += 1


async def _alert_user_if_matched(
    user: User,
    prefs: UserPreferences | None,
    notif_prefs: UserNotificationPrefs | None,
    deal: dict,
    deal_id: str,
    route: str,
    db: AsyncSession,
    now: datetime,
    dedup_window: datetime,
    stats: dict,
) -> None:
    # ── Budget check ──────────────────────────────────────────────────────────
    max_budget = prefs.max_budget_eur if prefs else 150
    if deal["price_eur"] > max_budget:
        return

    # ── Departure airport check ───────────────────────────────────────────────
    user_airports = prefs.departure_airports if prefs else []
    if user_airports and deal["origin_iata"] not in user_airports:
        return

    # ── Deal score threshold ──────────────────────────────────────────────────
    min_score = notif_prefs.min_deal_score if notif_prefs else 70
    if deal["deal_score"] < min_score:
        return

    # ── Dedup: no repeat alert on same route in last 24h ─────────────────────
    dedup_result = await db.execute(
        select(func.count()).select_from(AlertSent).where(
            and_(
                AlertSent.user_id == user.id,
                AlertSent.route == route,
                AlertSent.sent_at >= dedup_window,
            )
        )
    )
    if dedup_result.scalar() > 0:
        return

    # ── Quiet hours check ─────────────────────────────────────────────────────
    if notif_prefs:
        current_hour = now.hour
        qs = notif_prefs.quiet_hours_start  # e.g. 22
        qe = notif_prefs.quiet_hours_end    # e.g. 8
        if qs > qe:
            # Spans midnight: 22..23..0..7
            in_quiet = current_hour >= qs or current_hour < qe
        else:
            in_quiet = qs <= current_hour < qe
        if in_quiet:
            return

    # ── Load FCM tokens ───────────────────────────────────────────────────────
    tokens_result = await db.execute(
        select(UserDeviceToken.fcm_token)
        .where(UserDeviceToken.user_id == user.id)
    )
    fcm_tokens = [row[0] for row in tokens_result.fetchall()]

    # ── Build notification content ────────────────────────────────────────────
    tier_emoji = {"hot": "🔥", "good": "✈️", "fair": "💡"}.get(deal["deal_tier"], "✈️")
    push_title = f"{tier_emoji} Deal {deal['deal_tier'].upper()} détecté !"
    push_body = (
        f"{deal['origin_city']} → {deal['dest_city']} {deal['dest_flag']} "
        f"à {deal['price_eur']:.0f}€ (-{deal['savings_pct']:.0f}%)"
    )

    channels_used = []

    # ── Push notification ─────────────────────────────────────────────────────
    push_enabled = notif_prefs.push_enabled if notif_prefs else True
    if push_enabled and fcm_tokens:
        result = await send_push_to_tokens(
            tokens=fcm_tokens,
            title=push_title,
            body=push_body,
            data={
                "deal_id": deal_id,
                "route": route,
                "type": "deal_alert",
            },
        )
        if result["success"] > 0:
            channels_used.append("push")

    # ── Email notification ────────────────────────────────────────────────────
    email_enabled = notif_prefs.email_enabled if notif_prefs else True
    if email_enabled:
        departure_str = deal["departure_at"].strftime("%d/%m/%Y") if hasattr(deal["departure_at"], "strftime") else str(deal["departure_at"])[:10]
        ok = await send_deal_alert_email(
            to_email=user.email,
            user_name=user.name,
            origin_city=deal["origin_city"],
            dest_city=deal["dest_city"],
            dest_flag=deal["dest_flag"],
            price_eur=deal["price_eur"],
            savings_pct=deal["savings_pct"],
            deal_score=deal["deal_score"],
            deal_tier=deal["deal_tier"],
            departure_at=departure_str,
            deep_link=deal["deep_link"],
        )
        if ok:
            channels_used.append("email")

    # ── Record alerts sent ────────────────────────────────────────────────────
    for channel in channels_used:
        db.add(AlertSent(
            user_id=user.id,
            deal_id=deal_id,
            route=route,
            channel=channel,
        ))
        stats["alerts_sent"] += 1

    if channels_used:
        await db.commit()
        logger.info(
            "Alerted user %s for deal %s via %s",
            user.id, deal_id, channels_used,
        )
