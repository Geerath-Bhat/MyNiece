"""AI-generated weekly pattern insights using Claude Haiku."""
import logging
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.models.baby import Baby
from app.models.activity_log import ActivityLog
from app.models.weekly_insight import WeeklyInsight

logger = logging.getLogger(__name__)


def _current_week_start() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())


def _feed_stats(db: Session, baby_id: str, since: datetime) -> dict:
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.baby_id == baby_id, ActivityLog.type == "feed", ActivityLog.timestamp >= since)
        .order_by(ActivityLog.timestamp)
        .all()
    )
    count = len(logs)
    avg_interval_h = None
    if count > 1:
        intervals = [
            (logs[i].timestamp - logs[i - 1].timestamp).total_seconds() / 3600
            for i in range(1, count)
        ]
        avg_interval_h = round(sum(intervals) / len(intervals), 2)
    return {"count": count, "avg_interval_h": avg_interval_h}


def generate_insight(db: Session, baby_id: str) -> str:
    """Call Claude Haiku and return a short insight paragraph. Raises if LLM not configured."""
    if not settings.active_llm_key:
        raise ValueError("No LLM API key set (GEMINI_API_KEY or LLM_API_KEY)")

    baby = db.query(Baby).get(baby_id)
    if not baby:
        raise ValueError("Baby not found")

    week_start = _current_week_start()
    since_this = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    since_last = since_this - timedelta(days=7)

    this = _feed_stats(db, baby_id, since_this)
    last = _feed_stats(db, baby_id, since_last)

    diapers_this = db.query(ActivityLog).filter(
        ActivityLog.baby_id == baby_id, ActivityLog.type == "diaper", ActivityLog.timestamp >= since_this
    ).count()

    # Build a compact data block for the prompt
    lines = [f"Baby name: {baby.name}"]
    lines.append(f"This week feeds: {this['count']}")
    if this["avg_interval_h"] is not None:
        lines.append(f"This week avg feed interval: {this['avg_interval_h']}h")
    if last["avg_interval_h"] is not None:
        lines.append(f"Last week avg feed interval: {last['avg_interval_h']}h")
    lines.append(f"This week diaper changes: {diapers_this}")

    prompt = "\n".join(lines)

    system = (
        "You are a friendly baby care assistant. The user will give you stats about their baby's week. "
        "Write ONE short paragraph (2-3 sentences max) in warm, parent-friendly language summarising any "
        "notable patterns or changes. Do not give medical advice. Do not use bullet points or lists. "
        "Be encouraging and specific. Return only the paragraph text, nothing else."
    )

    provider = settings.active_llm_provider

    if provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=settings.active_llm_key)
        model = genai.GenerativeModel(
            model_name=settings.active_llm_model,
            system_instruction=system,
        )
        resp = model.generate_content(prompt)
        return resp.text.strip()

    elif provider == "groq":
        import openai
        client = openai.OpenAI(
            api_key=settings.active_llm_key,
            base_url="https://api.groq.com/openai/v1",
        )
        resp = client.chat.completions.create(
            model=settings.active_llm_model,
            max_tokens=256,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        )
        return (resp.choices[0].message.content or "").strip()

    elif provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=settings.active_llm_key)
        msg = client.messages.create(
            model=settings.active_llm_model,
            max_tokens=256,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text.strip()

    else:
        import openai
        client = openai.OpenAI(api_key=settings.active_llm_key)
        resp = client.chat.completions.create(
            model=settings.active_llm_model,
            max_tokens=256,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        )
        return (resp.choices[0].message.content or "").strip()


def get_or_generate_insight(db: Session, baby_id: str) -> WeeklyInsight | None:
    """Return cached insight for this week, or generate one on demand."""
    week_start = _current_week_start()
    existing = (
        db.query(WeeklyInsight)
        .filter(WeeklyInsight.baby_id == baby_id, WeeklyInsight.week_start == week_start)
        .first()
    )
    if existing:
        return existing

    # Check baby has enough data to generate something meaningful
    since = datetime.combine(week_start - timedelta(days=7), datetime.min.time()).replace(tzinfo=timezone.utc)
    has_data = db.query(ActivityLog).filter(
        ActivityLog.baby_id == baby_id, ActivityLog.timestamp >= since
    ).limit(3).count() >= 3
    if not has_data:
        return None

    try:
        text = generate_insight(db, baby_id)
    except Exception:
        logger.exception("Insight generation failed for baby %s", baby_id)
        return None

    insight = WeeklyInsight(baby_id=baby_id, week_start=week_start, insight_text=text)
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight
