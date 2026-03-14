# CryBaby — Frontend

Mobile-first React PWA. Installable on iOS and Android via "Add to Home Screen".

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL and VITE_VAPID_PUBLIC_KEY
npm run dev
```

## Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:8000       # backend URL
VITE_VAPID_PUBLIC_KEY=                        # from backend scripts/gen_vapid.py
```

## Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server at localhost:5173 |
| `npm run build` | Production build → dist/ |
| `npm run preview` | Preview production build locally |

## Stack

- **React 18** + TypeScript
- **Vite** + VitePWA (service worker, push notifications)
- **Tailwind CSS** — dark violet/fuchsia theme, glassmorphism cards
- **Recharts** — analytics charts with gradient fills
- **Zustand** — auth + active baby state
- **Lucide React** — icons
- **date-fns** — date formatting

## Key Features

- **Dashboard** — hero banner, baby avatar, today's stats, quick-log grid, upcoming reminders
- **Voice commands** — Web Speech API → LLM intent extraction → auto-log
- **Analytics** — feeding trend (area chart), diaper breakdown, sleep hours, expense pie, weight trend
- **Push notifications** — Web Push via VAPID, enabled in Settings
- **Telegram** — per-user chat ID, step-by-step setup guide in Settings
- **Real-time** — SSE event bus refreshes activity feed across devices
- **PWA** — installable, offline banner, custom service worker

## Deployment (Netlify)

Connect GitHub repo — Netlify auto-detects `netlify.toml`.

Set in Netlify dashboard → Environment variables:
```
VITE_API_BASE_URL=https://your-backend.fly.dev
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```
