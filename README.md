# CryBaby — Baby Care Tracker

A mobile-first PWA for tracking feeding, diapers, and reminders — shared across 3–4 caregivers in real time.

## Structure

```
CryBaby/
├── backend/     FastAPI + SQLAlchemy + APScheduler
├── frontend/    React + Vite + Tailwind (PWA)
├── fly.toml     Fly.io backend deployment
└── docker-compose.yml   Local dev with Postgres
```

## Quick Start (Local Dev)

### Option A — SQLite (simplest, no Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # only SECRET_KEY required
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### Option B — Docker Compose (Postgres)

```bash
docker-compose up --build
cd frontend && npm install && npm run dev
```

## Deploy

### Backend → Fly.io (free tier, always-on)

```bash
# Install flyctl: https://fly.io/docs/flyctl/install/
fly auth login
fly apps create crybaby-api
fly volumes create crybaby_data --size 1 --region sin
fly secrets set SECRET_KEY=$(openssl rand -hex 32)
# Optional:
fly secrets set LLM_API_KEY=sk-ant-...
fly secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_CLAIMS_EMAIL=you@email.com
fly deploy
```

Set `VITE_API_URL=https://crybaby-api.fly.dev` in your Netlify env vars.

### Frontend → Netlify

```bash
cd frontend
# Set env var in Netlify dashboard:
#   VITE_API_URL = https://crybaby-api.fly.dev
npm run build    # or let Netlify auto-build from git
```

Netlify auto-detects `netlify.toml` for build settings and SPA redirects.

### VAPID keys (one-time setup)

```bash
cd backend
python scripts/gen_vapid.py
# Copy the output keys into fly secrets or your .env
```

## Features

| Feature | Status |
|---------|--------|
| Auth + household sharing | ✅ |
| Baby profile + weight tracking | ✅ |
| Activity logs (feed, diaper, custom) | ✅ |
| Smart reminders + push notifications | ✅ |
| Voice commands (Web Speech + Claude Haiku) | ✅ |
| Analytics charts (feeding, diapers) | ✅ |
| Expense tracking + CSV export | ✅ |
| PWA — installable, offline banner | ✅ |
| Glassmorphism / aurora design | ✅ |

## Cost

| Service | Cost |
|---------|------|
| Frontend (Netlify) | Free |
| Backend (Fly.io shared-cpu-1x) | Free |
| Database (SQLite on Fly volume) | Free |
| Voice AI (Claude Haiku) | ~$0.07/month for 20 commands/day |
| Push notifications (VAPID) | Free |
| **Total** | **~$0/month** |
