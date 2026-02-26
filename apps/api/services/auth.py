"""Auth service: JWT creation/verification, password hashing, Google token verify."""

import uuid
from datetime import datetime, timedelta, timezone

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(user_id: uuid.UUID, email: str, name: str, is_premium: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "is_premium": is_premium,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token() -> str:
    """Generates a random opaque refresh token (stored as key in Redis)."""
    return str(uuid.uuid4())


def decode_access_token(token: str) -> dict:
    """Raises JWTError if invalid/expired."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Not an access token")
    return payload


# ── Google OAuth ──────────────────────────────────────────────────────────────

async def verify_google_id_token(id_token: str) -> dict:
    """
    Verifies a Google ID token via Google's tokeninfo endpoint.
    Returns the token payload on success.
    Raises ValueError if invalid.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )

    if resp.status_code != 200:
        raise ValueError("Invalid Google ID token")

    data = resp.json()

    if data.get("email_verified") not in ("true", True):
        raise ValueError("Google email not verified")

    required = {"sub", "email", "name"}
    if not required.issubset(data.keys()):
        raise ValueError("Missing fields in Google token payload")

    return data
