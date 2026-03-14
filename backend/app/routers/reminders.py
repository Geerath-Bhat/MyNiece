from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.reminder import Reminder
from app.models.baby import Baby
from app.models.user import User
from app.schemas.reminder import ReminderIn, ReminderOut, ReminderPatch, ToggleIn
from app.services.reminder_service import set_next_fire
from app.scheduler.jobs import schedule_reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _assert_reminder(db: Session, reminder_id: str, user: User) -> Reminder:
    r = db.query(Reminder).get(reminder_id)
    if not r:
        raise HTTPException(404, "Reminder not found")
    baby = db.query(Baby).get(r.baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(403, "Access denied")
    return r


@router.get("", response_model=list[ReminderOut])
def list_reminders(baby_id: str | None = None, type: str | None = None,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get all babies in household
    baby_ids = [b.id for b in db.query(Baby).filter(Baby.household_id == user.household_id).all()]
    q = db.query(Reminder).filter(Reminder.baby_id.in_(baby_ids))
    if baby_id:
        q = q.filter(Reminder.baby_id == baby_id)
    if type:
        q = q.filter(Reminder.type == type)
    return q.order_by(Reminder.created_at).all()


@router.post("", response_model=ReminderOut, status_code=201)
def create_reminder(body: ReminderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    baby = db.query(Baby).get(body.baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(403, "Access denied")

    r = Reminder(created_by=user.id, **body.model_dump())
    db.add(r)
    db.flush()
    set_next_fire(r, user.timezone)
    db.commit()
    db.refresh(r)
    schedule_reminder(r)
    return r


@router.get("/{reminder_id}", response_model=ReminderOut)
def get_reminder(reminder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _assert_reminder(db, reminder_id, user)


@router.patch("/{reminder_id}", response_model=ReminderOut)
def patch_reminder(reminder_id: str, body: ReminderPatch,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _assert_reminder(db, reminder_id, user)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(r, k, v)
    set_next_fire(r, user.timezone)
    db.commit()
    db.refresh(r)
    schedule_reminder(r)
    return r


@router.patch("/{reminder_id}/toggle", response_model=ReminderOut)
def toggle_reminder(reminder_id: str, body: ToggleIn,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _assert_reminder(db, reminder_id, user)
    r.is_enabled = body.is_enabled
    if body.is_enabled:
        set_next_fire(r, user.timezone)
    db.commit()
    db.refresh(r)
    schedule_reminder(r)
    return r


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _assert_reminder(db, reminder_id, user)
    # Remove scheduler job
    from app.scheduler.setup import scheduler
    job_id = f"reminder_{r.id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    db.delete(r)
    db.commit()
