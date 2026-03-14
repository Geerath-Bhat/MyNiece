# 👶 CryBaby — Baby Care Tracker

A mobile-first PWA for tracking feeding, diapers, and reminders — shared across 3–4 caregivers in real time.

## Structure

```
CryBaby/
├── backend/     FastAPI + SQLAlchemy + APScheduler
├── frontend/    React + Vite + Tailwind (PWA)
└── docker-compose.yml   Local dev with Postgres
```

## Quick Start (Local Dev)

### Option A — SQLite (simplest, no Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit if needed
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

## Milestones

| # | Feature | Status |
|---|---------|--------|
| 1 | Scaffold, auth, household | ✅ Done |
| 2 | Baby profile, activity logs, reminders, APScheduler | 🔨 Next |
| 3 | Push notifications (VAPID + service worker) | ⏳ |
| 4 | Voice commands (Web Speech API + Claude Haiku) | ⏳ |
| 5 | Analytics charts + expense tracking | ⏳ |
| 6 | PWA polish, offline queue, dark mode | ⏳ |
| 7 | Deploy (Fly.io + Netlify) | ⏳ |

## Cost

| Service | Cost |
|---------|------|
| Frontend (Netlify) | Free |
| Backend (Fly.io) | Free |
| Database (Render PostgreSQL) | Free |
| Voice AI (Claude Haiku) | ~$0.07/month for 20 commands/day |
| Push notifications | Free (Web Push / VAPID) |
| **Total** | **~$0/month** |
