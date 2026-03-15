import { useState, useEffect, useRef } from 'react'
import { User, Baby, Bell, LogOut, Users, ChevronDown, ChevronUp, Check, Loader2, Send, Camera, MessageCircle, Zap, Pencil, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { useBaby } from '@/hooks/useBaby'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { authApi } from '@/api/auth'
import { pushApi } from '@/api/push'
import type { UserOut } from '@/api/auth'
import { babiesApi } from '@/api/babies'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/Toast'
import { useCanEdit } from '@/hooks/useCanEdit'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

function avatarSrc(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

function AvatarUpload({
  name, currentUrl, onUploaded, uploadFn,
}: {
  name: string
  currentUrl?: string | null
  onUploaded: (url: string) => void
  uploadFn: (file: File) => Promise<{ avatar_url?: string | null }>
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const displaySrc = preview ?? avatarSrc(currentUrl)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const result = await uploadFn(file)
      if (result.avatar_url) onUploaded(result.avatar_url)
      toast('Photo updated', 'success')
    } catch {
      setPreview(null)
      toast('Upload failed. Try again.', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {displaySrc ? (
          <img src={displaySrc} alt={name} className="w-16 h-16 rounded-2xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shadow-lg border-2"
          style={{ borderColor: 'var(--color-bg)' }}
          title="Change photo"
        >
          <Camera className="w-3 h-3 text-white" />
        </button>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{name}</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-0.5"
        >
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

function Section({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  const iconBg = color.replace('text-', 'bg-').replace('400', '400/15')
  return (
    <div className="glass-hero p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
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
  const { theme, toggle: toggleTheme } = useThemeStore()
  const { user, logout, setAuth, token } = useAuthStore()
  const { baby, refetch: refetchBaby } = useBaby()
  const { subscribed, subscribe, supported } = usePushSubscription()
  const canEdit = useCanEdit()
  const navigate = useNavigate()

  const [members, setMembers] = useState<UserOut[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [householdName, setHouseholdName] = useState('')
  const [editingHousehold, setEditingHousehold] = useState(false)
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [telegramId, setTelegramId] = useState(user?.telegram_chat_id ?? '')
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [botUsername, setBotUsername] = useState<string | null>(null)

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
    try {
      await subscribe()
      toast('Push notifications enabled!', 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to enable push'
      const friendly = msg.includes('too long') || msg.includes('activate')
        ? 'Service worker not ready. Try reloading the page, or use the production build for push.'
        : msg
      toast(friendly, 'error')
    } finally {
      setSubscribing(false)
    }
  }

  const handleTestPush = async () => {
    setTestingPush(true)
    try {
      await pushApi.test()
      toast('Test notification sent to this device', 'success')
    } catch {
      toast('Push test failed — check VAPID keys in backend .env', 'error')
    } finally {
      setTestingPush(false)
    }
  }

  const handleSaveTelegram = async () => {
    setSavingTelegram(true)
    try {
      const updated = await authApi.patchMe({ telegram_chat_id: telegramId.trim() })
      if (token) setAuth(token, updated)
      toast('Telegram Chat ID saved!', 'success')
    } catch {
      toast('Failed to save Telegram ID', 'error')
    } finally {
      setSavingTelegram(false)
    }
  }

  const handleTestTelegram = async () => {
    setTestingTelegram(true)
    try {
      await pushApi.testTelegram()
      toast('Test message sent to Telegram!', 'success')
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Telegram test failed', 'error')
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleRenameHousehold = async () => {
    const trimmed = householdName.trim()
    if (!trimmed) return
    setSavingHousehold(true)
    try {
      await authApi.renameHousehold(trimmed)
      setEditingHousehold(false)
      toast('Household renamed!', 'success')
    } catch {
      toast('Failed to rename household', 'error')
    } finally {
      setSavingHousehold(false)
    }
  }

  useEffect(() => {
    authApi.householdInviteCode()
      .then(data => {
        setInviteCode(data.invite_code.toUpperCase())
        setHouseholdName(data.household_name)
      })
      .catch(() => {})
    pushApi.botInfo()
      .then(data => setBotUsername(data.bot_username))
      .catch(() => {})
  }, [])

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
        <Section title="Your Profile" icon={User} color="text-violet-400">
          {user && (
            <AvatarUpload
              name={user.display_name}
              currentUrl={user.avatar_url}
              uploadFn={authApi.uploadAvatar}
              onUploaded={(url) => {
                if (token) setAuth(token, { ...user, avatar_url: url })
              }}
            />
          )}
          <div className="pt-1 border-t border-white/5">
            <Row label="Name" value={user?.display_name} />
            <Row label="Email" value={user?.email} />
            <Row label="Timezone" value={user?.timezone} />
            <Row label="Role" value={user?.role} />
          </div>
        </Section>
      </div>

      {/* Baby profile */}
      {baby && (
        <div className="slide-up-2">
          <Section title="Baby" icon={Baby} color="text-cyan-400">
            <AvatarUpload
              name={baby.name}
              currentUrl={baby.avatar_url}
              uploadFn={(file) => babiesApi.uploadAvatar(baby.id, file)}
              onUploaded={() => refetchBaby?.()}
            />
            <div className="pt-1 border-t border-white/5">
              <Row label="Name" value={baby.name} />
              <Row label="Date of Birth" value={new Date(baby.date_of_birth).toLocaleDateString()} />
              <Row label="Age" value={babyAge} />
              {baby.gender && <Row label="Gender" value={baby.gender} />}
            </div>
          </Section>
        </div>
      )}

      {/* Notifications */}
      <div className="slide-up-3">
        <Section title="Notifications" icon={Bell} color="text-amber-400">

          {/* ── Push ── */}
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Browser Push</p>
          </div>
          {!supported ? (
            <p className="text-xs text-slate-500">Push notifications not supported in this browser.</p>
          ) : subscribed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xs text-emerald-400 font-medium">Push notifications enabled</p>
              </div>
              <button
                onClick={handleTestPush}
                disabled={testingPush}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                {testingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send test'}
              </button>
            </div>
          ) : canEdit ? (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold btn-glow disabled:opacity-50"
            >
              {subscribing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Enable Push Notifications
            </button>
          ) : (
            <p className="text-xs text-slate-500">Push notifications available after account verification.</p>
          )}

          {/* ── Telegram ── */}
          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Telegram</p>
            </div>

            <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
              <p className="text-xs text-slate-400 font-medium">How to set up:</p>
              <div className="flex flex-col gap-2">
                {/* Step 1 */}
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p className="text-xs text-slate-400">
                    Open Telegram and search for{' '}
                    {botUsername
                      ? <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer"
                          className="font-mono text-sky-400 underline underline-offset-2">@{botUsername}</a>
                      : <span className="text-slate-500">your bot</span>
                    }{' '}
                    — then tap <span className="font-mono text-sky-400">Start</span>. You'll receive notifications here.
                  </p>
                </div>
                {/* Step 2 */}
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p className="text-xs text-slate-400">
                    Message{' '}
                    <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer"
                      className="font-mono text-sky-400 underline underline-offset-2">@userinfobot</a>
                    {' '}on Telegram — it will reply with your Chat ID number.
                  </p>
                </div>
                {/* Step 3 */}
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p className="text-xs text-slate-400">Paste that Chat ID below and tap <span className="text-white font-medium">Save</span>.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={telegramId}
                onChange={e => setTelegramId(e.target.value)}
                placeholder="e.g. 7586627942"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
              />
              <button
                onClick={handleSaveTelegram}
                disabled={savingTelegram}
                className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shrink-0"
              >
                {savingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
            </div>

            {user?.telegram_chat_id && (
              <button
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs text-sky-400 hover:text-sky-300 transition-colors"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}
              >
                {testingTelegram
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                {testingTelegram ? 'Sending…' : 'Send test message to Telegram'}
              </button>
            )}
          </div>
        </Section>
      </div>

      {/* Household */}
      <div className="slide-up-4">
        <Section title="Household" icon={Users} color="text-violet-400">
          {user?.role && ['admin', 'super_admin'].includes(user.role) && (
            <div className="flex flex-col gap-2">
              {editingHousehold ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={householdName}
                    onChange={e => setHouseholdName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameHousehold(); if (e.key === 'Escape') setEditingHousehold(false) }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleRenameHousehold}
                    disabled={savingHousehold || !householdName.trim()}
                    className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {savingHousehold ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingHousehold(false)}
                    className="px-3 py-2 rounded-xl bg-white/5 text-slate-400 text-xs hover:bg-white/10 transition-colors shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingHousehold(true)}
                  className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between w-full hover:bg-white/10 transition-colors"
                >
                  <span className="text-xs text-slate-400">Household name</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-200 font-medium">{householdName}</span>
                    <Pencil className="w-3 h-3 text-slate-500" />
                  </div>
                </button>
              )}
            </div>
          )}
          {inviteCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode).catch(() => {})
                toast('Invite code copied!', 'success')
              }}
              className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between w-full hover:bg-white/10 transition-colors"
              title="Tap to copy"
            >
              <span className="text-xs text-slate-400">Invite code <span className="text-slate-500">(tap to copy)</span></span>
              <span className="text-sm font-mono font-bold text-violet-300 tracking-wider">{inviteCode}</span>
            </button>
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
              {m.avatar_url ? (
                <img src={avatarSrc(m.avatar_url)!} alt={m.display_name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <span className="text-xs text-violet-300 font-bold">{m.display_name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <span className="text-xs text-slate-300 flex-1">{m.display_name}</span>
              <span className="text-xs text-slate-400 capitalize">{m.role}</span>
            </div>
          ))}
        </Section>
      </div>

      {/* Appearance */}
      <div className="slide-up-5">
        <Section title="Appearance" icon={theme === 'light' ? Sun : Moon} color={theme === 'light' ? 'text-amber-400' : 'text-indigo-400'}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-300">{theme === 'light' ? 'Light mode' : 'Dark mode'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{theme === 'light' ? 'Pastel lavender' : 'Aurora dark'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className={[
                'relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600'
                  : 'bg-gradient-to-r from-amber-300 to-violet-400',
              ].join(' ')}
              aria-label="Toggle theme"
            >
              <span className={[
                'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center',
                theme === 'dark' ? 'left-7' : 'left-0.5',
              ].join(' ')}>
                {theme === 'light'
                  ? <Sun className="w-3.5 h-3.5 text-amber-500" />
                  : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              </span>
            </button>
          </div>
        </Section>
      </div>

      {/* Sign out */}
      <div className="slide-up-6">
        <button
          onClick={handleLogout}
          className="w-full glass p-3.5 flex items-center justify-center gap-2 rounded-xl text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <p className="text-center text-xs text-slate-500 pb-2">CryBaby v1.0 · Made with ♡</p>
    </div>
  )
}
