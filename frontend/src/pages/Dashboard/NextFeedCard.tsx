import { useState, useEffect } from 'react'
import { Milk, Plus } from 'lucide-react'

interface Props {
  lastFedAt?: Date
  intervalMinutes?: number
  onLogFeed: () => void
  canEdit?: boolean
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

export function NextFeedCard({ lastFedAt, intervalMinutes = 150, onLogFeed, canEdit = true }: Props) {
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

  const circumference = 2 * Math.PI * 52

  // colour: violet → fuchsia (overdue) or violet → violet (normal)
  const strokeColor = overdue ? '#f43f5e' : progress > 0.8 ? '#e879f9' : '#a855f7'
  const textColor = overdue ? 'text-rose-400' : progress > 0.8 ? 'text-fuchsia-400' : 'text-violet-300'

  return (
    <div className="glass-hero p-5 slide-up-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Next Feeding</p>
          {nextFeedAt ? (
            <p className={`text-sm font-medium mt-0.5 ${textColor}`}>
              {overdue ? '⚠️ Overdue!' : `at ${nextFeedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-0.5">Log first feed to start countdown</p>
          )}
        </div>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <Milk className="w-4 h-4 text-violet-400" />
        </div>
      </div>

      <div className="flex items-center gap-6 py-2">
        {/* Circular progress */}
        <div className="relative w-28 h-28 flex items-center justify-center shrink-0 rounded-full" style={{ background: 'rgba(124,58,237,0.06)' }}>
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" className="ring-track" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              strokeWidth="6" strokeLinecap="round"
              stroke={strokeColor}
              strokeDasharray={circumference}
              strokeDashoffset={nextFeedAt ? circumference * (1 - progress) : circumference}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <span className={`text-xl font-bold tabular-nums leading-none ${textColor}`}>
              {h}:{m}
            </span>
            <span className={`text-sm tabular-nums font-medium ${textColor}`}>{s}s</span>
            <span className="text-xs text-slate-600 mt-0.5">left</span>
          </div>
        </div>

        {/* Side stats */}
        <div className="flex flex-col gap-3 flex-1">
          <div>
            <p className="text-xs text-slate-500">Last fed</p>
            <p className="text-sm font-semibold text-slate-200">
              {lastFedAt ? lastFedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Interval</p>
            <p className="text-sm font-semibold text-slate-200">
              {(intervalMinutes / 60).toFixed(1)}h
            </p>
          </div>
          {canEdit && (
            <button
              onClick={onLogFeed}
              className="btn-glow flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold py-2.5 px-4 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Feed
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
