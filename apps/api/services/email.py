"""Email service via Resend."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_deal_alert_email(
    to_email: str,
    user_name: str,
    origin_city: str,
    dest_city: str,
    dest_flag: str,
    price_eur: float,
    savings_pct: float,
    deal_score: int,
    deal_tier: str,
    departure_at: str,
    deep_link: str,
) -> bool:
    """
    Sends a deal alert email via Resend API.
    Returns True on success, False on failure.
    """
    from config import settings

    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — email alerts disabled")
        return False

    tier_emoji = {"hot": "🔥", "good": "✈️", "fair": "💡"}.get(deal_tier, "✈️")
    savings_str = f"{savings_pct:.0f}%"

    subject = f"{tier_emoji} Deal {deal_tier.upper()}: {origin_city} → {dest_city} {dest_flag} à {price_eur:.0f}€"

    html_body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;
                background: #0A0B0F; color: #E2E8F0; padding: 32px; border-radius: 16px;">

      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #FF6B35; font-size: 28px; margin: 0;">TripRadar</h1>
        <p style="color: #94A3B8; margin: 8px 0 0;">Ton alerte voyage</p>
      </div>

      <div style="background: #141519; border-radius: 12px; padding: 24px; border: 1px solid #1E2028;">
        <p style="color: #94A3B8; margin: 0 0 8px;">Bonjour {user_name} 👋</p>
        <h2 style="font-size: 24px; margin: 0 0 16px; color: #F1F5F9;">
          {origin_city} → {dest_city} {dest_flag}
        </h2>

        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="flex: 1; background: #0A0B0F; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #FF6B35;">{price_eur:.0f}€</div>
            <div style="color: #94A3B8; font-size: 12px; margin-top: 4px;">Prix aller-retour</div>
          </div>
          <div style="flex: 1; background: #0A0B0F; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #22C55E;">-{savings_str}</div>
            <div style="color: #94A3B8; font-size: 12px; margin-top: 4px;">vs prix habituel</div>
          </div>
          <div style="flex: 1; background: #0A0B0F; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #7C3AED;">{deal_score}</div>
            <div style="color: #94A3B8; font-size: 12px; margin-top: 4px;">Deal Score</div>
          </div>
        </div>

        <p style="color: #94A3B8; margin: 0 0 16px;">
          Départ le <strong style="color: #F1F5F9;">{departure_at}</strong>
        </p>

        <a href="{deep_link}" style="display: block; text-align: center; background: #FF6B35;
           color: white; text-decoration: none; padding: 16px; border-radius: 8px;
           font-weight: 600; font-size: 16px;">
          Voir ce deal →
        </a>
      </div>

      <p style="text-align: center; color: #475569; font-size: 12px; margin-top: 24px;">
        TripRadar · <a href="https://trigradar.fr/unsubscribe" style="color: #475569;">Se désabonner</a>
      </p>
    </div>
    """

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        params = resend.Emails.SendParams(
            from_=settings.FROM_EMAIL,
            to=[to_email],
            subject=subject,
            html=html_body,
        )
        resend.Emails.send(params)
        logger.info("Deal alert email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Resend email failed for %s: %s", to_email, exc)
        return False
