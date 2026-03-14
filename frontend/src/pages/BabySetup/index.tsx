import { useState } from 'react'
import { Baby } from 'lucide-react'
import { babiesApi } from '@/api/babies'
import { useAuthStore } from '@/store/authStore'

interface Props { onCreated: () => void }

export default function BabySetup({ onCreated }: Props) {
  const setActiveBabyId = useAuthStore(s => s.setActiveBabyId)
  const [form, setForm] = useState({ name: '', date_of_birth: '', gender: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    try {
      const baby = await babiesApi.create({
        name: form.name,
        date_of_birth: form.date_of_birth,
        gender: form.gender || undefined,
      })
      setActiveBabyId(baby.id)
      onCreated()
    } catch {
      setError('Failed to create baby profile')
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
          <h1 className="text-2xl font-bold gradient-text">Meet Your Baby</h1>
          <p className="text-slate-400 text-sm mt-1">Set up the baby profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong p-6 flex flex-col gap-4 slide-up-1">
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

          <button type="submit" disabled={loading}
            className="btn-glow mt-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Create Baby Profile
          </button>
        </form>
      </div>
    </div>
  )
}
