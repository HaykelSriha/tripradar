from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from base import Base  # noqa: F401 — re-exported for backwards compatibility
from config import settings, _to_asyncpg

# ── Application DB ────────────────────────────────────────────────────────────
engine = create_async_engine(
    _to_asyncpg(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ── Warehouse DB ──────────────────────────────────────────────────────────────
warehouse_engine = create_async_engine(
    _to_asyncpg(settings.WAREHOUSE_URL),
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncWarehouseSessionLocal = async_sessionmaker(
    warehouse_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


