# CryBaby — Baby Care Tracker

A mobile-first PWA for tracking feeding, diapers, sleep, expenses, and reminders — shared in real time across your whole household.

## Structure

```
CryBaby/
├── backend/           FastAPI + SQLAlchemy + APScheduler
├── frontend/          React + Vite + Tailwind CSS (PWA)
├── docker-compose.yml Local dev with Postgres
└── fly.toml           Fly.io backend deployment config
```

## Quick Start (Local Dev)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in at minimum SECRET_KEY
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:5173`

## Features

| Feature | Notes |
|---------|-------|
| Auth + OTP email verification | Gmail SMTP, optional |
| Household sharing | Invite code, multiple caregivers per baby |
| Read-only mode | Unverified/invited users get view-only access |
| Baby profile + avatar | Photo upload, age display |
| Activity logs | Feed, diaper, custom events, past event logging |
| Sleep tracker | Start/stop sessions, duration history |
| Weight tracking | Log from Dashboard, trend chart in Analytics |
| Smart reminders | Interval or time-of-day, push via APScheduler |
| Push notifications | Web Push via VAPID (installable PWA) |
| Telegram notifications | Bot alerts for all household members |
| Voice commands | Web Speech API + LLM intent extraction (Groq/Gemini) |
| Analytics | Feeding trend, diaper breakdown, sleep, expenses, weight |
| Expense tracking | Categories, monthly total, CSV export |
| Admin panel | Super-admin dashboard — households, users, system stats |
| PWA | Installable on iOS & Android, offline banner |
| Real-time updates | SSE activity feed across all household devices |

## Deploy

### Backend → Fly.io

```bash
fly auth login
fly apps create crybaby-api
fly volumes create crybaby_data --size 1
fly secrets set SECRET_KEY=$(openssl rand -hex 32)
fly secrets set GROQ_API_KEY=...           # or GEMINI_API_KEY
fly secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_CLAIM_EMAIL=...
fly secrets set TELEGRAM_BOT_TOKEN=...
fly secrets set CORS_ORIGINS=https://your-frontend.netlify.app
fly deploy
```

### Frontend → Netlify

Connect your GitHub repo in the Netlify dashboard — it auto-detects `netlify.toml`.

Set these environment variables in Netlify:
```
VITE_API_BASE_URL=https://crybaby-api.fly.dev
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### Generate VAPID keys (one-time)

```bash
cd backend && source .venv/bin/activate
python scripts/gen_vapid.py
```

## Cost

| Service | Cost |
|---------|------|
| Frontend (Netlify) | Free |
| Backend (Fly.io shared-cpu-1x) | Free |
| Database (SQLite on Fly volume) | Free |
| Voice AI (Groq — llama3) | Free |
| Voice AI (Gemini Flash) | Free |
| Push notifications (VAPID) | Free |
| Telegram notifications | Free |
| **Total** | **$0/month** |
