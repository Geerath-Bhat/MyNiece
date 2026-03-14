import { useState, useEffect } from 'react'
import { Bell, Milk, Baby, Pill, Dumbbell, Sparkles, Plus, ChevronRight, Loader2, X } from 'lucide-react'
import { remindersApi } from '@/api/reminders'
import type { Reminder } from '@/api/reminders'
import { useBaby } from '@/hooks/useBaby'

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  feeding:           { icon: Milk,     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  diaper:            { icon: Baby,     color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  vitamin_d:         { icon: Pill,     color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  massage:           { icon: Dumbbell, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  pre_feed_exercise: { icon: Dumbbell, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  custom:            { icon: Sparkles, color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
}

function formatDetail(r: Reminder): string {
  if (r.interval_minutes) {
    const h = r.interval_minutes / 60
    return `Every ${h % 1 === 0 ? h + 'h' : r.interval_minutes + 'min'}`
  }
  if (r.time_of_day) return `Daily at ${r.time_of_day}`
  return '—'
}

// ── Add Reminder Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  babyId: string
  onCreated: (r: Reminder) => void
  onClose: () => void
}

const SCHEDULE_TYPES = [
  { label: 'Every X hours', value: 'interval' },
  { label: 'Daily at fixed time', value: 'fixed' },
]

function AddReminderModal({ babyId, onCreated, onClose }: AddModalProps) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState('custom')
  const [scheduleType, setScheduleType] = useState<'interval' | 'fixed'>('interval')
  const [hours, setHours] = useState('2.5')
  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!label.trim()) { setError('Label is required'); return }
    setSaving(true)
    setError('')
    try {
      const payload: Parameters<typeof remindersApi.create>[0] = {
        baby_id: babyId,
        type,
        label: label.trim(),
      }
      if (scheduleType === 'interval') {
        const mins = Math.round(parseFloat(hours) * 60)
        if (!mins || mins < 1) { setError('Enter a valid interval'); setSaving(false); return }
        payload.interval_minutes = mins
      } else {
        payload.time_of_day = timeOfDay
      }
      const created = await remindersApi.create(payload)
      onCreated(created)
      onClose()
    } catch {
      setError('Failed to create reminder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-t-3xl p-6 flex flex-col gap-4 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">New Reminder</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Label</label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Vitamin D drops"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Category</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          >
            {Object.keys(TYPE_CFG).map(t => (
              <option key={t} value={t} className="bg-slate-900">
                {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule type toggle */}
        <div className="flex gap-2">
          {SCHEDULE_TYPES.map(s => (
            <button
              key={s.value}
              onClick={() => setScheduleType(s.value as 'interval' | 'fixed')}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                scheduleType === s.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Schedule input */}
        {scheduleType === 'interval' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Repeat every (hours)</label>
            <input
              type="number"
              value={hours}
              onChange={e => setHours(e.target.value)}
              min="0.25"
              step="0.25"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Time of day</label>
            <input
              type="time"
              value={timeOfDay}
              onChange={e => setTimeOfDay(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Reminder
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { baby } = useBaby()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!baby) return
    remindersApi.list(baby.id).then(setReminders).finally(() => setLoading(false))
  }, [baby])

  async function toggle(r: Reminder) {
    const updated = await remindersApi.toggle(r.id, !r.is_enabled)
    setReminders(prev => prev.map(x => x.id === r.id ? updated : x))
  }

  if (loading) return (
    <div className="flex justify-center mt-20">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between slide-up">
          <h1 className="text-xl font-bold text-white">Reminders</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        <div className="flex flex-col gap-2 slide-up-1">
          {reminders.length === 0 && (
            <p className="text-center text-slate-600 text-sm py-10">No reminders yet — tap Add to create one.</p>
          )}
          {reminders.map(r => {
            const cfg = TYPE_CFG[r.type] ?? TYPE_CFG.custom
            const Icon = cfg.icon
            return (
              <div key={r.id} className="glass flex items-center gap-3 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{r.label}</p>
                  <p className="text-xs text-slate-500">{formatDetail(r)}</p>
                </div>
                <button onClick={() => toggle(r)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${r.is_enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${r.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
            )
          })}
        </div>

        <div className="glass p-4 flex items-center gap-3 slide-up-2">
          <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-slate-400">Push notifications activate once you allow them in Settings.</p>
        </div>
      </div>

      {showAdd && baby && (
        <AddReminderModal
          babyId={baby.id}
          onCreated={r => setReminders(prev => [r, ...prev])}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}
