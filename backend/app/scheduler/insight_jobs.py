"""APScheduler job: generate AI insights for all active babies every Monday."""
import logging
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)


def generate_all_insights() -> None:
    """Run as a BackgroundScheduler job. Opens its own DB session."""
    from app.services.insights_service import generate_insight, _current_week_start, WeeklyInsight
    from sqlalchemy import distinct

    db = SessionLocal()
    try:
        week_start = _current_week_start()
        since = datetime.now(timezone.utc) - timedelta(days=14)

        # Find all baby_ids with recent activity that don't yet have this week's insight
        active_baby_ids = [
            row[0] for row in
            db.query(distinct(ActivityLog.baby_id))
            .filter(ActivityLog.timestamp >= since)
            .all()
        ]

        for baby_id in active_baby_ids:
            already = db.query(WeeklyInsight).filter(
                WeeklyInsight.baby_id == baby_id,
                WeeklyInsight.week_start == week_start,
            ).first()
            if already:
                continue
            try:
                text = generate_insight(db, baby_id)
                insight = WeeklyInsight(baby_id=baby_id, week_start=week_start, insight_text=text)
                db.add(insight)
                db.commit()
                logger.info("Generated insight for baby %s", baby_id)
            except Exception:
                logger.exception("Failed to generate insight for baby %s", baby_id)
                db.rollback()
    finally:
        db.close()
