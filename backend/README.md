# CryBaby — Backend

FastAPI backend with SQLAlchemy, APScheduler, and Web Push notifications.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

## Environment Variables

Only two are required to get started:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | No | Defaults to SQLite (no setup needed) |
| `SECRET_KEY` | **Yes (prod)** | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `LLM_API_KEY` | No | Only needed for voice commands (Milestone 4) |
| `VAPID_PRIVATE_KEY` | No | Only needed for push notifications (Milestone 3) |
| `VAPID_PUBLIC_KEY` | No | Generate with `python scripts/gen_vapid.py` |
| `CORS_ORIGINS` | No | Defaults to localhost:5173 |

> **For local dev you can run with zero configuration** — SQLite is used by default.

## Generate VAPID Keys (Milestone 3)

```bash
source .venv/bin/activate
python scripts/gen_vapid.py
```

## Database Migrations

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe change"
```

## Project Structure

```
app/
├── main.py           App factory, CORS, lifespan
├── config.py         Settings from environment
├── database.py       SQLAlchemy engine + session
├── dependencies.py   JWT auth dependency
├── models/           ORM models (one per table)
├── schemas/          Pydantic request/response models
├── routers/          Route handlers (one per feature)
├── services/         Business logic
└── scheduler/        APScheduler setup + job functions
```

## Deployment (Fly.io)

```bash
fly launch              # creates fly.toml
fly secrets set SECRET_KEY=xxx LLM_API_KEY=xxx ...
fly deploy
```
