from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.baby import Baby
from app.models.user import User
from app.schemas.analytics import (
    FeedingAnalyticsOut, DiaperAnalyticsOut, WeeklySummaryOut, ActivityHeatmapOut, WeeklyInsightOut
)
from app.services.analytics_service import (
    feeding_analytics, diaper_analytics, weekly_summary, activity_heatmap
)
from app.services.insights_service import get_or_generate_insight

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _assert_baby(db: Session, baby_id: str, user: User) -> Baby:
    baby = db.query(Baby).get(baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(404, "Baby not found")
    return baby


@router.get("/feeding", response_model=FeedingAnalyticsOut)
def get_feeding(baby_id: str, days: int = 7,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    return feeding_analytics(db, baby_id, days)


@router.get("/diapers", response_model=DiaperAnalyticsOut)
def get_diapers(baby_id: str, days: int = 7,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    return diaper_analytics(db, baby_id, days)


@router.get("/weekly-summary", response_model=WeeklySummaryOut)
def get_weekly(baby_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    return weekly_summary(db, baby_id)


@router.get("/activity-heatmap", response_model=ActivityHeatmapOut)
def get_heatmap(baby_id: str, days: int = 30, type: str = "diaper",
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    return activity_heatmap(db, baby_id, days, type)


@router.get("/insights", response_model=WeeklyInsightOut)
def get_insights(baby_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_baby(db, baby_id, user)
    insight = get_or_generate_insight(db, baby_id)
    if not insight:
        raise HTTPException(404, "Not enough data yet for an insight")
    return insight
