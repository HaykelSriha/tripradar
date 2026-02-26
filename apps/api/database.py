from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

# ── Application DB ────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
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
    settings.WAREHOUSE_URL,
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


# ── Base model ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass
