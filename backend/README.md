# CryBaby — Backend

FastAPI backend with SQLAlchemy, APScheduler, Web Push, and Telegram notifications.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

> **Zero config for local dev** — SQLite is used by default, no database setup needed.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | **Yes (prod)** | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | No | Defaults to SQLite. Set to Postgres URL for production |
| `GROQ_API_KEY` | No* | Free LLM for voice commands — sign up at console.groq.com |
| `GEMINI_API_KEY` | No* | Alternative free LLM — aistudio.google.com |
| `LLM_API_KEY` | No* | Anthropic/OpenAI key — fallback for AI insights |
| `VAPID_PRIVATE_KEY` | No | Required for push notifications |
| `VAPID_PUBLIC_KEY` | No | Must match frontend `VITE_VAPID_PUBLIC_KEY` |
| `VAPID_CLAIM_EMAIL` | No | Your email, included in VAPID claims |
| `TELEGRAM_BOT_TOKEN` | No | Create a bot via @BotFather on Telegram |
| `SMTP_USER` | No | Gmail address for OTP email verification |
| `SMTP_PASSWORD` | No | Gmail App Password (16-char, not your main password) |
| `CORS_ORIGINS` | No | Defaults to `http://localhost:5173` |
| `SUPER_ADMIN_EMAIL` | No | This email gets super_admin role automatically on register/login |

*One of `GROQ_API_KEY` or `GEMINI_API_KEY` needed for voice commands (both free).

## Generate VAPID Keys

```bash
source .venv/bin/activate
python scripts/gen_vapid.py
# Copy the output into .env and Netlify/Fly env vars
```

## Project Structure

```
app/
├── main.py           App factory, CORS, static files, lifespan
├── config.py         Settings loaded from .env
├── database.py       SQLAlchemy engine + session
├── dependencies.py   JWT auth + require_verified dependencies
├── models/           ORM models (one file per table)
├── schemas/          Pydantic request/response schemas
├── routers/          Route handlers (one file per feature)
├── services/         Business logic (notifications, voice, reminders)
└── scheduler/        APScheduler setup + reminder job functions
```

## Deployment (Fly.io)

```bash
fly secrets set SECRET_KEY=xxx
fly secrets set GROQ_API_KEY=xxx
fly secrets set VAPID_PRIVATE_KEY=xxx VAPID_PUBLIC_KEY=xxx VAPID_CLAIM_EMAIL=xxx
fly secrets set TELEGRAM_BOT_TOKEN=xxx
fly secrets set CORS_ORIGINS=https://your-app.netlify.app
fly deploy
```
