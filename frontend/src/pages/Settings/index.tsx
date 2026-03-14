import { useState, useEffect } from 'react'
import { User, Baby, Bell, LogOut, Users, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBaby } from '@/hooks/useBaby'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { authApi } from '@/api/auth'
import type { UserOut } from '@/api/auth'
import { useNavigate } from 'react-router-dom'

function Section({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div className="glass-strong p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-sm font-semibold text-slate-200">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-300 font-medium">{value ?? '—'}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const { baby } = useBaby()
  const { subscribed, subscribe, supported } = usePushSubscription()
  const navigate = useNavigate()

  const [members, setMembers] = useState<UserOut[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleMembers = async () => {
    if (!showMembers && members.length === 0) {
      setLoadingMembers(true)
      try {
        const data = await authApi.householdMembers()
        setMembers(data)
      } finally {
        setLoadingMembers(false)
      }
    }
    setShowMembers(v => !v)
  }

  const handleSubscribe = async () => {
    setSubscribing(true)
    try { await subscribe() } finally { setSubscribing(false) }
  }

  // Generate invite code (household_id first 8 chars as simple code)
  useEffect(() => {
    if (user?.household_id) {
      setInviteCode(user.household_id.replace(/-/g, '').slice(0, 8).toUpperCase())
    }
  }, [user])

  const babyAge = baby?.date_of_birth
    ? (() => {
        const dob = new Date(baby.date_of_birth)
        const now = new Date()
        const days = Math.floor((now.getTime() - dob.getTime()) / 86400000)
        if (days < 30) return `${days} days old`
        const months = Math.floor(days / 30)
        return `${months} month${months !== 1 ? 's' : ''} old`
      })()
    : undefined

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-white slide-up">Settings</h1>

      {/* User profile */}
      <div className="slide-up-1">
        <Section title="Your Profile" icon={User} color="text-indigo-400">
          <Row label="Name" value={user?.display_name} />
          <Row label="Email" value={user?.email} />
          <Row label="Timezone" value={user?.timezone} />
          <Row label="Role" value={user?.role} />
        </Section>
      </div>

      {/* Baby profile */}
      {baby && (
        <div className="slide-up-2">
          <Section title="Baby" icon={Baby} color="text-cyan-400">
            <Row label="Name" value={baby.name} />
            <Row label="Date of Birth" value={new Date(baby.date_of_birth).toLocaleDateString()} />
            <Row label="Age" value={babyAge} />
            {baby.gender && <Row label="Gender" value={baby.gender} />}
          </Section>
        </div>
      )}

      {/* Push notifications */}
      <div className="slide-up-3">
        <Section title="Notifications" icon={Bell} color="text-amber-400">
          {!supported ? (
            <p className="text-xs text-slate-500">Push notifications not supported in this browser.</p>
          ) : subscribed ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xs text-emerald-400 font-medium">Push notifications enabled</p>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold btn-glow disabled:opacity-50"
            >
              {subscribing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Enable Push Notifications
            </button>
          )}
        </Section>
      </div>

      {/* Household */}
      <div className="slide-up-4">
        <Section title="Household" icon={Users} color="text-violet-400">
          {inviteCode && (
            <div className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Invite code</span>
              <span className="text-sm font-mono font-bold text-violet-300 tracking-wider">{inviteCode}</span>
            </div>
          )}
          <button
            onClick={toggleMembers}
            className="flex items-center justify-between w-full py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Members</span>
            {loadingMembers
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : showMembers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showMembers && members.map(m => (
            <div key={m.id} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <span className="text-xs text-indigo-300 font-bold">{m.display_name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-xs text-slate-300 flex-1">{m.display_name}</span>
              <span className="text-xs text-slate-600 capitalize">{m.role}</span>
            </div>
          ))}
        </Section>
      </div>

      {/* Sign out */}
      <div className="slide-up-5">
        <button
          onClick={handleLogout}
          className="w-full glass p-3.5 flex items-center justify-center gap-2 rounded-xl text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <p className="text-center text-xs text-slate-700 pb-2">CryBaby v1.0 · Made with ♡</p>
    </div>
  )
}
