from datetime import date, datetime
from pydantic import BaseModel


class FeedDayOut(BaseModel):
    date: date
    count: int
    timestamps: list[datetime]


class FeedingAnalyticsOut(BaseModel):
    feeds: list[FeedDayOut]
    avg_interval_minutes: float | None
    last_feed_at: datetime | None


class DiaperDayOut(BaseModel):
    date: date
    wet: int
    dirty: int
    both: int


class DiaperAnalyticsOut(BaseModel):
    by_day: list[DiaperDayOut]
    total: int


class WeeklySummaryOut(BaseModel):
    week_start: date
    total_feeds: int
    total_diapers: int
    avg_feeding_interval_hours: float | None
    last_weight_kg: float | None
    weight_change_kg: float | None


class HeatmapPointOut(BaseModel):
    hour: int
    day_of_week: int
    count: int


class ActivityHeatmapOut(BaseModel):
    heatmap: list[HeatmapPointOut]


class WeeklyInsightOut(BaseModel):
    model_config = {"from_attributes": True}

    week_start: date
    insight_text: str
    generated_at: datetime
