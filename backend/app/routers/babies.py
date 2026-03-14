from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.baby import Baby, WeightLog
from app.models.user import User
from app.schemas.baby import BabyIn, BabyOut, BabyPatch, WeightLogIn, WeightLogOut

router = APIRouter(prefix="/babies", tags=["babies"])


def _assert_baby(db: Session, baby_id: str, user: User) -> Baby:
    baby = db.query(Baby).get(baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(404, "Baby not found")
    return baby


@router.get("", response_model=list[BabyOut])
def list_babies(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Baby).filter(Baby.household_id == user.household_id).all()


@router.post("", response_model=BabyOut, status_code=201)
def create_baby(body: BabyIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    baby = Baby(household_id=user.household_id, **body.model_dump())
    db.add(baby)
    db.commit()
    db.refresh(baby)

    # Seed default reminders for this baby
    from app.models.reminder import Reminder
    from datetime import time
    defaults = [
        Reminder(baby_id=baby.id, created_by=user.id, type="feeding",
                 label="Feeding", interval_minutes=150),
        Reminder(baby_id=baby.id, created_by=user.id, type="diaper",
                 label="Diaper Check", interval_minutes=180),
        Reminder(baby_id=baby.id, created_by=user.id, type="vitamin_d",
                 label="Vitamin D", time_of_day=time(12, 30)),
        Reminder(baby_id=baby.id, created_by=user.id, type="massage",
                 label="Body Massage", time_of_day=time(10, 0), is_enabled=False),
    ]
    for r in defaults:
        db.add(r)
    db.commit()
    return baby


@router.get("/{baby_id}", response_model=BabyOut)
def get_baby(baby_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _assert_baby(db, baby_id, user)


@router.patch("/{baby_id}", response_model=BabyOut)
def patch_baby(baby_id: str, body: BabyPatch, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    baby = _assert_baby(db, baby_id, user)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(baby, k, v)
    db.commit()
    db.refresh(baby)
    return baby


# ── Weight logs ────────────────────────────────────────────────

@router.get("/{baby_id}/weight", response_model=list[WeightLogOut])
def list_weight(baby_id: str, limit: int = 30,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    return (db.query(WeightLog).filter(WeightLog.baby_id == baby_id)
            .order_by(WeightLog.date.desc()).limit(limit).all())


@router.post("/{baby_id}/weight", response_model=WeightLogOut, status_code=201)
def add_weight(baby_id: str, body: WeightLogIn,
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    w = WeightLog(baby_id=baby_id, logged_by=user.id, **body.model_dump())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w
