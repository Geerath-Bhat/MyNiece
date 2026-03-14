import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Household(Base):
    __tablename__ = "households"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    invite_code: Mapped[str] = mapped_column(String, unique=True, nullable=False, default=lambda: uuid.uuid4().hex[:8])
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users: Mapped[list["User"]] = relationship("User", back_populates="household")
    babies: Mapped[list["Baby"]] = relationship("Baby", back_populates="household")
