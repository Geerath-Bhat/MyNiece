from datetime import datetime
from pydantic import BaseModel


class PushSubscribeIn(BaseModel):
    subscription: dict          # full PushSubscriptionJSON
    device_label: str | None = None


class PushSubscriptionOut(BaseModel):
    id: str
    device_label: str | None
    created_at: datetime
    class Config: from_attributes = True
