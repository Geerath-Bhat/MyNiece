import logging
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(
    job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 300},
    timezone="UTC",
)


def start_scheduler() -> None:
    scheduler.start()
    logger.info("APScheduler started")
    from app.scheduler.jobs import reload_reminder_jobs
    reload_reminder_jobs()

    # Weekly AI insight generation — every Monday at 06:00 UTC
    from apscheduler.triggers.cron import CronTrigger
    from app.scheduler.insight_jobs import generate_all_insights
    scheduler.add_job(
        generate_all_insights, CronTrigger(day_of_week="mon", hour=6, minute=0),
        id="weekly_insights", replace_existing=True,
    )
    logger.info("Registered weekly insights job")


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
