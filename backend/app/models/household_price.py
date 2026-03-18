import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class HouseholdPrice(Base):
    __tablename__ = "household_prices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id: Mapped[str] = mapped_column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    # item key: diaper | vitamin_d | feed | pre_feed_exercise | custom:<label>
    item: Mapped[str] = mapped_column(String, nullable=False)
    price_inr: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("household_id", "item", name="uq_household_item"),)
