import { useState } from 'react'
import { X, Clock, Loader2 } from 'lucide-react'
import { nowForInput, localInputToUTC } from '@/utils/dates'
import { logsApi } from '@/api/logs'

interface Props {
  babyId: string
  onLogged: () => void
  onClose: () => void
}

const TYPES = [
  { value: 'feed', label: 'Feed' },
  { value: 'diaper_wet', label: 'Diaper (wet)' },
  { value: 'diaper_dirty', label: 'Diaper (dirty)' },
  { value: 'diaper_both', label: 'Diaper (both)' },
  { value: 'custom', label: 'Custom' },
]

export function LogPastEventModal({ babyId, onLogged, onClose }: Props) {
  const [type, setType] = useState('feed')
  const [when, setWhen] = useState(nowForInput())
  const [customLabel, setCustomLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (type === 'custom' && !customLabel.trim()) {
      setError('Please enter a label for the custom event')
      return
    }
    setSaving(true)
    setError('')
    try {
      const isDiaper = type.startsWith('diaper_')
      await logsApi.create({
        baby_id: babyId,
        type: isDiaper ? 'diaper' : type,
        timestamp: localInputToUTC(when),
        diaper_type: isDiaper ? type.replace('diaper_', '') : undefined,
        custom_label: type === 'custom' ? customLabel.trim() : undefined,
        notes: notes.trim() || undefined,
      })
      onLogged()
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0d0b18] border border-violet-500/20 rounded-3xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Log Past Event</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">What happened?</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  type === t.value ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'custom' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Label</label>
            <input
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="e.g. Tummy time"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        )}

        {/* Time picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">When did it happen?</label>
          <input
            type="datetime-local"
            value={when}
            onChange={e => setWhen(e.target.value)}
            max={nowForInput()}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Notes (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any extra details..."
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Entry
        </button>
      </div>
    </div>
  )
}
