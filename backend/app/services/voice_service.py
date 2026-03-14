import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.models.baby import Baby
from app.models.reminder import Reminder
from app.models.activity_log import ActivityLog
from app.models.voice_command import VoiceCommand
from app.schemas.voice import VoiceResultOut

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an intent extraction engine for a baby care tracking app.
Extract the user's intent from the voice transcript and return ONLY valid JSON.

Today is {today}. Current time: {current_time} ({timezone}).
Baby name: {baby_name}.

IMPORTANT RULES:
1. If the transcript is NOT related to baby care (feeding, diapers, sleep, reminders, health), set intent to "irrelevant".
2. If you are unsure or confidence is below 0.6, set intent to "unknown".
3. Examples of IRRELEVANT inputs: "I am going to market", "what's the weather", "play music", "call mom".
4. For timestamps: "at 3pm" means today at 15:00, "an hour ago" means {current_time} minus 60 minutes.
5. For feeding interval changes: "change feeding to every 4 hours" → interval_minutes = 240.

Return JSON with this exact shape:
{{
  "intent": "<one of: log_feed | log_diaper | log_custom | update_reminder | toggle_reminder | create_reminder | query_last_feed | irrelevant | unknown>",
  "confidence": 0.0,
  "entities": {{
    "timestamp": "<ISO 8601 or null>",
    "diaper_type": "<wet|dirty|both|null>",
    "reminder_type": "<feeding|diaper|vitamin_d|massage|pre_feed_exercise|custom|null>",
    "custom_label": "<string or null>",
    "interval_minutes": <integer or null>,
    "time_of_day": "<HH:MM or null>",
    "is_enabled": <true|false|null>,
    "notes": "<string or null>"
  }},
  "response_message": "<1-sentence human-friendly message. For irrelevant: explain this is a baby care app only.>"
}}"""


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


async def call_llm(transcript: str, tz: str, baby_name: str) -> dict:
    now = datetime.now(timezone.utc)
    system = SYSTEM_PROMPT.format(
        today=now.strftime("%Y-%m-%d"),
        current_time=now.strftime("%H:%M"),
        timezone=tz,
        baby_name=baby_name,
    )
    user_msg = f'Transcript: "{transcript}"'
    provider = settings.active_llm_provider

    if provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=settings.active_llm_key)
        model = genai.GenerativeModel(
            model_name=settings.active_llm_model,
            system_instruction=system,
        )
        resp = model.generate_content(user_msg)
        raw = resp.text

    elif provider == "groq":
        import openai
        client = openai.OpenAI(
            api_key=settings.active_llm_key,
            base_url="https://api.groq.com/openai/v1",
        )
        resp = client.chat.completions.create(
            model=settings.active_llm_model,
            max_tokens=512,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
        )
        raw = resp.choices[0].message.content or ""

    elif provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=settings.active_llm_key)
        msg = client.messages.create(
            model=settings.active_llm_model,
            max_tokens=512,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = msg.content[0].text

    else:
        import openai
        client = openai.OpenAI(api_key=settings.active_llm_key)
        resp = client.chat.completions.create(
            model=settings.active_llm_model,
            max_tokens=512,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
        )
        raw = resp.choices[0].message.content or ""

    return json.loads(_strip_fences(raw))


async def interpret(db: Session, transcript: str, baby_id: str, user_id: str, user_tz: str) -> VoiceResultOut:
    baby = db.query(Baby).get(baby_id)
    if not baby:
        return VoiceResultOut(intent="unknown", entities={}, action_taken="error",
                              response_message="Baby not found.", success=False)

    error_msg = None
    llm_data: dict = {}
    result = VoiceResultOut(intent="unknown", entities={}, action_taken="none",
                            response_message="Sorry, I didn't understand that.", success=False)

    try:
        llm_data = await call_llm(transcript, user_tz, baby.name)
        intent = llm_data.get("intent", "unknown")
        entities = llm_data.get("entities", {})
        response_msg = llm_data.get("response_message", "Done.")
        result.intent = intent
        result.entities = entities
        result.response_message = response_msg

        from app.services.reminder_service import reschedule_after_feed

        # Block irrelevant inputs immediately
        if intent == "irrelevant" or llm_data.get("confidence", 1.0) < 0.5:
            result.intent = "irrelevant"
            result.action_taken = "none"
            result.response_message = llm_data.get("response_message",
                "That doesn't seem related to baby care. Try saying something like 'I fed the baby at 3pm'.")
            result.success = False
            db.add(VoiceCommand(
                user_id=user_id, baby_id=baby_id, transcript=transcript,
                detected_intent="irrelevant", entities_json={}, success=False, error_message=None,
            ))
            db.commit()
            return result

        match intent:
            case "log_feed":
                ts = _parse_ts(entities.get("timestamp"))
                log = ActivityLog(baby_id=baby_id, logged_by=user_id, type="feed", timestamp=ts,
                                  notes=entities.get("notes"))
                db.add(log)
                db.commit()
                db.refresh(log)
                reschedule_after_feed(db, baby_id, log.timestamp, user_tz)
                result.log_id = log.id
                result.action_taken = "feed_logged"
                result.success = True

            case "log_diaper":
                ts = _parse_ts(entities.get("timestamp"))
                log = ActivityLog(baby_id=baby_id, logged_by=user_id, type="diaper", timestamp=ts,
                                  diaper_type=entities.get("diaper_type") or "wet",
                                  notes=entities.get("notes"))
                db.add(log)
                db.commit()
                db.refresh(log)
                result.log_id = log.id
                result.action_taken = "diaper_logged"
                result.success = True

            case "log_custom":
                ts = _parse_ts(entities.get("timestamp"))
                log = ActivityLog(baby_id=baby_id, logged_by=user_id, type="custom", timestamp=ts,
                                  custom_label=entities.get("custom_label"),
                                  notes=entities.get("notes"))
                db.add(log)
                db.commit()
                result.log_id = log.id
                result.action_taken = "custom_logged"
                result.success = True

            case "update_reminder":
                r = _get_reminder(db, baby_id, entities.get("reminder_type"))
                if r:
                    if entities.get("interval_minutes"):
                        r.interval_minutes = entities["interval_minutes"]
                    if entities.get("time_of_day"):
                        from datetime import time
                        h, m = entities["time_of_day"].split(":")
                        r.time_of_day = time(int(h), int(m))
                    from app.services.reminder_service import set_next_fire
                    set_next_fire(r, user_tz)
                    db.commit()
                    from app.scheduler.jobs import schedule_reminder
                    schedule_reminder(r)
                    result.reminder_id = r.id
                    result.action_taken = "reminder_updated"
                    result.success = True

            case "toggle_reminder":
                r = _get_reminder(db, baby_id, entities.get("reminder_type"))
                if r:
                    r.is_enabled = entities.get("is_enabled", not r.is_enabled)
                    db.commit()
                    from app.scheduler.jobs import schedule_reminder
                    schedule_reminder(r)
                    result.reminder_id = r.id
                    result.action_taken = "reminder_toggled"
                    result.success = True

            case "create_reminder":
                from app.services.reminder_service import set_next_fire
                r = Reminder(
                    baby_id=baby_id, created_by=user_id,
                    type=entities.get("reminder_type") or "custom",
                    label=entities.get("custom_label") or "Custom reminder",
                    interval_minutes=entities.get("interval_minutes"),
                )
                if entities.get("time_of_day"):
                    from datetime import time
                    h, m = entities["time_of_day"].split(":")
                    r.time_of_day = time(int(h), int(m))
                db.add(r)
                db.flush()
                set_next_fire(r, user_tz)
                db.commit()
                from app.scheduler.jobs import schedule_reminder
                schedule_reminder(r)
                result.reminder_id = r.id
                result.action_taken = "reminder_created"
                result.success = True

    except Exception as e:
        logger.exception("Voice interpret error")
        error_msg = str(e)
        err_lower = str(e).lower()
        if "credit balance" in err_lower or "billing" in err_lower or "quota" in err_lower:
            result.response_message = "AI service is unavailable — API quota or credit issue. Check your API key."
        elif "invalid_api_key" in err_lower or "authentication" in err_lower:
            result.response_message = "AI service is unavailable — invalid API key configured."
        else:
            result.response_message = "Something went wrong processing your command."

    # Audit log
    db.add(VoiceCommand(
        user_id=user_id, baby_id=baby_id, transcript=transcript,
        detected_intent=result.intent,
        entities_json=llm_data.get("entities"),
        success=result.success, error_message=error_msg,
    ))
    db.commit()
    return result


def _parse_ts(ts_str: str | None) -> datetime:
    if not ts_str:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return datetime.now(timezone.utc)


def _get_reminder(db: Session, baby_id: str, r_type: str | None) -> Reminder | None:
    if not r_type:
        return None
    return db.query(Reminder).filter(
        Reminder.baby_id == baby_id, Reminder.type == r_type
    ).first()
