import logging
import urllib.request
import urllib.parse
import json
from app.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


def send_telegram_message(chat_id: str, text: str) -> bool:
    """Send a message to a Telegram chat. Returns True on success."""
    if not settings.telegram_bot_token or not chat_id:
        return False

    url = TELEGRAM_API.format(token=settings.telegram_bot_token)
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }).encode()

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception as e:
        logger.error("Telegram send failed (chat %s): %s", chat_id, e)
        return False


def send_telegram_to_household(db, baby_id: str, title: str, body: str) -> int:
    """Send a Telegram message to all household members who have a telegram_chat_id set."""
    from app.models.baby import Baby
    from app.models.user import User

    baby = db.query(Baby).get(baby_id)
    if not baby:
        return 0

    users = db.query(User).filter(
        User.household_id == baby.household_id,
        User.telegram_chat_id.isnot(None),
        User.telegram_chat_id != "",
    ).all()

    text = f"<b>{title}</b>\n{body}"
    sent = 0
    for user in users:
        if send_telegram_message(user.telegram_chat_id, text):
            sent += 1

    return sent
