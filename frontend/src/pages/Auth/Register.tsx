import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

type Mode = 'create' | 'join'

const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 placeholder:text-slate-600 transition-all'
const labelClass = 'text-xs font-medium text-slate-400 uppercase tracking-wider'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [mode, setMode] = useState<Mode>('create')
  const [form, setForm] = useState({
    email: '', password: '', confirm_password: '', display_name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    household_name: '', invite_code: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const payload = {
        email: form.email, password: form.password,
        display_name: form.display_name, timezone: form.timezone,
        ...(mode === 'create' ? { household_name: form.household_name } : { invite_code: form.invite_code.trim().toLowerCase() }),
      }
      const data = await authApi.register(payload)
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, opts?: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      <input
        className={inputClass}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...opts}
      />
    </div>
  )

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="aurora-bg" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-5">
        {/* Logo */}
        <div className="text-center slide-up">
          <div className="text-5xl mb-2">👶</div>
          <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
        </div>

        {/* Mode toggle */}
        <div className="glass flex p-1 rounded-2xl slide-up-1">
          {(['create', 'join'] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
              {m === 'create' ? 'New Household' : 'Join Household'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-strong p-6 flex flex-col gap-4 slide-up-2">
          {field('Your Name', 'display_name', { placeholder: 'Parent name', required: true })}
          {field('Email', 'email', { type: 'email', autoComplete: 'email', placeholder: 'you@example.com', required: true })}
          {field('Password', 'password', { type: 'password', autoComplete: 'new-password', placeholder: '••••••••', required: true })}
          {field('Confirm Password', 'confirm_password', { type: 'password', autoComplete: 'new-password', placeholder: '••••••••', required: true })}

          {mode === 'create'
            ? field('Household Name', 'household_name', { placeholder: 'e.g. Smith Family', required: true })
            : field('Invite Code', 'invite_code', { placeholder: '8-character code', required: true })
          }

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="btn-glow mt-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {mode === 'create' ? 'Create & Start' : 'Join Household'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm slide-up-3">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
