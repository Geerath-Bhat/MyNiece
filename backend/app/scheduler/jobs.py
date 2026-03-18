import logging
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models.reminder import Reminder

logger = logging.getLogger(__name__)

# In-memory set of reminder IDs the user has dismissed during the current alarm cycle
_dismissed_alarms: set[str] = set()

# How many repeat pushes to send and how far apart (30s × 5 = 2.5 min extra after the first)
_ALARM_REPEAT_COUNT = 20
_ALARM_REPEAT_INTERVAL = 15  # seconds


def dismiss_alarm(reminder_id: str) -> None:
    """Mark an alarm as dismissed and cancel any pending repeat pushes."""
    _dismissed_alarms.add(reminder_id)
    from app.scheduler.setup import scheduler
    for i in range(1, _ALARM_REPEAT_COUNT + 1):
        job_id = f"alarm_repeat_{reminder_id}_{i}"
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
    logger.info("Alarm dismissed for reminder %s", reminder_id)


def _send_repeat_push(reminder_id: str, baby_id: str, title: str, body: str, reminder_type: str) -> None:
    """Send one repeat push — called by APScheduler. Skips if already dismissed."""
    if reminder_id in _dismissed_alarms:
        return
    db = SessionLocal()
    try:
        from app.services.notification_service import send_notification_to_household
        send_notification_to_household(
            db=db, baby_id=baby_id, title=title, body=body,
            alarm=True, reminder_type=reminder_type, reminder_id=reminder_id,
        )
    except Exception:
        logger.exception("Error sending repeat alarm push for %s", reminder_id)
    finally:
        db.close()

NOTIFICATION_BODIES = {
    "feeding":           "Time to feed {baby}!",
    "diaper":            "Time for a diaper check.",
    "vitamin_d":         "Don't forget Vitamin D drops.",
    "massage":           "Time for {baby}'s body massage.",
    "pre_feed_exercise": "Pre-feed exercise time — {baby} feeds soon.",
    "custom":            "{label}",
}


def fire_reminder(reminder_id: str) -> None:
    """Called by APScheduler. Sends push, then reschedules interval reminders."""
    db = SessionLocal()
    try:
        reminder = db.query(Reminder).get(reminder_id)
        if not reminder or not reminder.is_enabled:
            return

        from app.services.notification_service import send_notification_to_household
        from app.services.telegram_service import send_telegram_to_household
        baby = reminder.baby
        body_tpl = NOTIFICATION_BODIES.get(reminder.type, "{label}")
        body = body_tpl.format(baby=baby.name, label=reminder.label)
        rid = str(reminder.id)
        bid = str(reminder.baby_id)

        # Reset dismiss state so this new alarm cycle starts fresh
        _dismissed_alarms.discard(rid)

        push_sent = send_notification_to_household(
            db=db, baby_id=bid,
            title=reminder.label, body=body,
            alarm=True, reminder_type=reminder.type, reminder_id=rid,
        )
        tg_sent = send_telegram_to_household(
            db=db, baby_id=bid,
            title=reminder.label, body=body, alarm=True,
        )
        logger.info(
            "Fired reminder %s (%s) — push=%d telegram=%d",
            reminder.label, reminder.type, push_sent, tg_sent,
        )

        # Schedule repeat pushes every 30s for ~2.5 more minutes
        from app.scheduler.setup import scheduler
        for i in range(1, _ALARM_REPEAT_COUNT + 1):
            scheduler.add_job(
                _send_repeat_push,
                trigger="date",
                run_date=datetime.now(timezone.utc) + timedelta(seconds=_ALARM_REPEAT_INTERVAL * i),
                id=f"alarm_repeat_{rid}_{i}",
                replace_existing=True,
                args=[rid, bid, reminder.label, body, reminder.type],
            )

        # Reschedule interval-based reminders
        if reminder.interval_minutes:
            from app.services.reminder_service import calc_next_fire_interval
            reminder.next_fire_at = calc_next_fire_interval(
                datetime.now(timezone.utc), reminder.interval_minutes
            )
            db.commit()
            schedule_reminder(reminder)

        # Reschedule fixed-time daily reminders
        elif reminder.time_of_day:
            from app.services.reminder_service import calc_next_fire_fixed
            from app.models.user import User
            user = db.query(User).filter(User.household_id == baby.household_id).first()
            tz = user.timezone if user else "UTC"
            reminder.next_fire_at = calc_next_fire_fixed(reminder.time_of_day, tz)
            db.commit()
            schedule_reminder(reminder)

    except Exception:
        logger.exception("Error firing reminder %s", reminder_id)
    finally:
        db.close()


def schedule_reminder(reminder: Reminder) -> None:
    """Upsert an APScheduler date job for this reminder."""
    from app.scheduler.setup import scheduler
    job_id = f"reminder_{reminder.id}"

    if not reminder.is_enabled or not reminder.next_fire_at:
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        return

    fire_at = reminder.next_fire_at
    if fire_at.tzinfo is None:
        fire_at = fire_at.replace(tzinfo=timezone.utc)
    fire_at = fire_at.astimezone(timezone.utc)

    # Don't schedule jobs in the past
    if fire_at <= datetime.now(timezone.utc):
        logger.debug("Skipping past reminder job %s", job_id)
        return

    scheduler.add_job(
        fire_reminder,
        trigger="date",
        run_date=fire_at,
        id=job_id,
        args=[str(reminder.id)],
        replace_existing=True,
    )
    logger.debug("Scheduled %s at %s", job_id, fire_at)


def reload_reminder_jobs() -> None:
    """Called on startup — rebuild all APScheduler jobs from DB."""
    db = SessionLocal()
    try:
        reminders = db.query(Reminder).filter(Reminder.is_enabled == True).all()
        for r in reminders:
            schedule_reminder(r)
        logger.info("Loaded %d reminder jobs", len(reminders))
    except Exception:
        logger.exception("Failed to reload reminder jobs")
    finally:
        db.close()
