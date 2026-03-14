import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react'

const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 placeholder:text-slate-600 transition-all'

function PasswordStep({ onSuccess }: { onSuccess: (userId: string, emailHint: string) => void }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(form)
      if ('otp_required' in data && data.otp_required) {
        const challenge = data as import('@/api/auth').OTPChallengeResponse
        onSuccess(challenge.user_id, challenge.email_hint)
      } else {
        const auth = data as import('@/api/auth').AuthResponse
        setAuth(auth.access_token, auth.user)
        navigate('/')
      }
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-strong p-6 flex flex-col gap-4 slide-up-1">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
        <input type="email" autoComplete="email" required placeholder="you@example.com"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
        <input type="password" autoComplete="current-password" required placeholder="••••••••"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          className={inputClass} />
      </div>
      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">{error}</div>}
      <button type="submit" disabled={loading}
        className="btn-glow mt-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Sign In
      </button>
    </form>
  )
}

function OTPStep({ userId, emailHint, onBack }: { userId: string; emailHint: string; onBack: () => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resending, setResending] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  function handleDigit(idx: number, val: string) {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = char
    setDigits(next)
    if (char && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setDigits(text.split(''))
      refs.current[5]?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) { setError('Enter all 6 digits'); return }
    setError('')
    setLoading(true)
    try {
      const data = await authApi.verifyOtp({ user_id: userId, code })
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Invalid code. Try again.')
      setDigits(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await authApi.resendOtp(userId)
      setResendCooldown(60)
      setError('')
      setDigits(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Could not resend. Try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="glass-strong p-6 flex flex-col gap-5 slide-up-1">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-200">Check your email</p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3" /> Code sent to <span className="text-indigo-400">{emailHint}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i}
              ref={el => { refs.current[i] = el }}
              type="text" inputMode="numeric" maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="w-11 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-slate-100 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all caret-transparent"
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || digits.join('').length < 6}
          className="btn-glow w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity">
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Verify & Sign In
        </button>
      </form>

      <div className="text-center">
        {resendCooldown > 0 ? (
          <p className="text-xs text-slate-600">Resend code in {resendCooldown}s</p>
        ) : (
          <button type="button" onClick={handleResend} disabled={resending}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 mx-auto transition-colors">
            <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Login() {
  const [step, setStep] = useState<'password' | 'otp'>('password')
  const [userId, setUserId] = useState('')
  const [emailHint, setEmailHint] = useState('')

  function handleOTPRequired(uid: string, hint: string) {
    setUserId(uid)
    setEmailHint(hint)
    setStep('otp')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
      <div className="aurora-bg" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        <div className="text-center slide-up">
          <div className="text-6xl mb-3">👶</div>
          <h1 className="text-3xl font-bold gradient-text">CryBaby</h1>
          <p className="text-slate-400 mt-1 text-sm">Baby care, simplified</p>
        </div>

        {step === 'password'
          ? <PasswordStep onSuccess={handleOTPRequired} />
          : <OTPStep userId={userId} emailHint={emailHint} onBack={() => setStep('password')} />
        }

        {step === 'password' && (
          <p className="text-center text-slate-500 text-sm slide-up-2">
            New here?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Create account</Link>
          </p>
        )}
      </div>
    </div>
  )
}
