"""Redis cache helper — simple get/set/delete with JSON serialisation."""

import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from config import settings

logger = logging.getLogger(__name__)

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Returns the shared Redis connection pool (lazy init)."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_pool


async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    try:
        value = await r.get(key)
        if value is None:
            return None
        return json.loads(value)
    except Exception as exc:
        logger.warning("Cache GET failed for %s: %s", key, exc)
        return None


async def cache_set(key: str, value: Any, ttl: int = 900) -> None:
    """Store value as JSON with TTL in seconds (default 15 min)."""
    r = await get_redis()
    try:
        await r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        logger.warning("Cache SET failed for %s: %s", key, exc)


async def cache_delete(key: str) -> None:
    r = await get_redis()
    try:
        await r.delete(key)
    except Exception as exc:
        logger.warning("Cache DELETE failed for %s: %s", key, exc)


# ── Refresh token storage in Redis ────────────────────────────────────────────
# Key: "rt:{token}"  →  Value: user_id (str)

REFRESH_TOKEN_PREFIX = "rt:"


async def store_refresh_token(token: str, user_id: str, expire_days: int = 7) -> None:
    r = await get_redis()
    await r.setex(
        f"{REFRESH_TOKEN_PREFIX}{token}",
        expire_days * 86400,
        user_id,
    )


async def get_refresh_token_user(token: str) -> Optional[str]:
    r = await get_redis()
    return await r.get(f"{REFRESH_TOKEN_PREFIX}{token}")


async def delete_refresh_token(token: str) -> None:
    r = await get_redis()
    await r.delete(f"{REFRESH_TOKEN_PREFIX}{token}")
