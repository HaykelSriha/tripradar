"""Firebase Cloud Messaging (FCM) push notification service."""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_fcm_initialized = False


def _init_firebase():
    """Lazy init Firebase Admin SDK — only called if credentials are configured."""
    global _fcm_initialized
    if _fcm_initialized:
        return True

    from config import settings

    if not settings.FIREBASE_CREDENTIALS_JSON:
        logger.warning("FIREBASE_CREDENTIALS_JSON not set — FCM push disabled")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_data = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(cred_data)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _fcm_initialized = True
        return True
    except Exception as exc:
        logger.error("Failed to initialise Firebase: %s", exc)
        return False


async def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Send a push notification via FCM.
    Returns True on success, False on failure.
    """
    if not _init_firebase():
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(priority="high"),
        )
        response = messaging.send(message)
        logger.info("FCM sent: %s", response)
        return True
    except Exception as exc:
        logger.error("FCM send failed for token %s…: %s", fcm_token[:20], exc)
        return False


async def send_push_to_tokens(
    tokens: list[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    """Send to multiple tokens via FCM MulticastMessage. Returns success/failure counts."""
    if not tokens or not _init_firebase():
        return {"success": 0, "failure": len(tokens)}

    try:
        from firebase_admin import messaging

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=tokens,
            android=messaging.AndroidConfig(priority="high"),
        )
        batch_response = messaging.send_each_for_multicast(message)
        return {
            "success": batch_response.success_count,
            "failure": batch_response.failure_count,
        }
    except Exception as exc:
        logger.error("FCM multicast failed: %s", exc)
        return {"success": 0, "failure": len(tokens)}
