import { useState } from 'react'
import { Baby, Plus, ChevronDown } from 'lucide-react'
import { babiesApi } from '@/api/babies'
import type { Baby as BabyType } from '@/api/babies'
import { useAuthStore } from '@/store/authStore'

interface Props {
  onCreated: () => void
  existingBabies?: BabyType[]
}

function ageLabel(dob: string): string {
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months}mo old`
  const yrs = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${yrs}y ${rem}mo old` : `${yrs} yr old`
}

export default function BabySetup({ onCreated, existingBabies = [] }: Props) {
  const setActiveBabyId = useAuthStore(s => s.setActiveBabyId)
  const [showForm, setShowForm] = useState(existingBabies.length === 0)
  const [form, setForm] = useState({ name: '', date_of_birth: '', gender: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleSwitch(baby: BabyType) {
    setActiveBabyId(baby.id)
    onCreated()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const baby = await babiesApi.create({
        name: form.name,
        date_of_birth: form.date_of_birth,
        gender: form.gender || undefined,
      })
      setActiveBabyId(baby.id)
      onCreated()
    } catch {
      setError('Failed to create baby profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all'
  const labelClass = 'text-xs font-medium text-slate-400 uppercase tracking-wider'

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
      <div className="aurora-bg" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">

        <div className="text-center slide-up">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
            <Baby className="w-10 h-10 text-white" />
          </div>
          {existingBabies.length > 0 ? (
            <>
              <h1 className="text-2xl font-bold gradient-text">Switch Profile</h1>
              <p className="text-slate-400 text-sm mt-1">Choose a baby or add a new one</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold gradient-text">Meet Your Baby</h1>
              <p className="text-slate-400 text-sm mt-1">Set up the baby profile to get started</p>
            </>
          )}
        </div>

        {/* Existing baby cards */}
        {existingBabies.length > 0 && (
          <div className="flex flex-col gap-2 slide-up-1">
            {existingBabies.map(b => (
              <button key={b.id} onClick={() => handleSwitch(b)}
                className="glass-strong flex items-center gap-4 p-4 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-white/5 transition-all text-left w-full group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-2xl">👶</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold text-sm">{b.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{ageLabel(b.date_of_birth)}{b.gender ? ` · ${b.gender}` : ''}</p>
                </div>
                <span className="text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  Switch →
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Add new baby toggle / form */}
        {existingBabies.length > 0 && !showForm ? (
          <button onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/10 text-slate-500 hover:text-slate-300 hover:border-indigo-500/30 transition-all text-sm slide-up-2">
            <Plus className="w-4 h-4" />
            Add a new baby
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="glass-strong p-6 flex flex-col gap-4 slide-up-2">
            {existingBabies.length > 0 && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New baby profile</p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Baby's Name</label>
              <input className={inputClass} placeholder="e.g. Arya" required
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date of Birth</label>
              <input className={inputClass} type="date" required
                value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Gender (optional)</label>
              <div className="flex gap-2">
                {['male', 'female', 'other'].map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(f => ({ ...f, gender: f.gender === g ? '' : g }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                      form.gender === g ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400">{error}</div>}

            <div className="flex gap-2">
              {existingBabies.length > 0 && (
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={loading}
                className="btn-glow flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Create Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
