import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    household_id: Mapped[str] = mapped_column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    timezone: Mapped[str] = mapped_column(String, nullable=False, default="UTC")
    role: Mapped[str] = mapped_column(String, nullable=False, default="member")  # admin | verified | member
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)    # blue-tick, set by admin
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    theme: Mapped[str] = mapped_column(String, nullable=False, default="aurora")  # aurora | midnight | forest | rose
    whatsapp_number: Mapped[str | None] = mapped_column(String, nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    household: Mapped["Household"] = relationship("Household", back_populates="users")
    push_subscriptions: Mapped[list["PushSubscription"]] = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")
