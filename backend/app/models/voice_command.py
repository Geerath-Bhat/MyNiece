import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class VoiceCommand(Base):
    __tablename__ = "voice_commands"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    baby_id: Mapped[str | None] = mapped_column(String, ForeignKey("babies.id"), nullable=True)
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    detected_intent: Mapped[str | None] = mapped_column(String, nullable=True)
    entities_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
