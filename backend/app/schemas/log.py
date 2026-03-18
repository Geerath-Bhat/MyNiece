from datetime import datetime
from pydantic import BaseModel


class ActivityLogIn(BaseModel):
    baby_id: str
    type: str                         # feed | diaper | custom
    timestamp: datetime | None = None # defaults to now()
    diaper_type: str | None = None    # wet | dirty | both
    feed_type: str | None = None      # breast_left | breast_right | both_breasts | bottle
    duration_minutes: int | None = None
    volume_ml: float | None = None
    custom_label: str | None = None
    notes: str | None = None


class ActivityLogOut(ActivityLogIn):
    id: str
    logged_by: str | None
    logged_by_name: str | None = None
    timestamp: datetime
    created_at: datetime
    class Config: from_attributes = True


class LastFeedOut(BaseModel):
    timestamp: datetime
    minutes_since: float
    next_due_at: datetime
