import io
import math
import struct
import wave
import logging
import urllib.request
import json
from app.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
TELEGRAM_AUDIO_API = "https://api.telegram.org/bot{token}/sendAudio"


def _generate_alarm_wav() -> bytes:
    """Generate a 3-note ascending chime (C5→E5→G5, played twice) — pure stdlib, no deps."""
    sample_rate = 22050
    notes = [(523.25, 0.38), (659.25, 0.38), (783.99, 0.45)]  # C5, E5, G5

    all_frames: list[int] = []
    for repeat in range(2):
        if repeat > 0:
            all_frames.extend([0] * int(0.35 * sample_rate))  # pause between repeats
        for freq, dur in notes:
            n = int(dur * sample_rate)
            for i in range(n):
                t = i / sample_rate
                env = (t / 0.05) if t < 0.05 else math.exp(-4 * (t - 0.05) / dur)
                s = env * (
                    0.65 * math.sin(2 * math.pi * freq * t)
                    + 0.20 * math.sin(2 * math.pi * freq * 2 * t)
                    + 0.10 * math.sin(2 * math.pi * freq * 3 * t)
                )
                all_frames.append(max(-32767, min(32767, int(s * 32767))))

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(struct.pack(f"<{len(all_frames)}h", *all_frames))
    return buf.getvalue()


def send_telegram_message(chat_id: str, text: str) -> bool:
    """Send a text message to a Telegram chat. Returns True on success."""
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


def send_telegram_alarm(chat_id: str, title: str, body: str) -> bool:
    """Send an audio chime + caption to a Telegram chat as an alarm."""
    if not settings.telegram_bot_token or not chat_id:
        return False
    try:
        import httpx
        wav_bytes = _generate_alarm_wav()
        url = TELEGRAM_AUDIO_API.format(token=settings.telegram_bot_token)
        resp = httpx.post(
            url,
            data={"chat_id": chat_id, "caption": f"🔔 <b>{title}</b>\n{body}", "parse_mode": "HTML"},
            files={"audio": ("alarm.wav", wav_bytes, "audio/wav")},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error("Telegram alarm send failed (chat %s): %s", chat_id, e)
        # Fallback to plain text if audio fails
        return send_telegram_message(chat_id, f"🔔 <b>{title}</b>\n{body}")


def send_telegram_to_household(db, baby_id: str, title: str, body: str, alarm: bool = False) -> int:
    """Send a Telegram message (or audio alarm) to all household members."""
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

    sent = 0
    for user in users:
        if alarm:
            ok = send_telegram_alarm(user.telegram_chat_id, title, body)
        else:
            ok = send_telegram_message(user.telegram_chat_id, f"<b>{title}</b>\n{body}")
        if ok:
            sent += 1

    return sent
