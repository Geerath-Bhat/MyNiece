import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    baby_id: Mapped[str] = mapped_column(String, ForeignKey("babies.id", ondelete="CASCADE"), nullable=False, index=True)
    logged_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)  # feed | diaper | custom
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    diaper_type: Mapped[str | None] = mapped_column(String, nullable=True)  # wet | dirty | both
    custom_label: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    baby: Mapped["Baby"] = relationship("Baby", back_populates="activity_logs")
