import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

type Mode = 'create' | 'join'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [mode, setMode] = useState<Mode>('create')
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    household_name: '',
    invite_code: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        email: form.email,
        password: form.password,
        display_name: form.display_name,
        timezone: form.timezone,
        ...(mode === 'create' ? { household_name: form.household_name } : { invite_code: form.invite_code }),
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

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-12">
      <div className="mb-6 text-center">
        <div className="text-5xl mb-2">👶</div>
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl bg-slate-800 p-1 mb-6">
        {(['create', 'join'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              mode === m ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white',
            ].join(' ')}
          >
            {m === 'create' ? 'New Household' : 'Join Household'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Your Name" value={form.display_name}
          onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} required />
        <Input label="Email" type="email" autoComplete="email" value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <Input label="Password" type="password" autoComplete="new-password" value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />

        {mode === 'create' ? (
          <Input label="Household Name (e.g. Smith Family)" value={form.household_name}
            onChange={(e) => setForm((f) => ({ ...f, household_name: e.target.value }))} required />
        ) : (
          <Input label="Invite Code" value={form.invite_code}
            onChange={(e) => setForm((f) => ({ ...f, invite_code: e.target.value }))} required />
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {mode === 'create' ? 'Create & Start' : 'Join Household'}
        </Button>
      </form>

      <p className="text-center text-slate-400 mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
