import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
    <div className="flex flex-col justify-center min-h-screen px-6 py-12">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-2">👶</div>
        <h1 className="text-3xl font-bold text-white">CryBaby</h1>
        <p className="text-slate-400 mt-1">Baby care, simplified</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Sign In
        </Button>
      </form>

      <p className="text-center text-slate-400 mt-6 text-sm">
        New here?{' '}
        <Link to="/register" className="text-brand-500 hover:text-brand-400 font-medium">
          Create account
        </Link>
      </p>
    </div>
  )
}
