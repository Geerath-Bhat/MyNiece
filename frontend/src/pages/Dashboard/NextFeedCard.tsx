import { useState, useEffect } from 'react'
import { Milk, Plus } from 'lucide-react'

interface Props {
  lastFedAt?: Date
  intervalMinutes?: number
  onLogFeed: () => void
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

export function NextFeedCard({ lastFedAt, intervalMinutes = 150, onLogFeed }: Props) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const nextFeedAt = lastFedAt
    ? new Date(lastFedAt.getTime() + intervalMinutes * 60_000)
    : null

  const msLeft = nextFeedAt ? nextFeedAt.getTime() - Date.now() : null
  const { h, m, s, overdue } = msLeft !== null ? formatCountdown(msLeft) : { h: '--', m: '--', s: '--', overdue: false }

  const progress = msLeft !== null
    ? Math.max(0, Math.min(1, 1 - msLeft / (intervalMinutes * 60_000)))
    : 0

  // Colour shifts from green → amber → red as time passes
  const ringColor = overdue
    ? 'stroke-red-400'
    : progress > 0.8
    ? 'stroke-amber-400'
    : 'stroke-indigo-400'

  const textColor = overdue ? 'text-red-400' : progress > 0.8 ? 'text-amber-400' : 'text-indigo-400'

  const circumference = 2 * Math.PI * 54   // r=54
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="glass-strong p-5 slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Next Feeding</p>
          {nextFeedAt ? (
            <p className="text-sm text-slate-300 mt-0.5">
              {overdue ? 'Overdue!' : `at ${nextFeedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-0.5">Log first feed to start</p>
          )}
        </div>
        <Milk className="w-5 h-5 text-indigo-400" />
      </div>

      {/* Circular progress + countdown */}
      <div className="flex items-center justify-center gap-8 py-2">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 128 128">
            {/* Track */}
            <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            {/* Progress arc */}
            <circle
              cx="64" cy="64" r="54" fill="none"
              strokeWidth="6" strokeLinecap="round"
              className={`transition-all duration-1000 ${ringColor}`}
              strokeDasharray={circumference}
              strokeDashoffset={nextFeedAt ? dashOffset : circumference}
            />
          </svg>
          {/* Countdown digits */}
          <div className="flex flex-col items-center z-10">
            <span className={`text-2xl font-bold tabular-nums leading-none ${textColor}`}>
              {h}:{m}
            </span>
            <span className={`text-sm font-medium tabular-nums ${textColor}`}>{s}s</span>
            <span className="text-xs text-slate-500 mt-0.5">remaining</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-slate-500">Last fed</p>
            <p className="text-sm font-medium text-slate-200">
              {lastFedAt
                ? lastFedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Interval</p>
            <p className="text-sm font-medium text-slate-200">{intervalMinutes / 60}h</p>
          </div>
        </div>
      </div>

      {/* Log button */}
      <button
        onClick={onLogFeed}
        className="btn-glow mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-2xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Log Feed Now
      </button>
    </div>
  )
}
