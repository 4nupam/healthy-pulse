"""
Antigravity Food Scanner — Database Engine & Session Management
================================================================
Async SQLAlchemy engine with production-tuned connection pooling.
Provides a context-managed dependency injector for FastAPI routes.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# ── Async Engine ─────────────────────────────────────────────────────────────
# Production-tuned pool parameters:
#   pool_size=20      → 20 persistent connections in the pool
#   max_overflow=10   → up to 10 additional connections under burst load
#   pool_pre_ping=True→ test connections before checkout (handles stale conns)
#   pool_recycle=3600 → recycle connections after 1 hour to avoid DB timeouts
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG,
)

# ── Session Factory ──────────────────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── ORM Base ─────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Declarative base class for all ORM models."""
    pass


# ── Dependency Injector ──────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a scoped async database session.
    Automatically commits on success and rolls back on exception.
    The session is always closed when the request finishes.
    """
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


# ── Table Initialization ────────────────────────────────────────────────────
async def init_db() -> None:
    """Create all tables defined by ORM models if they don't exist yet."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")


async def dispose_engine() -> None:
    """Gracefully close all connections in the pool on shutdown."""
    await engine.dispose()
    logger.info("Database engine disposed.")
