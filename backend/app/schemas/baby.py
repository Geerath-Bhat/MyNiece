from datetime import date, datetime
from pydantic import BaseModel


class WeightLogIn(BaseModel):
    date: date
    weight_kg: float
    height_cm: float | None = None
    head_cm: float | None = None
    note: str | None = None


class WeightLogOut(WeightLogIn):
    id: str
    baby_id: str
    created_at: datetime
    class Config: from_attributes = True


class BabyIn(BaseModel):
    name: str
    date_of_birth: date
    gender: str | None = None


class BabyOut(BabyIn):
    id: str
    household_id: str
    avatar_url: str | None = None
    created_at: datetime
    class Config: from_attributes = True


class BabyPatch(BaseModel):
    name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
