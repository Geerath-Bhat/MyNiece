import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(form)
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
      {/* Aurora */}
      <div className="aurora-bg" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        {/* Logo */}
        <div className="text-center slide-up">
          <div className="text-6xl mb-3">👶</div>
          <h1 className="text-3xl font-bold gradient-text">CryBaby</h1>
          <p className="text-slate-400 mt-1 text-sm">Baby care, simplified</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass-strong p-6 flex flex-col gap-4 slide-up-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
            <input
              type="email" autoComplete="email" required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 placeholder:text-slate-600 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
            <input
              type="password" autoComplete="current-password" required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 placeholder:text-slate-600 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="btn-glow mt-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm slide-up-2">
          New here?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
