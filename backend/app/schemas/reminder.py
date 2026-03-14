from datetime import datetime, time
from pydantic import BaseModel


class ReminderIn(BaseModel):
    baby_id: str
    type: str
    label: str
    interval_minutes: int | None = None
    time_of_day: time | None = None       # "HH:MM"
    offset_minutes: int | None = None     # pre-feed exercise offset
    is_enabled: bool = True


class ReminderOut(ReminderIn):
    id: str
    created_by: str | None
    next_fire_at: datetime | None
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class ReminderPatch(BaseModel):
    label: str | None = None
    interval_minutes: int | None = None
    time_of_day: time | None = None
    offset_minutes: int | None = None
    is_enabled: bool | None = None


class ToggleIn(BaseModel):
    is_enabled: bool
