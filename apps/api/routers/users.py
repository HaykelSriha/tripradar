"""Users router — profile, preferences, watchlist, alerts, devices, GDPR export."""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user, get_db
from models.user import (
    AlertSent,
    User,
    UserDeviceToken,
    UserNotificationPrefs,
    UserPreferences,
    UserWatchlistDestination,
)
from schemas.user import (
    AddWatchlistRequest,
    AlertRecord,
    DeviceResponse,
    NotificationPrefsResponse,
    RegisterDeviceRequest,
    UpdateNotificationPrefsRequest,
    UpdatePreferencesRequest,
    UpdateProfileRequest,
    UserPreferencesResponse,
    UserProfile,
    WatchlistItem,
)

router = APIRouter(prefix="/users", tags=["users"])


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserProfile)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """GDPR: account deletion. Cascades to all related records."""
    await db.delete(current_user)
    await db.commit()


# ── Preferences ───────────────────────────────────────────────────────────────

@router.get("/me/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        # Create defaults on first access
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.patch("/me/preferences", response_model=UserPreferencesResponse)
async def update_preferences(
    body: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prefs, field, value)

    await db.commit()
    await db.refresh(prefs)
    return prefs


@router.get("/me/notifications", response_model=NotificationPrefsResponse)
async def get_notification_prefs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == current_user.id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        notif = UserNotificationPrefs(user_id=current_user.id)
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
    return notif


@router.patch("/me/notifications", response_model=NotificationPrefsResponse)
async def update_notification_prefs(
    body: UpdateNotificationPrefsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == current_user.id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        notif = UserNotificationPrefs(user_id=current_user.id)
        db.add(notif)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(notif, field, value)

    await db.commit()
    await db.refresh(notif)
    return notif


# ── Watchlist ─────────────────────────────────────────────────────────────────

@router.get("/me/watchlist", response_model=list[WatchlistItem])
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserWatchlistDestination)
        .where(UserWatchlistDestination.user_id == current_user.id)
        .order_by(UserWatchlistDestination.created_at.desc())
    )
    return result.scalars().all()


@router.post("/me/watchlist", response_model=WatchlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    body: AddWatchlistRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate
    existing = await db.execute(
        select(UserWatchlistDestination).where(
            UserWatchlistDestination.user_id == current_user.id,
            UserWatchlistDestination.destination_code == body.destination_code.upper(),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Destination déjà dans la watchlist.",
        )

    item = UserWatchlistDestination(
        user_id=current_user.id,
        destination_code=body.destination_code.upper(),
        destination_name=body.destination_name,
        is_region=body.is_region,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/me/watchlist/{destination_code}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    destination_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserWatchlistDestination).where(
            UserWatchlistDestination.user_id == current_user.id,
            UserWatchlistDestination.destination_code == destination_code.upper(),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination introuvable.")

    await db.delete(item)
    await db.commit()


# ── Alert History ─────────────────────────────────────────────────────────────

@router.get("/me/alerts", response_model=list[AlertRecord])
async def get_alert_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertSent)
        .where(AlertSent.user_id == current_user.id)
        .order_by(AlertSent.sent_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# ── Device Registration ───────────────────────────────────────────────────────

@router.post("/me/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(
    body: RegisterDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Upsert: if token exists (possibly for another user), re-assign it
    existing = await db.execute(
        select(UserDeviceToken).where(UserDeviceToken.fcm_token == body.fcm_token)
    )
    token_row = existing.scalar_one_or_none()

    if token_row:
        token_row.user_id = current_user.id
        token_row.platform = body.platform
    else:
        token_row = UserDeviceToken(
            user_id=current_user.id,
            fcm_token=body.fcm_token,
            platform=body.platform,
        )
        db.add(token_row)

    await db.commit()
    await db.refresh(token_row)
    return token_row


@router.delete("/me/devices/{fcm_token}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(
    fcm_token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserDeviceToken).where(
            UserDeviceToken.fcm_token == fcm_token,
            UserDeviceToken.user_id == current_user.id,
        )
    )
    token_row = result.scalar_one_or_none()
    if not token_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token introuvable.")

    await db.delete(token_row)
    await db.commit()


# ── GET /users/me/export (GDPR data export) ───────────────────────────────────

@router.get("/me/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    GDPR Article 20 — data portability.
    Returns all personal data for the authenticated user as JSON.
    """
    # Preferences
    prefs_result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = prefs_result.scalar_one_or_none()

    notif_result = await db.execute(
        select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == current_user.id)
    )
    notif_prefs = notif_result.scalar_one_or_none()

    watchlist_result = await db.execute(
        select(UserWatchlistDestination).where(UserWatchlistDestination.user_id == current_user.id)
    )
    watchlist = watchlist_result.scalars().all()

    alerts_result = await db.execute(
        select(AlertSent).where(AlertSent.user_id == current_user.id)
    )
    alerts = alerts_result.scalars().all()

    export: dict[str, Any] = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": {
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.name,
            "is_premium": current_user.is_premium,
            "created_at": current_user.created_at.isoformat(),
        },
        "preferences": {
            "departure_airports": prefs.departure_airports if prefs else [],
            "max_budget_eur": prefs.max_budget_eur if prefs else None,
            "trip_duration_min": prefs.trip_duration_min if prefs else None,
            "trip_duration_max": prefs.trip_duration_max if prefs else None,
            "min_deal_score": prefs.min_deal_score if prefs else None,
        } if prefs else None,
        "notification_preferences": {
            "email_enabled": notif_prefs.email_enabled if notif_prefs else None,
            "push_enabled": notif_prefs.push_enabled if notif_prefs else None,
            "quiet_hours_start": str(notif_prefs.quiet_hours_start) if notif_prefs and notif_prefs.quiet_hours_start else None,
            "quiet_hours_end": str(notif_prefs.quiet_hours_end) if notif_prefs and notif_prefs.quiet_hours_end else None,
        } if notif_prefs else None,
        "watchlist": [
            {
                "destination_code": w.destination_code,
                "destination_name": w.destination_name,
                "added_at": w.added_at.isoformat(),
            }
            for w in watchlist
        ],
        "alert_history": [
            {
                "deal_id": a.deal_id,
                "channel": a.channel,
                "sent_at": a.sent_at.isoformat(),
                "opened_at": a.opened_at.isoformat() if a.opened_at else None,
            }
            for a in alerts
        ],
    }

    return JSONResponse(
        content=export,
        headers={
            "Content-Disposition": f'attachment; filename="trigradar-export-{str(current_user.id)[:8]}.json"'
        },
    )
