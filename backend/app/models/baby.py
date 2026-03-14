import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, Numeric, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Baby(Base):
    __tablename__ = "babies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id: Mapped[str] = mapped_column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    household: Mapped["Household"] = relationship("Household", back_populates="babies")
    weight_logs: Mapped[list["WeightLog"]] = relationship("WeightLog", back_populates="baby", cascade="all, delete-orphan")
    reminders: Mapped[list["Reminder"]] = relationship("Reminder", back_populates="baby", cascade="all, delete-orphan")
    activity_logs: Mapped[list["ActivityLog"]] = relationship("ActivityLog", back_populates="baby", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="baby", cascade="all, delete-orphan")


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    baby_id: Mapped[str] = mapped_column(String, ForeignKey("babies.id", ondelete="CASCADE"), nullable=False, index=True)
    logged_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(5, 3), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    baby: Mapped["Baby"] = relationship("Baby", back_populates="weight_logs")
