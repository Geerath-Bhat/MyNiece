from datetime import date, datetime
from pydantic import BaseModel


class DoctorVisitIn(BaseModel):
    date: date
    reason: str
    doctor_name: str | None = None
    notes: str | None = None
    next_appointment: date | None = None


class DoctorVisitOut(DoctorVisitIn):
    id: str
    baby_id: str
    logged_by: str | None = None
    created_at: datetime
    class Config: from_attributes = True


class VaccineRecordIn(BaseModel):
    vaccine_key: str
    given_date: date
    notes: str | None = None


class VaccineRecordOut(VaccineRecordIn):
    id: str
    baby_id: str
    logged_by: str | None = None
    created_at: datetime
    class Config: from_attributes = True


class MilestoneIn(BaseModel):
    title: str
    category: str
    achieved_date: date
    milestone_key: str | None = None
    notes: str | None = None


class MilestoneOut(MilestoneIn):
    id: str
    baby_id: str
    logged_by: str | None = None
    created_at: datetime
    class Config: from_attributes = True
