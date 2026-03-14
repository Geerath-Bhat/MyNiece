import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SleepSession(Base):
    __tablename__ = "sleep_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    baby_id: Mapped[str] = mapped_column(String, ForeignKey("babies.id", ondelete="CASCADE"), nullable=False, index=True)
    logged_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality: Mapped[str | None] = mapped_column(String, nullable=True)  # "good" | "poor" | None
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    baby: Mapped["Baby"] = relationship("Baby", back_populates="sleep_sessions")
