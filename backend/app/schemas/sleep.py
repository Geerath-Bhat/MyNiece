from datetime import datetime
from pydantic import BaseModel


class SleepStartIn(BaseModel):
    baby_id: str
    started_at: datetime | None = None
    notes: str | None = None
    quality: str | None = None  # "good" | "poor"


class SleepEndIn(BaseModel):
    ended_at: datetime | None = None   # defaults to now
    quality: str | None = None
    notes: str | None = None


class SleepSessionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    baby_id: str
    logged_by: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: float | None
    quality: str | None
    notes: str | None
    created_at: datetime

    @property
    def is_active(self) -> bool:
        return self.ended_at is None
