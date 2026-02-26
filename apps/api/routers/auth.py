"""Auth router — register, login, refresh, Google OAuth, logout."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

limiter = Limiter(key_func=get_remote_address)

from config import settings
from dependencies import get_db
from models.user import (
    User,
    UserNotificationPrefs,
    UserPreferences,
    UserProvider,
)
from schemas.auth import (
    AccessTokenResponse,
    GoogleAuthRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from services.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from services.cache import (
    delete_refresh_token,
    get_refresh_token_user,
    store_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token_response(user: User) -> TokenResponse:
    access = create_access_token(user.id, user.email, user.name, user.is_premium)
    refresh = create_refresh_token()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    ), refresh


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cet email existe déjà.",
        )

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()  # get user.id

    # Create default preferences
    db.add(UserPreferences(user_id=user.id))
    db.add(UserNotificationPrefs(user_id=user.id))
    await db.commit()
    await db.refresh(user)

    token_resp, refresh = _make_token_response(user)
    await store_refresh_token(refresh, str(user.id), settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return token_resp


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé.",
        )

    token_resp, refresh = _make_token_response(user)
    await store_refresh_token(refresh, str(user.id), settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return token_resp


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        google_payload = await verify_google_id_token(body.id_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    google_sub = google_payload["sub"]
    email = google_payload["email"]
    name = google_payload.get("name", email.split("@")[0])
    avatar_url = google_payload.get("picture")

    # Check if provider already linked
    provider_result = await db.execute(
        select(UserProvider)
        .where(UserProvider.provider == "google", UserProvider.provider_id == google_sub)
    )
    provider = provider_result.scalar_one_or_none()

    if provider:
        # Existing user — load and return token
        user_result = await db.execute(select(User).where(User.id == provider.user_id))
        user = user_result.scalar_one()
    else:
        # Check if email already exists (email-password account)
        user_result = await db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()

        if not user:
            # New user — create account
            user = User(email=email, name=name, avatar_url=avatar_url)
            db.add(user)
            await db.flush()
            db.add(UserPreferences(user_id=user.id))
            db.add(UserNotificationPrefs(user_id=user.id))

        # Link Google provider
        db.add(UserProvider(
            user_id=user.id,
            provider="google",
            provider_id=google_sub,
        ))
        await db.commit()
        await db.refresh(user)

    token_resp, refresh = _make_token_response(user)
    await store_refresh_token(refresh, str(user.id), settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return token_resp


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id_str = await get_refresh_token_user(body.refresh_token)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré.",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable.")

    access = create_access_token(user.id, user.email, user.name, user.is_premium)
    return AccessTokenResponse(
        access_token=access,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshRequest):
    await delete_refresh_token(body.refresh_token)
