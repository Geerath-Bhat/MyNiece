from datetime import datetime
from pydantic import BaseModel


class ActivityLogIn(BaseModel):
    baby_id: str
    type: str                         # feed | diaper | custom
    timestamp: datetime | None = None # defaults to now()
    diaper_type: str | None = None    # wet | dirty | both
    custom_label: str | None = None
    notes: str | None = None


class ActivityLogOut(ActivityLogIn):
    id: str
    logged_by: str | None
    timestamp: datetime
    created_at: datetime
    class Config: from_attributes = True


class LastFeedOut(BaseModel):
    timestamp: datetime
    minutes_since: float
    next_due_at: datetime
