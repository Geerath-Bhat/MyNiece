import { useState } from 'react'
import { X, Scale, Loader2 } from 'lucide-react'
import { babiesApi } from '@/api/babies'
import { format } from 'date-fns'

interface Props {
  babyId: string
  babyName: string
  onSaved: () => void
  onClose: () => void
}

export function WeightLogModal({ babyId, babyName, onSaved, onClose }: Props) {
  const [kg, setKg] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const val = parseFloat(kg)
    if (!kg || isNaN(val) || val <= 0) {
      setError('Enter a valid weight')
      return
    }
    setSaving(true)
    setError('')
    try {
      await babiesApi.addWeight(babyId, { date, weight_kg: val, note: note.trim() || undefined })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'bg-white/5 border border-violet-500/20 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 w-full'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0d0b18] border border-violet-500/20 rounded-3xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Weight</h2>
              <p className="text-xs text-slate-500">{babyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 4.2"
              value={kg}
              onChange={e => setKg(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setDate(e.target.value)}
              className={`${inputCls} w-36`}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Note (optional)</label>
          <input
            placeholder="e.g. After morning feed"
            value={note}
            onChange={e => setNote(e.target.value)}
            className={inputCls}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !kg}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 btn-glow"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Weight
        </button>
      </div>
    </div>
  )
}
