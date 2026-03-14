from datetime import date, datetime, timedelta, timezone
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
from app.models.baby import WeightLog
from app.schemas.analytics import (
    FeedDayOut, FeedingAnalyticsOut, DiaperDayOut,
    DiaperAnalyticsOut, WeeklySummaryOut, HeatmapPointOut, ActivityHeatmapOut,
)


def feeding_analytics(db: Session, baby_id: str, days: int = 7) -> FeedingAnalyticsOut:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.baby_id == baby_id, ActivityLog.type == "feed", ActivityLog.timestamp >= since)
        .order_by(ActivityLog.timestamp)
        .all()
    )

    by_day: dict[date, list[datetime]] = defaultdict(list)
    for log in logs:
        by_day[log.timestamp.date()].append(log.timestamp)

    feeds = [FeedDayOut(date=d, count=len(ts), timestamps=ts) for d, ts in sorted(by_day.items())]

    # Average interval
    avg = None
    if len(logs) > 1:
        intervals = [
            (logs[i].timestamp - logs[i - 1].timestamp).total_seconds() / 60
            for i in range(1, len(logs))
        ]
        avg = sum(intervals) / len(intervals)

    return FeedingAnalyticsOut(
        feeds=feeds,
        avg_interval_minutes=avg,
        last_feed_at=logs[-1].timestamp if logs else None,
    )


def diaper_analytics(db: Session, baby_id: str, days: int = 7) -> DiaperAnalyticsOut:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.baby_id == baby_id, ActivityLog.type == "diaper", ActivityLog.timestamp >= since)
        .all()
    )

    by_day: dict[date, dict] = defaultdict(lambda: {"wet": 0, "dirty": 0, "both": 0})
    for log in logs:
        d = log.timestamp.date()
        dtype = log.diaper_type or "wet"
        by_day[d][dtype] = by_day[d].get(dtype, 0) + 1

    by_day_list = [
        DiaperDayOut(date=d, **counts) for d, counts in sorted(by_day.items())
    ]
    return DiaperAnalyticsOut(by_day=by_day_list, total=len(logs))


def weekly_summary(db: Session, baby_id: str) -> WeeklySummaryOut:
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    since = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)

    feeds = db.query(ActivityLog).filter(
        ActivityLog.baby_id == baby_id, ActivityLog.type == "feed", ActivityLog.timestamp >= since
    ).order_by(ActivityLog.timestamp).all()

    diapers = db.query(ActivityLog).filter(
        ActivityLog.baby_id == baby_id, ActivityLog.type == "diaper", ActivityLog.timestamp >= since
    ).count()

    avg_interval = None
    if len(feeds) > 1:
        intervals = [
            (feeds[i].timestamp - feeds[i - 1].timestamp).total_seconds() / 3600
            for i in range(1, len(feeds))
        ]
        avg_interval = sum(intervals) / len(intervals)

    weights = db.query(WeightLog).filter(WeightLog.baby_id == baby_id).order_by(WeightLog.date.desc()).limit(2).all()
    last_weight = float(weights[0].weight_kg) if weights else None
    weight_change = float(weights[0].weight_kg - weights[1].weight_kg) if len(weights) == 2 else None

    return WeeklySummaryOut(
        week_start=week_start,
        total_feeds=len(feeds),
        total_diapers=diapers,
        avg_feeding_interval_hours=avg_interval,
        last_weight_kg=last_weight,
        weight_change_kg=weight_change,
    )


def activity_heatmap(db: Session, baby_id: str, days: int = 30, log_type: str = "diaper") -> ActivityHeatmapOut:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = db.query(ActivityLog).filter(
        ActivityLog.baby_id == baby_id, ActivityLog.type == log_type, ActivityLog.timestamp >= since
    ).all()

    counts: dict[tuple[int, int], int] = defaultdict(int)
    for log in logs:
        counts[(log.timestamp.hour, log.timestamp.weekday())] += 1

    return ActivityHeatmapOut(heatmap=[
        HeatmapPointOut(hour=h, day_of_week=d, count=c) for (h, d), c in counts.items()
    ])
