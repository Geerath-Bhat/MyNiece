from datetime import datetime
from datetime import date as DateType
from typing import Optional
from pydantic import BaseModel


class ExpenseIn(BaseModel):
    baby_id: str
    amount: float
    category: str   # diapers | medicine | products | doctor | other
    date: DateType
    note: Optional[str] = None


class ExpenseOut(ExpenseIn):
    id: str
    user_id: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


class ExpensePatch(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[DateType] = None
    note: Optional[str] = None


class ExpenseSummaryOut(BaseModel):
    total: float
    by_category: dict[str, float]
