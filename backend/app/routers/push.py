from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.push import PushSubscribeIn, PushSubscriptionOut

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/subscribe", response_model=PushSubscriptionOut, status_code=201)
def subscribe(body: PushSubscribeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    endpoint = body.subscription.get("endpoint", "")
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id,
    ).all()
    for s in existing:
        if s.subscription_json.get("endpoint") == endpoint:
            return s

    sub = PushSubscription(user_id=user.id, device_label=body.device_label,
                           subscription_json=body.subscription)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/subscriptions", response_model=list[PushSubscriptionOut])
def list_subscriptions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()


@router.delete("/subscribe/{sub_id}", status_code=204)
def unsubscribe(sub_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).get(sub_id)
    if not sub or sub.user_id != user.id:
        raise HTTPException(404)
    db.delete(sub)
    db.commit()


@router.post("/test")
def test_push(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services.notification_service import send_notification_to_household
    babies = db.query(__import__("app.models.baby", fromlist=["Baby"]).Baby).filter_by(
        household_id=user.household_id
    ).first()
    if not babies:
        raise HTTPException(400, "No baby profile found")
    sent = send_notification_to_household(
        db=db, baby_id=babies.id,
        title="CryBaby Test", body="Push notifications are working!",
    )
    return {"ok": True, "sent_to": sent}


@router.get("/bot-info")
def bot_info(user: User = Depends(get_current_user)):
    """Returns the Telegram bot username if configured, so the frontend can link to it."""
    from app.config import settings
    if not settings.telegram_bot_token:
        return {"bot_username": None}
    try:
        import urllib.request, json as _json
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/getMe"
        with urllib.request.urlopen(url, timeout=4) as r:
            data = _json.loads(r.read())
        return {"bot_username": data.get("result", {}).get("username")}
    except Exception:
        return {"bot_username": None}


@router.post("/test-telegram")
def test_telegram(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services.telegram_service import send_telegram_message
    from app.config import settings
    if not settings.telegram_bot_token:
        raise HTTPException(400, "TELEGRAM_BOT_TOKEN not configured in backend .env")
    if not user.telegram_chat_id:
        raise HTTPException(400, "No Telegram chat ID saved for your account yet")
    ok = send_telegram_message(user.telegram_chat_id, "✅ <b>CryBaby test message</b>\nTelegram notifications are working!")
    if not ok:
        raise HTTPException(502, "Telegram API call failed — check your bot token and chat ID")
    return {"ok": True}
