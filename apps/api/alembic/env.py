import os
import re
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Import Base and all models so Alembic sees the schema ─────────────────────
from base import Base  # noqa: F401
import models  # noqa: F401 — registers all ORM models on Base.metadata

config = context.config
fileConfig(config.config_file_name)

# ── Build a *sync* psycopg2 URL for Alembic (alembic runs synchronously) ───────
_raw_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/trigradar",
)
# Strip asyncpg driver specifier if present
_sync_url = re.sub(r"^postgresql\+asyncpg://", "postgresql://", _raw_url)
_sync_url = re.sub(r"^postgres://", "postgresql://", _sync_url)
config.set_main_option("sqlalchemy.url", _sync_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
