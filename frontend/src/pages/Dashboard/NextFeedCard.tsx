import { useState, useEffect } from 'react'
import { Milk, Plus, Clock, AlertTriangle } from 'lucide-react'

interface Props {
  lastFedAt?: Date
  intervalMinutes?: number
  onLogFeed: () => void
  canEdit?: boolean
  lastFeedType?: string
  lastFeedDuration?: number
}

const FEED_TYPE_LABELS: Record<string, string> = {
  breast_left: '🤱 Left', breast_right: '🤱 Right',
  both_breasts: '🤱 Both', bottle: '🍼 Bottle',
}

function pad(n: number) { return String(n).padStart(2, '0') }

function formatCountdown(msLeft: number) {
  if (msLeft <= 0) return { h: '00', m: '00', s: '00', overdue: true }
  const total = Math.floor(msLeft / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return { h: pad(h), m: pad(m), s: pad(s), overdue: false }
}

export function NextFeedCard({ lastFedAt, intervalMinutes = 150, onLogFeed, canEdit = true, lastFeedType, lastFeedDuration }: Props) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const nextFeedAt = lastFedAt
    ? new Date(lastFedAt.getTime() + intervalMinutes * 60_000)
    : null

  const msLeft = nextFeedAt ? nextFeedAt.getTime() - Date.now() : null
  const { h, m, s, overdue } = msLeft !== null
    ? formatCountdown(msLeft)
    : { h: '--', m: '--', s: '--', overdue: false }

  const progress = msLeft !== null
    ? Math.max(0, Math.min(1, 1 - msLeft / (intervalMinutes * 60_000)))
    : 0

  const circumference = 2 * Math.PI * 44
  const isWarning = !overdue && progress > 0.8
  const strokeColor = overdue ? '#f43f5e' : isWarning ? '#e879f9' : '#a855f7'
  const ringBg = overdue ? 'rgba(244,63,94,0.12)' : 'rgba(124,58,237,0.12)'

  // ── No feed logged yet ───────────────────────────────────────
  if (!lastFedAt) {
    return (
      <div className="glass-hero p-5 slide-up-1 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center">
            <Milk className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Next Feeding</p>
            <p className="text-xs text-slate-500">No feed logged yet today</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={onLogFeed}
            className="btn-glow w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Log First Feed
          </button>
        )}
      </div>
    )
  }

  // ── Overdue state ─────────────────────────────────────────────
  if (overdue) {
    return (
      <div className="slide-up-1 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(244,63,94,0.18) 0%, rgba(244,63,94,0.08) 100%)',
          border: '1.5px solid rgba(244,63,94,0.45)',
          boxShadow: '0 0 32px rgba(244,63,94,0.15)',
        }}>
        {/* Pulsing glow */}
        <div className="absolute inset-0 rounded-3xl animate-pulse pointer-events-none"
          style={{ background: 'rgba(244,63,94,0.04)' }} />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-300">Feed overdue!</p>
            <p className="text-xs text-slate-400">
              Last fed at {lastFedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {lastFeedType && ` · ${FEED_TYPE_LABELS[lastFeedType] ?? lastFeedType}`}
            </p>
          </div>
          {/* Overrun time */}
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums text-rose-400">{m}:{s}</p>
            <p className="text-[10px] text-rose-500/70">overdue</p>
          </div>
        </div>

        {/* Info strip */}
        <div className="relative flex gap-3">
          <div className="flex-1 rounded-xl px-3 py-2.5 text-center bg-white/10">
            <p className="text-[10px] text-slate-500 mb-0.5">Interval</p>
            <p className="text-sm font-bold text-slate-200">{(intervalMinutes / 60).toFixed(1)}h</p>
          </div>
          {lastFeedDuration && (
            <div className="flex-1 rounded-xl px-3 py-2.5 text-center bg-white/10">
              <p className="text-[10px] text-slate-500 mb-0.5">Last duration</p>
              <p className="text-sm font-bold text-slate-200">{lastFeedDuration}m</p>
            </div>
          )}
        </div>

        {canEdit && (
          <button onClick={onLogFeed}
            className="relative w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 4px 20px rgba(244,63,94,0.4)' }}>
            <Milk className="w-4 h-4" /> Log Feed Now
          </button>
        )}
      </div>
    )
  }

  // ── Normal countdown ──────────────────────────────────────────
  return (
    <div className="glass-hero p-5 slide-up-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 font-medium">Next Feeding</p>
          <p className={`text-sm font-semibold mt-0.5 ${isWarning ? 'text-fuchsia-300' : 'text-violet-300'}`}>
            at {nextFeedAt!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFeedType && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
              {FEED_TYPE_LABELS[lastFeedType] ?? lastFeedType}
            </span>
          )}
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
            <Milk className="w-4 h-4 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Main layout: ring + details */}
      <div className="flex items-center gap-5">
        {/* Ring timer */}
        <div className="relative shrink-0 flex items-center justify-center"
          style={{ width: 100, height: 100, background: ringBg, borderRadius: '50%' }}>
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" className="ring-track" strokeWidth="5" />
            <circle cx="50" cy="50" r="44" fill="none" strokeWidth="5" strokeLinecap="round"
              stroke={strokeColor}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
          </svg>
          <div className="z-10 flex flex-col items-center">
            <span className={`text-lg font-bold tabular-nums leading-tight ${isWarning ? 'text-fuchsia-300' : 'text-violet-200'}`}>
              {h}:{m}
            </span>
            <span className={`text-sm tabular-nums font-semibold leading-tight ${isWarning ? 'text-fuchsia-400' : 'text-violet-300'}`}>
              {s}s
            </span>
            <span className="text-[10px] text-slate-600 mt-0.5">left</span>
          </div>
        </div>

        {/* Details column */}
        <div className="flex-1 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              <Clock className="w-3 h-3 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Last fed</p>
              <p className="text-sm font-semibold text-slate-200">
                {lastFedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex gap-2">
            <div className="flex-1 rounded-xl px-2.5 py-2 text-center bg-white/10">
              <p className="text-[10px] text-slate-500">Interval</p>
              <p className="text-xs font-bold text-slate-200">{(intervalMinutes / 60).toFixed(1)}h</p>
            </div>
            {lastFeedDuration && (
              <div className="flex-1 rounded-xl px-2.5 py-2 text-center bg-white/10">
                <p className="text-[10px] text-slate-500">Duration</p>
                <p className="text-xs font-bold text-slate-200">{lastFeedDuration}m</p>
              </div>
            )}
          </div>

          {canEdit && (
            <button onClick={onLogFeed}
              className="btn-glow w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Log Feed
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
