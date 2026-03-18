from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_verified, get_effective_household_id
from app.models.baby import Baby
from app.models.health import DoctorVisit, VaccineRecord, Milestone
from app.models.user import User
from app.schemas.health import DoctorVisitIn, DoctorVisitOut, VaccineRecordIn, VaccineRecordOut, MilestoneIn, MilestoneOut

router = APIRouter(prefix="/health", tags=["health"])


def _assert_baby(db: Session, baby_id: str, household_id: str) -> Baby:
    baby = db.query(Baby).filter(Baby.id == baby_id).first()
    if not baby or baby.household_id != household_id:
        raise HTTPException(404, "Baby not found")
    return baby


# ── Doctor visits ────────────────────────────────────────────────────────────

@router.get("/visits", response_model=list[DoctorVisitOut])
def list_visits(
    baby_id: str,
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    return (db.query(DoctorVisit)
            .filter(DoctorVisit.baby_id == baby_id)
            .order_by(DoctorVisit.date.desc())
            .all())


@router.post("/visits", response_model=DoctorVisitOut, status_code=201)
def create_visit(
    baby_id: str,
    body: DoctorVisitIn,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    visit = DoctorVisit(baby_id=baby_id, logged_by=user.id, **body.model_dump())
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/visits/{visit_id}", status_code=204)
def delete_visit(
    visit_id: str,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(404)
    _assert_baby(db, visit.baby_id, household_id)
    db.delete(visit)
    db.commit()


# ── Vaccine records ──────────────────────────────────────────────────────────

@router.get("/vaccines", response_model=list[VaccineRecordOut])
def list_vaccines(
    baby_id: str,
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    return db.query(VaccineRecord).filter(VaccineRecord.baby_id == baby_id).all()


@router.post("/vaccines", response_model=VaccineRecordOut, status_code=201)
def mark_vaccine(
    baby_id: str,
    body: VaccineRecordIn,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    # Prevent duplicate for same vaccine
    existing = db.query(VaccineRecord).filter(
        VaccineRecord.baby_id == baby_id,
        VaccineRecord.vaccine_key == body.vaccine_key,
    ).first()
    if existing:
        raise HTTPException(409, "Vaccine already recorded")
    record = VaccineRecord(baby_id=baby_id, logged_by=user.id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/vaccines/{record_id}", status_code=204)
def unmark_vaccine(
    record_id: str,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    record = db.query(VaccineRecord).filter(VaccineRecord.id == record_id).first()
    if not record:
        raise HTTPException(404)
    _assert_baby(db, record.baby_id, household_id)
    db.delete(record)
    db.commit()


# ── Milestones ───────────────────────────────────────────────────────────────

@router.get("/milestones", response_model=list[MilestoneOut])
def list_milestones(
    baby_id: str,
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    return (db.query(Milestone)
            .filter(Milestone.baby_id == baby_id)
            .order_by(Milestone.achieved_date.asc())
            .all())


@router.post("/milestones", response_model=MilestoneOut, status_code=201)
def add_milestone(
    baby_id: str,
    body: MilestoneIn,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    _assert_baby(db, baby_id, household_id)
    milestone = Milestone(baby_id=baby_id, logged_by=user.id, **body.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    milestone_id: str,
    user: User = Depends(require_verified),
    household_id: str = Depends(get_effective_household_id),
    db: Session = Depends(get_db),
):
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(404)
    _assert_baby(db, milestone.baby_id, household_id)
    db.delete(milestone)
    db.commit()
