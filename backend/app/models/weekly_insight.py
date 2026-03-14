import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WeeklyInsight(Base):
    __tablename__ = "weekly_insights"
    __table_args__ = (UniqueConstraint("baby_id", "week_start", name="uq_insight_baby_week"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    baby_id: Mapped[str] = mapped_column(String, ForeignKey("babies.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    insight_text: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    baby: Mapped["Baby"] = relationship("Baby", back_populates="weekly_insights")
