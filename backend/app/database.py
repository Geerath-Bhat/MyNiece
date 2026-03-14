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
    from app.models import household, user, baby, reminder, activity_log, push_subscription, expense, voice_command  # noqa: F401
    Base.metadata.create_all(bind=engine)
