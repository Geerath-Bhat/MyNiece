from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler(
    job_defaults={"coalesce": True, "max_instances": 1},
    timezone="UTC",
)


def start_scheduler():
    scheduler.start()
    # Reload jobs in Milestone 2 when reminder logic is added


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
