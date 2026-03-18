from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

# SQLite needs check_same_thread=False; ignored for PostgreSQL
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables (used in dev/SQLite). In production use Alembic."""
    from app.models import household, user, baby, reminder, activity_log, push_subscription, expense, voice_command, sleep_session, weekly_insight, otp_code, household_price, health  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Safe column additions for SQLite (ALTER TABLE ignores existing columns via try/except)
    _safe_add_columns()


def _safe_add_columns():
    """Add new columns to existing tables without Alembic.
    PostgreSQL: uses IF NOT EXISTS — safe and atomic in one transaction.
    SQLite: uses try/except per statement with explicit rollback on failure.
    """
    from sqlalchemy import text

    columns = [
        ("babies",        "avatar_url",        "TEXT"),
        ("weight_logs",   "height_cm",         "NUMERIC(5,1)"),
        ("weight_logs",   "head_cm",           "NUMERIC(4,1)"),
        ("activity_logs", "feed_type",         "TEXT"),
        ("activity_logs", "duration_minutes",  "INTEGER"),
        ("activity_logs", "volume_ml",         "NUMERIC(6,1)"),
    ]

    is_postgres = not settings.database_url.startswith("sqlite")

    if is_postgres:
        # PostgreSQL supports IF NOT EXISTS — run all in one transaction
        with engine.connect() as conn:
            for table, col, typ in columns:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {typ}"))
            conn.commit()
    else:
        # SQLite: must rollback after each failed statement before continuing
        for table, col, typ in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typ}"))
                    conn.commit()
                except Exception:
                    conn.rollback()
