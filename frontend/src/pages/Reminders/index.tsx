import { useState, useEffect } from 'react'
import { Bell, Milk, Baby, Pill, Dumbbell, Sparkles, Plus, Loader2, X, Pencil, Trash2, Volume2, AlertTriangle, BellOff, BellRing } from 'lucide-react'
import { playReminderAlarm } from '@/utils/alarm'
import { remindersApi } from '@/api/reminders'
import type { Reminder } from '@/api/reminders'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; accent: string }> = {
  feeding:           { icon: Milk,     color: 'text-violet-400',  bg: 'bg-violet-500/10',  accent: 'rgba(124,58,237,0.4)'  },
  diaper:            { icon: Baby,     color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    accent: 'rgba(6,182,212,0.4)'   },
  vitamin_d:         { icon: Pill,     color: 'text-amber-400',   bg: 'bg-amber-500/10',   accent: 'rgba(245,158,11,0.4)'  },
  massage:           { icon: Dumbbell, color: 'text-emerald-400', bg: 'bg-emerald-500/10', accent: 'rgba(16,185,129,0.4)'  },
  pre_feed_exercise: { icon: Dumbbell, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', accent: 'rgba(217,70,239,0.4)'  },
  custom:            { icon: Sparkles, color: 'text-pink-400',    bg: 'bg-pink-500/10',    accent: 'rgba(236,72,153,0.4)'  },
}

function formatDetail(r: Reminder): string {
  if (r.interval_minutes) {
    const m = r.interval_minutes
    if (m < 60) return `Every ${m}m`
    const h = Math.floor(m / 60)
    const rem = m % 60
    return rem === 0 ? `Every ${h}h` : `Every ${h}h ${rem}m`
  }
  if (r.time_of_day) return `Daily at ${r.time_of_day.slice(0, 5)}`
  return '—'
}

function nextFiresAt(r: Reminder): string | null {
  if (r.time_of_day) {
    const [h, m] = r.time_of_day.split(':').map(Number)
    const now = new Date()
    const fire = new Date()
    fire.setHours(h, m, 0, 0)
    if (fire <= now) fire.setDate(fire.getDate() + 1)
    return `Next at ${fire.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  if (r.interval_minutes) {
    const fire = new Date(Date.now() + r.interval_minutes * 60_000)
    return `Next ~${fire.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return null
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

interface ReminderModalProps {
  babyId: string
  existing?: Reminder
  existingLabels?: string[]
  onSaved: (r: Reminder) => void
  onClose: () => void
}

const SCHEDULE_TYPES = [
  { label: 'Every X hours', value: 'interval' },
  { label: 'Daily at fixed time', value: 'fixed' },
]

function ReminderModal({ babyId, existing, existingLabels = [], onSaved, onClose }: ReminderModalProps) {
  const isEdit = !!existing
  const [label, setLabel] = useState(existing?.label ?? '')
  const [type, setType] = useState(existing?.type ?? 'custom')
  const [scheduleType, setScheduleType] = useState<'interval' | 'fixed'>(
    existing?.time_of_day ? 'fixed' : 'interval'
  )
  const [intervalUnit, setIntervalUnit] = useState<'hours' | 'minutes'>(
    existing?.interval_minutes && existing.interval_minutes < 60 ? 'minutes' : 'hours'
  )
  const [hours, setHours] = useState(
    existing?.interval_minutes
      ? existing.interval_minutes < 60
        ? String(existing.interval_minutes)
        : String(existing.interval_minutes / 60)
      : '2.5'
  )
  const [timeOfDay, setTimeOfDay] = useState(existing?.time_of_day ?? '09:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!label.trim()) { setError('Label is required'); return }
    if (!isEdit && existingLabels.some(l => l.toLowerCase() === label.trim().toLowerCase())) {
      setError('A reminder with this label already exists')
      return
    }
    setSaving(true)
    setError('')
    try {
      let result: Reminder
      const calcMins = () => {
        const val = parseFloat(hours)
        return intervalUnit === 'minutes' ? Math.round(val) : Math.round(val * 60)
      }

      if (isEdit && existing) {
        const patch: Record<string, unknown> = { label: label.trim(), type }
        if (scheduleType === 'interval') {
          const mins = calcMins()
          if (!mins || mins < 1) { setError('Enter a valid interval'); setSaving(false); return }
          patch.interval_minutes = mins
          patch.time_of_day = null
        } else {
          patch.time_of_day = timeOfDay
          patch.interval_minutes = null
        }
        result = await remindersApi.patch(existing.id, patch as Partial<Reminder>)
      } else {
        const payload: Parameters<typeof remindersApi.create>[0] = {
          baby_id: babyId, type, label: label.trim(),
        }
        if (scheduleType === 'interval') {
          const mins = calcMins()
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="w-full max-w-md modal-surface rounded-3xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Reminder' : 'New Reminder'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{isEdit ? 'Update the schedule or label' : 'Set up a recurring alert'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Label</label>
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
          <label className="text-xs text-slate-400 font-medium">Category</label>
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
            <label className="text-xs text-slate-400 font-medium">Repeat every</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={hours}
                onChange={e => setHours(e.target.value)}
                min="1"
                step={intervalUnit === 'minutes' ? '1' : '0.25'}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
              <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs font-medium shrink-0">
                {(['hours', 'minutes'] as const).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => { setIntervalUnit(u); setHours(u === 'minutes' ? '30' : '2.5') }}
                    className={`px-3 py-2.5 transition-colors ${intervalUnit === u ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}
                  >
                    {u === 'hours' ? 'hrs' : 'min'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Time of day</label>
            <input
              type="time"
              value={timeOfDay}
              onChange={e => setTimeOfDay(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Reminder'}
        </button>
      </div>
      </div>
    </div>
  )
}

// ── Reminder Card ─────────────────────────────────────────────────────────────

function ReminderCard({ r, canEdit, onToggle, onEdit, onDelete }: {
  r: Reminder
  canEdit: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = TYPE_CFG[r.type] ?? TYPE_CFG.custom
  const Icon = cfg.icon
  const nextFire = nextFiresAt(r)

  return (
    <div
      className="card-surface flex items-center gap-3 px-3.5 py-3 transition-all"
      style={{
        borderLeft: `3px solid ${r.is_enabled ? cfg.accent : 'rgba(124,58,237,0.15)'}`,
        opacity: r.is_enabled ? 1 : 0.55,
      }}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{r.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">{formatDetail(r)}</span>
          {r.is_enabled && nextFire && (
            <>
              <span className="text-slate-700 text-xs">·</span>
              <span className="text-[11px] text-slate-600">{nextFire}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <>
          <button onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* Toggle */}
      <button
        onClick={() => canEdit && onToggle()}
        disabled={!canEdit}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${r.is_enabled ? 'bg-indigo-500' : 'bg-slate-700'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${r.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}>
      <div className="w-full max-w-xs modal-surface rounded-3xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto bg-red-500/10">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white mb-1">Delete reminder?</p>
          <p className="text-sm text-slate-400">
            "<span className="text-slate-200">{label}</span>" will be permanently removed.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!baby) return
    remindersApi.list(baby.id).then(setReminders).finally(() => setLoading(false))
  }, [baby])

  async function toggle(r: Reminder) {
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, is_enabled: !r.is_enabled } : x))
    try {
      const updated = await remindersApi.toggle(r.id, !r.is_enabled)
      setReminders(prev => prev.map(x => x.id === r.id ? updated : x))
    } catch {
      setReminders(prev => prev.map(x => x.id === r.id ? { ...x, is_enabled: r.is_enabled } : x))
    }
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

  const active = reminders.filter(r => r.is_enabled)
  const inactive = reminders.filter(r => !r.is_enabled)

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between slide-up">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white">Reminders</h1>
            {reminders.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-indigo-400"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                {active.length} active
              </span>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(124,58,237,0.8))', border: '1px solid rgba(167,139,250,0.3)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        {!canEdit && <ReadOnlyBanner />}

        {/* Empty state */}
        {reminders.length === 0 && (
          <div className="glass p-10 flex flex-col items-center gap-3 slide-up-1">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
              <Bell className="w-7 h-7 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">No reminders yet</p>
              <p className="text-xs text-slate-600 mt-1">Add one to get notified for feeds, meds, and more</p>
            </div>
            {canEdit && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-1 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-300 transition-colors"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                + Create first reminder
              </button>
            )}
          </div>
        )}

        {/* Active reminders */}
        {active.length > 0 && (
          <div className="flex flex-col gap-2 slide-up-1">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <BellRing className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-slate-400">Active</p>
            </div>
            {active.map(r => (
              <ReminderCard
                key={r.id}
                r={r}
                canEdit={canEdit}
                onToggle={() => toggle(r)}
                onEdit={() => { setConfirmDelete(null); setEditing(r) }}
                onDelete={() => setConfirmDelete(r.id)}
              />
            ))}
          </div>
        )}

        {/* Inactive reminders */}
        {inactive.length > 0 && (
          <div className="flex flex-col gap-2 slide-up-2">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <BellOff className="w-3 h-3 text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500">Paused</p>
            </div>
            {inactive.map(r => (
              <ReminderCard
                key={r.id}
                r={r}
                canEdit={canEdit}
                onToggle={() => toggle(r)}
                onEdit={() => { setConfirmDelete(null); setEditing(r) }}
                onDelete={() => setConfirmDelete(r.id)}
              />
            ))}
          </div>
        )}

        {/* Notification tip */}
        <div className="rounded-2xl p-4 flex items-start gap-3 slide-up-3"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-300 mb-0.5">Push notifications</p>
            <p className="text-xs text-slate-500">Allow notifications in your browser settings to receive alerts even when the app is in the background.</p>
          </div>
          <button
            onClick={() => playReminderAlarm('feeding')}
            title="Test alarm sound"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:text-indigo-300 shrink-0 transition-colors"
            style={{ background: 'rgba(99,102,241,0.1)' }}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Test
          </button>
        </div>

      </div>

      {/* Delete confirmation */}
      {confirmDelete && (() => {
        const r = reminders.find(x => x.id === confirmDelete)
        if (!r) return null
        return (
          <DeleteModal
            label={r.label}
            onConfirm={() => handleDelete(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )
      })()}

      {/* Add modal */}
      {showAdd && baby && (
        <ReminderModal
          babyId={baby.id}
          existingLabels={reminders.map(r => r.label)}
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
