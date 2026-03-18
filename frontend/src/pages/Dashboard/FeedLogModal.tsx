import { useState, useEffect, useRef } from 'react'
import { X, Milk, Timer, Droplets, Play, Square } from 'lucide-react'
import { nowForInput, localInputToUTC } from '@/utils/dates'
import { logsApi } from '@/api/logs'
import { toast } from '@/components/ui/Toast'

interface Props {
  babyId: string
  onLogged: () => void
  onClose: () => void
}

const FEED_TYPES = [
  { value: 'breast_left',   label: '🤱 Left',   short: 'L' },
  { value: 'breast_right',  label: '🤱 Right',  short: 'R' },
  { value: 'both_breasts',  label: '🤱 Both',   short: 'Both' },
  { value: 'bottle',        label: '🍼 Bottle', short: 'Bottle' },
]

const DURATION_PRESETS = [5, 10, 15, 20, 30]

export function FeedLogModal({ babyId, onLogged, onClose }: Props) {
  const [feedType, setFeedType] = useState('breast_left')
  const [duration, setDuration] = useState('')
  const [volumeMl, setVolumeMl] = useState('')
  const [when, setWhen] = useState(nowForInput())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Live timer
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSecs, setTimerSecs] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  function stopTimer() {
    setTimerRunning(false)
    const mins = Math.round(timerSecs / 60)
    if (mins > 0) setDuration(String(mins))
  }

  function formatTimer(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  async function handleSave() {
    setSaving(true)
    try {
      await logsApi.create({
        baby_id: babyId,
        type: 'feed',
        timestamp: localInputToUTC(when),
        feed_type: feedType,
        duration_minutes: duration ? parseInt(duration) : undefined,
        volume_ml: volumeMl ? parseFloat(volumeMl) : undefined,
        notes: notes.trim() || undefined,
      })
      toast('Feed logged!', 'success')
      onLogged()
      onClose()
    } catch {
      toast('Failed to save feed — please try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isBottle = feedType === 'bottle'
  const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 w-full'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md modal-surface rounded-3xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Milk className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-base font-bold text-white">Log Feed</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feed type */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium">Feed type</label>
          <div className="grid grid-cols-4 gap-2">
            {FEED_TYPES.map(t => (
              <button key={t.value} onClick={() => setFeedType(t.value)}
                className={`py-2 rounded-xl text-xs font-medium transition-all ${
                  feedType === t.value
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" /> Duration (minutes)
          </label>

          {/* Live timer */}
          <div className="flex items-center gap-2">
            <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
              timerRunning ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <span className={`text-sm font-mono font-semibold ${timerRunning ? 'text-violet-300' : 'text-slate-500'}`}>
                {formatTimer(timerSecs)}
              </span>
              {timerRunning ? (
                <button onClick={stopTimer}
                  className="flex items-center gap-1 text-xs text-violet-300 font-medium hover:text-violet-200">
                  <Square className="w-3 h-3" /> Stop
                </button>
              ) : (
                <button onClick={() => { setTimerSecs(0); setTimerRunning(true) }}
                  className="flex items-center gap-1 text-xs text-slate-400 font-medium hover:text-slate-200">
                  <Play className="w-3 h-3" /> Start
                </button>
              )}
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {DURATION_PRESETS.map(p => (
              <button key={p} onClick={() => setDuration(String(p))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  duration === String(p) ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}>
                {p}m
              </button>
            ))}
          </div>

          {/* Manual input */}
          <input type="number" min="1" max="120" placeholder="Or enter minutes manually"
            value={duration} onChange={e => setDuration(e.target.value)}
            className={inputCls} />
        </div>

        {/* Volume (bottle only) */}
        {isBottle && (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" /> Volume (ml)
            </label>
            <div className="flex gap-2">
              {[60, 90, 120, 150].map(v => (
                <button key={v} onClick={() => setVolumeMl(String(v))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    volumeMl === String(v) ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}>
                  {v}ml
                </button>
              ))}
            </div>
            <input type="number" min="1" placeholder="Or enter ml manually"
              value={volumeMl} onChange={e => setVolumeMl(e.target.value)}
              className={inputCls} />
          </div>
        )}

        {/* When */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">When</label>
          <input type="datetime-local" value={when} max={nowForInput()}
            onChange={e => setWhen(e.target.value)} className={inputCls} />
        </div>

        {/* Notes */}
        <input placeholder="Notes (optional)" value={notes}
          onChange={e => setNotes(e.target.value)} className={inputCls} />

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 btn-glow">
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Save Feed
        </button>
      </div>
      </div>
    </div>
  )
}
