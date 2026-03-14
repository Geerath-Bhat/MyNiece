from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_verified
from app.models.activity_log import ActivityLog
from app.models.baby import Baby
from app.models.user import User
from app.schemas.log import ActivityLogIn, ActivityLogOut, LastFeedOut
from app.services.reminder_service import get_feeding_reminder

router = APIRouter(prefix="/logs", tags=["logs"])


def _assert_baby(db: Session, baby_id: str, user: User) -> Baby:
    baby = db.query(Baby).get(baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(404, "Baby not found")
    return baby


@router.get("", response_model=dict)
def list_logs(baby_id: str, type: str | None = None,
              from_dt: datetime | None = None, to_dt: datetime | None = None,
              limit: int = 50, offset: int = 0,
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    q = db.query(ActivityLog).filter(ActivityLog.baby_id == baby_id)
    if type:
        q = q.filter(ActivityLog.type == type)
    if from_dt:
        q = q.filter(ActivityLog.timestamp >= from_dt)
    if to_dt:
        q = q.filter(ActivityLog.timestamp <= to_dt)
    total = q.count()
    items = q.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [ActivityLogOut.model_validate(i) for i in items]}


@router.post("", response_model=ActivityLogOut, status_code=201)
def create_log(body: ActivityLogIn, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    _assert_baby(db, body.baby_id, user)
    ts = body.timestamp or datetime.now(timezone.utc)
    log = ActivityLog(
        baby_id=body.baby_id, logged_by=user.id, type=body.type,
        timestamp=ts, diaper_type=body.diaper_type,
        custom_label=body.custom_label, notes=body.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # After a feed, reschedule the feeding reminder
    if body.type == "feed":
        from app.services.reminder_service import reschedule_after_feed
        reschedule_after_feed(db, body.baby_id, log.timestamp, user.timezone)

    # Publish real-time event to SSE subscribers
    from app.services.event_bus import publish
    from app.schemas.log import ActivityLogOut
    baby = db.query(Baby).get(body.baby_id)
    if baby:
        publish(baby.household_id, {
            "type": "activity_log",
            "payload": ActivityLogOut.model_validate(log).model_dump(mode="json"),
        })

        # Build notification message
        type_labels = {"feed": "🍼 Feed logged", "diaper": "🧷 Diaper logged", "custom": "📝 Activity logged"}
        notif_title = type_labels.get(body.type, "📝 Activity logged")
        notif_body_parts = [f"Logged by {user.display_name} for {baby.name}"]
        if body.notes:
            notif_body_parts.append(body.notes)
        notif_body = " · ".join(notif_body_parts)

        # Push + Telegram (fire-and-forget with own DB session so request session can close)
        import threading
        _baby_id = str(body.baby_id)
        _title, _body = notif_title, notif_body

        def _notify():
            from app.database import SessionLocal
            from app.services.notification_service import send_notification_to_household
            from app.services.telegram_service import send_telegram_to_household
            _db = SessionLocal()
            try:
                send_notification_to_household(_db, _baby_id, _title, _body)
                send_telegram_to_household(_db, _baby_id, _title, _body)
            finally:
                _db.close()

        threading.Thread(target=_notify, daemon=True).start()

    return log


@router.get("/last-feed", response_model=LastFeedOut)
def last_feed(baby_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    log = (
        db.query(ActivityLog)
        .filter(ActivityLog.baby_id == baby_id, ActivityLog.type == "feed")
        .order_by(ActivityLog.timestamp.desc())
        .first()
    )
    if not log:
        raise HTTPException(404, "No feed logged yet")

    now = datetime.now(timezone.utc)
    ts = log.timestamp if log.timestamp.tzinfo else log.timestamp.replace(tzinfo=timezone.utc)
    minutes_since = (now - ts).total_seconds() / 60

    feeding_r = get_feeding_reminder(db, baby_id)
    interval = feeding_r.interval_minutes if feeding_r else 150
    next_due = ts + timedelta(minutes=interval)
    return LastFeedOut(timestamp=ts, minutes_since=minutes_since, next_due_at=next_due)



@router.get("/{log_id}", response_model=ActivityLogOut)
def get_log(log_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log = db.query(ActivityLog).get(log_id)
    if not log:
        raise HTTPException(404)
    _assert_baby(db, log.baby_id, user)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: str, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    log = db.query(ActivityLog).get(log_id)
    if not log:
        raise HTTPException(404)
    _assert_baby(db, log.baby_id, user)
    db.delete(log)
    db.commit()
