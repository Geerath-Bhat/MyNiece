import { useState, useEffect, useRef } from 'react'
import { Moon, Sun, Loader2, Trash2 } from 'lucide-react'
import { sleepApi } from '@/api/sleep'
import type { SleepSession } from '@/api/sleep'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { formatDistanceToNow, format } from 'date-fns'
import { parseUTC } from '@/utils/dates'

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const tick = () => {
      const diff = Date.now() - parseUTC(startedAt).getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setElapsed(`${h > 0 ? `${h}h ` : ''}${m}m ${s}s`)
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startedAt])

  return <span className="text-3xl font-bold tabular-nums gradient-text">{elapsed}</span>
}

export default function SleepPage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
  const [active, setActive] = useState<SleepSession | null>(null)
  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = async () => {
    if (!baby) return
    const [act, list] = await Promise.all([
      sleepApi.active(baby.id),
      sleepApi.list(baby.id, { limit: 14 }),
    ])
    setActive(act)
    setSessions(list.items)
    setLoading(false)
  }

  useEffect(() => { load() }, [baby])

  const handleStart = async () => {
    if (!baby || acting) return
    setActing(true)
    try {
      const session = await sleepApi.start({ baby_id: baby.id })
      setActive(session)
    } finally { setActing(false) }
  }

  const handleEnd = async () => {
    if (!active || acting) return
    setActing(true)
    try {
      const ended = await sleepApi.end(active.id)
      setActive(null)
      setSessions(prev => [ended, ...prev])
    } finally { setActing(false) }
  }

  const handleDelete = async (id: string) => {
    await sleepApi.delete(id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }


  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-white slide-up">Sleep Tracker</h1>

      {!canEdit && <ReadOnlyBanner />}

      {/* Active session card */}
      <div className={`glass-strong p-5 flex flex-col items-center gap-3 slide-up-1 ${active ? 'border-indigo-500/30' : ''}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${active ? 'bg-indigo-500/20' : 'bg-slate-700/40'}`}>
          {active ? <Moon className="w-8 h-8 text-indigo-400" /> : <Sun className="w-8 h-8 text-slate-500" />}
        </div>

        {active ? (
          <>
            <p className="text-xs text-slate-400">Baby is sleeping · started {formatDistanceToNow(parseUTC(active.started_at), { addSuffix: true })}</p>
            <ElapsedTimer startedAt={active.started_at} />
            {canEdit && (
              <button onClick={handleEnd} disabled={acting}
                className="btn-glow w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {acting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <Sun className="w-4 h-4" /> End Sleep
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400">No active sleep session</p>
            {canEdit && (
              <button onClick={handleStart} disabled={acting}
                className="btn-glow w-full py-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 border border-white/10 text-slate-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:border-indigo-500/40 transition-all"
              >
                {acting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <Moon className="w-4 h-4" /> Start Sleep
              </button>
            )}
          </>
        )}
      </div>

      {/* Session history */}
      <div className="flex flex-col gap-2 slide-up-3">
        {sessions.length === 0 ? (
          <div className="glass p-6 text-center text-slate-500 text-sm">No sleep sessions recorded yet</div>
        ) : sessions.map(s => (
          <div key={s.id} className="glass flex items-center gap-3 px-4 py-3 group">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.ended_at ? 'bg-indigo-500/10' : 'bg-amber-500/10'}`}>
              {s.ended_at ? <Moon className="w-4 h-4 text-indigo-400" /> : <Moon className="w-4 h-4 text-amber-400 animate-pulse" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">{formatDuration(s.duration_minutes)}</p>
              <p className="text-xs text-slate-500">
                {format(parseUTC(s.started_at), 'dd MMM, h:mm a')}
                {s.ended_at && ` → ${format(parseUTC(s.ended_at), 'h:mm a')}`}
              </p>
            </div>
            {s.quality && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.quality === 'good' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {s.quality}
              </span>
            )}
            {canEdit && (
              <button onClick={() => handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all ml-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
