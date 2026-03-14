# CryBaby — Frontend

Mobile-first React PWA. Works as an installable app on iOS and Android.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev
```

## Environment Variables

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000    # backend URL
VITE_VAPID_PUBLIC_KEY=                     # from gen_vapid.py (Milestone 3)
```

## Available Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Production build (outputs to dist/) |
| `npm run preview` | Preview production build locally |

## PWA Install

In Chrome/Safari on mobile, tap **Share → Add to Home Screen** after visiting the deployed URL.
The app runs fullscreen with no browser chrome.

## Design System

- **Colors:** Indigo brand (`brand-500`) on Slate dark background
- **Cards:** Glassmorphism (`bg-white/5 backdrop-blur border-white/10`)
- **Motion:** Tailwind transitions + CSS keyframe animations
- **Icons:** Lucide React
- **Charts:** Recharts (Milestone 5)

## Deployment (Netlify)

```bash
npm run build
# Deploy dist/ to Netlify
# Set VITE_API_BASE_URL=https://your-backend.fly.dev in Netlify env vars
```
