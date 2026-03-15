import { useState, useEffect } from 'react'
import { Bell, Milk, Baby, Pill, Dumbbell, Sparkles, Plus, Loader2, X, Pencil, Trash2 } from 'lucide-react'
import { remindersApi } from '@/api/reminders'
import type { Reminder } from '@/api/reminders'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; accent: string }> = {
  feeding:           { icon: Milk,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  accent: 'rgba(99,102,241,0.35)'  },
  diaper:            { icon: Baby,     color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    accent: 'rgba(6,182,212,0.35)'   },
  vitamin_d:         { icon: Pill,     color: 'text-amber-400',   bg: 'bg-amber-500/10',   accent: 'rgba(245,158,11,0.35)'  },
  massage:           { icon: Dumbbell, color: 'text-emerald-400', bg: 'bg-emerald-500/10', accent: 'rgba(16,185,129,0.35)'  },
  pre_feed_exercise: { icon: Dumbbell, color: 'text-violet-400',  bg: 'bg-violet-500/10',  accent: 'rgba(124,58,237,0.35)'  },
  custom:            { icon: Sparkles, color: 'text-pink-400',    bg: 'bg-pink-500/10',    accent: 'rgba(236,72,153,0.35)'  },
}

function formatDetail(r: Reminder): string {
  if (r.interval_minutes) {
    const h = r.interval_minutes / 60
    return `Every ${h % 1 === 0 ? h.toFixed(0) : h}h`
  }
  if (r.time_of_day) return `Daily at ${r.time_of_day.slice(0, 5)}`
  return '—'
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

interface ReminderModalProps {
  babyId: string
  existing?: Reminder          // if provided → edit mode
  onSaved: (r: Reminder) => void
  onClose: () => void
}

const SCHEDULE_TYPES = [
  { label: 'Every X hours', value: 'interval' },
  { label: 'Daily at fixed time', value: 'fixed' },
]

function ReminderModal({ babyId, existing, onSaved, onClose }: ReminderModalProps) {
  const isEdit = !!existing
  const [label, setLabel] = useState(existing?.label ?? '')
  const [type, setType] = useState(existing?.type ?? 'custom')
  const [scheduleType, setScheduleType] = useState<'interval' | 'fixed'>(
    existing?.time_of_day ? 'fixed' : 'interval'
  )
  const [hours, setHours] = useState(
    existing?.interval_minutes ? String(existing.interval_minutes / 60) : '2.5'
  )
  const [timeOfDay, setTimeOfDay] = useState(existing?.time_of_day ?? '09:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!label.trim()) { setError('Label is required'); return }
    setSaving(true)
    setError('')
    try {
      let result: Reminder
      if (isEdit && existing) {
        // Edit existing
        const patch: Partial<Reminder> = { label: label.trim(), type }
        if (scheduleType === 'interval') {
          const mins = Math.round(parseFloat(hours) * 60)
          if (!mins || mins < 1) { setError('Enter a valid interval'); setSaving(false); return }
          patch.interval_minutes = mins
          patch.time_of_day = undefined
        } else {
          patch.time_of_day = timeOfDay
          patch.interval_minutes = undefined
        }
        result = await remindersApi.patch(existing.id, patch)
      } else {
        // Create new
        const payload: Parameters<typeof remindersApi.create>[0] = {
          baby_id: babyId, type, label: label.trim(),
        }
        if (scheduleType === 'interval') {
          const mins = Math.round(parseFloat(hours) * 60)
          if (!mins || mins < 1) { setError('Enter a valid interval'); setSaving(false); return }
          payload.interval_minutes = mins
        } else {
          payload.time_of_day = timeOfDay
        }
        result = await remindersApi.create(payload)
      }
      onSaved(result)
      onClose()
    } catch {
      setError('Failed to save reminder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md modal-surface rounded-3xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Reminder' : 'New Reminder'}</h2>
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

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Category</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          >
            {Object.keys(TYPE_CFG).map(t => (
              <option key={t} value={t}>
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
                scheduleType === s.value ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
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
          {isEdit ? 'Save Changes' : 'Save Reminder'}
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null) // reminder id pending delete

  useEffect(() => {
    if (!baby) return
    remindersApi.list(baby.id).then(setReminders).finally(() => setLoading(false))
  }, [baby])

  async function toggle(r: Reminder) {
    const updated = await remindersApi.toggle(r.id, !r.is_enabled)
    setReminders(prev => prev.map(x => x.id === r.id ? updated : x))
  }

  async function handleDelete(id: string) {
    await remindersApi.delete(id)
    setReminders(prev => prev.filter(x => x.id !== id))
    setConfirmDelete(null)
  }

  function handleSaved(r: Reminder) {
    setReminders(prev => {
      const idx = prev.findIndex(x => x.id === r.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = r
        return next
      }
      return [r, ...prev]
    })
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
          {canEdit && (
            <button
              onClick={() => setShowAdd(true)}
              className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        {!canEdit && <ReadOnlyBanner />}

        <div className="flex flex-col gap-2 slide-up-1">
          {reminders.length === 0 && (
            <p className="text-center text-slate-600 text-sm py-10">No reminders yet.</p>
          )}
          {reminders.map(r => {
            const cfg = TYPE_CFG[r.type] ?? TYPE_CFG.custom
            const Icon = cfg.icon
            return (
              <div key={r.id} className="glass flex items-center gap-3 px-4 py-3.5 group"
                style={{ borderLeft: `3px solid ${cfg.accent}` }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{r.label}</p>
                  <p className="text-xs text-slate-500">{formatDetail(r)}</p>
                </div>
                {canEdit && (
                  <>
                    <button
                      onClick={() => { setConfirmDelete(null); setEditing(r) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-violet-400 transition-all"
                      title="Edit reminder"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(r.id)}
                      title="Delete reminder"
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {/* Toggle switch — read-only for unverified */}
                <button onClick={() => canEdit && toggle(r)} disabled={!canEdit}
                  className={`relative w-11 h-6 rounded-full overflow-hidden transition-colors shrink-0 ${r.is_enabled ? 'bg-indigo-500' : 'bg-slate-700'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${r.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="glass p-4 flex items-center gap-3 slide-up-2">
          <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-slate-400">Push notifications activate once you allow them in Settings.</p>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (() => {
        const r = reminders.find(x => x.id === confirmDelete)
        if (!r) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(null)}>
            <div className="w-full max-w-xs modal-surface rounded-3xl p-6 flex flex-col gap-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto"
                style={{ background: 'rgba(248,113,113,0.1)' }}>
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white mb-1">Delete reminder?</p>
                <p className="text-sm text-slate-400">
                  "<span className="text-slate-200">{r.label}</span>" will be permanently removed.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add modal */}
      {showAdd && baby && (
        <ReminderModal
          babyId={baby.id}
          onSaved={handleSaved}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit modal */}
      {editing && baby && (
        <ReminderModal
          babyId={baby.id}
          existing={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
