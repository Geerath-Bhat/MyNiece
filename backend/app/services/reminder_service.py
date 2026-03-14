from datetime import datetime, timedelta, timezone, time as dt_time
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.models.reminder import Reminder


def calc_next_fire_interval(from_dt: datetime, interval_minutes: int) -> datetime:
    """Next fire = from_dt + interval. Returns UTC."""
    return from_dt.astimezone(timezone.utc) + timedelta(minutes=interval_minutes)


def calc_next_fire_fixed(time_of_day: dt_time, tz_str: str) -> datetime:
    """Next fire at a fixed time of day in the user's timezone. Returns UTC."""
    tz = ZoneInfo(tz_str)
    now = datetime.now(tz)
    candidate = now.replace(
        hour=time_of_day.hour, minute=time_of_day.minute, second=0, microsecond=0
    )
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate.astimezone(timezone.utc)


def set_next_fire(reminder: Reminder, user_tz: str = "UTC", from_dt: datetime | None = None) -> None:
    """Mutate reminder.next_fire_at based on its type."""
    now = from_dt or datetime.now(timezone.utc)

    if reminder.interval_minutes and reminder.type in ("feeding", "diaper", "pre_feed_exercise", "custom"):
        reminder.next_fire_at = calc_next_fire_interval(now, reminder.interval_minutes)

    elif reminder.time_of_day and reminder.type in ("vitamin_d", "massage", "custom"):
        reminder.next_fire_at = calc_next_fire_fixed(reminder.time_of_day, user_tz)


def reschedule_after_feed(db: Session, baby_id: str, fed_at: datetime, user_tz: str = "UTC") -> None:
    """
    After a feed is logged:
    - Advance the feeding reminder's next_fire_at
    - If pre_feed_exercise exists, schedule it N minutes before next feed
    """
    feeding_r = (
        db.query(Reminder)
        .filter(Reminder.baby_id == baby_id, Reminder.type == "feeding", Reminder.is_enabled == True)
        .first()
    )
    if feeding_r and feeding_r.interval_minutes:
        next_feed = calc_next_fire_interval(fed_at, feeding_r.interval_minutes)
        feeding_r.next_fire_at = next_feed

        # Pre-feed exercise
        pfe = (
            db.query(Reminder)
            .filter(Reminder.baby_id == baby_id, Reminder.type == "pre_feed_exercise", Reminder.is_enabled == True)
            .first()
        )
        if pfe and pfe.offset_minutes:
            pfe.next_fire_at = next_feed - timedelta(minutes=pfe.offset_minutes)

        db.commit()

        # Reschedule APScheduler jobs
        from app.scheduler.jobs import schedule_reminder
        schedule_reminder(feeding_r)
        if pfe:
            schedule_reminder(pfe)


def get_feeding_reminder(db: Session, baby_id: str) -> Reminder | None:
    return (
        db.query(Reminder)
        .filter(Reminder.baby_id == baby_id, Reminder.type == "feeding")
        .first()
    )
