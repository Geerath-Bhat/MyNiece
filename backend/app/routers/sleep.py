from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_verified, get_effective_household_id
from app.models.sleep_session import SleepSession
from app.models.baby import Baby
from app.models.user import User
from app.schemas.sleep import SleepStartIn, SleepEndIn, SleepSessionOut

router = APIRouter(prefix="/sleep", tags=["sleep"])


def _assert_baby(db: Session, baby_id: str, household_id: str) -> Baby:
    baby = db.query(Baby).filter(Baby.id == baby_id).first()
    if not baby or baby.household_id != household_id:
        raise HTTPException(404, "Baby not found")
    return baby


@router.get("", response_model=dict)
def list_sleep(
    baby_id: str,
    limit: int = 20,
    offset: int = 0,
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    q = db.query(SleepSession).filter(SleepSession.baby_id == baby_id)
    total = q.count()
    items = q.order_by(SleepSession.started_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [SleepSessionOut.model_validate(s) for s in items]}


@router.get("/active", response_model=SleepSessionOut | None)
def active_sleep(
    baby_id: str,
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    session = (
        db.query(SleepSession)
        .filter(SleepSession.baby_id == baby_id, SleepSession.ended_at.is_(None))
        .order_by(SleepSession.started_at.desc())
        .first()
    )
    return session


@router.post("", response_model=SleepSessionOut, status_code=201)
def start_sleep(
    body: SleepStartIn,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    baby = _assert_baby(db, body.baby_id, household_id)

    # Enforce single active session per baby
    active = db.query(SleepSession).filter(
        SleepSession.baby_id == body.baby_id, SleepSession.ended_at.is_(None)
    ).first()
    if active:
        raise HTTPException(409, "Sleep session already in progress. End it first.")

    session = SleepSession(
        baby_id=body.baby_id,
        logged_by=user.id,
        started_at=body.started_at or datetime.now(timezone.utc),
        notes=body.notes,
        quality=body.quality,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Publish SSE event
    from app.services.event_bus import publish
    from app.schemas.sleep import SleepSessionOut as SOut
    publish(baby.household_id, {
        "type": "sleep_start",
        "payload": SOut.model_validate(session).model_dump(mode="json"),
    })

    import threading
    _baby_id = str(body.baby_id)
    _title = f"😴 Sleep started"
    _body = f"Logged by {user.display_name} for {baby.name}"

    def _notify_sleep_start():
        from app.database import SessionLocal
        from app.services.notification_service import send_notification_to_household
        from app.services.telegram_service import send_telegram_to_household
        _db = SessionLocal()
        try:
            send_notification_to_household(_db, _baby_id, _title, _body)
            send_telegram_to_household(_db, _baby_id, _title, _body)
        finally:
            _db.close()

    threading.Thread(target=_notify_sleep_start, daemon=True).start()

    return session


@router.patch("/{session_id}/end", response_model=SleepSessionOut)
def end_sleep(
    session_id: str,
    body: SleepEndIn,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    session = db.query(SleepSession).filter(SleepSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Sleep session not found")
    baby = _assert_baby(db, session.baby_id, household_id)

    if session.ended_at is not None:
        raise HTTPException(400, "Sleep session already ended")

    ended = body.ended_at or datetime.now(timezone.utc)
    started = session.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)

    session.ended_at = ended
    session.duration_minutes = (ended - started).total_seconds() / 60
    if body.quality:
        session.quality = body.quality
    if body.notes:
        session.notes = body.notes
    db.commit()
    db.refresh(session)

    from app.services.event_bus import publish
    from app.schemas.sleep import SleepSessionOut as SOut
    publish(baby.household_id, {
        "type": "sleep_end",
        "payload": SOut.model_validate(session).model_dump(mode="json"),
    })

    import threading
    _baby_id = str(session.baby_id)
    dur = round(session.duration_minutes or 0)
    _title = "⏰ Sleep ended"
    _body = f"{baby.name} slept for {dur} min · by {user.display_name}"

    def _notify_sleep_end():
        from app.database import SessionLocal
        from app.services.notification_service import send_notification_to_household
        from app.services.telegram_service import send_telegram_to_household
        _db = SessionLocal()
        try:
            send_notification_to_household(_db, _baby_id, _title, _body)
            send_telegram_to_household(_db, _baby_id, _title, _body)
        finally:
            _db.close()

    threading.Thread(target=_notify_sleep_end, daemon=True).start()

    return session


@router.delete("/{session_id}", status_code=204)
def delete_sleep(
    session_id: str,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    session = db.query(SleepSession).filter(SleepSession.id == session_id).first()
    if not session:
        raise HTTPException(404)
    _assert_baby(db, session.baby_id, household_id)
    db.delete(session)
    db.commit()
