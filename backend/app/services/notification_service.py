import json
import logging
from sqlalchemy.orm import Session
from app.config import settings
from app.models.baby import Baby
from app.models.user import User
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


def send_notification_to_household(
    db: Session, baby_id: str, title: str, body: str, url: str = "/"
) -> int:
    """Send a Web Push notification to all household members. Returns sent count."""
    if not settings.vapid_private_key:
        logger.info("VAPID not configured — skipping push for: %s", title)
        return 0

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush not installed")
        return 0

    baby = db.query(Baby).get(baby_id)
    if not baby:
        return 0

    user_ids = [u.id for u in db.query(User).filter(User.household_id == baby.household_id).all()]
    subs = db.query(PushSubscription).filter(PushSubscription.user_id.in_(user_ids)).all()

    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": "/icons/icon-192.png",
        "badge": "/icons/badge-72.png",
        "data": {"url": url},
    })

    sent = 0
    expired: list[str] = []

    for sub in subs:
        try:
            webpush(
                subscription_info=sub.subscription_json,
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": f"mailto:{settings.vapid_claim_email}"},
            )
            sent += 1
        except Exception as e:
            # 410 = subscription expired
            if hasattr(e, "response") and e.response and e.response.status_code == 410:
                expired.append(sub.id)
            else:
                logger.error("Push failed for sub %s: %s", sub.id, e)

    for sub_id in expired:
        db.query(PushSubscription).filter(PushSubscription.id == sub_id).delete()
    if expired:
        db.commit()

    return sent
