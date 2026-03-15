import { useState, useEffect } from 'react'
import { ShieldAlert, Bell, Loader2 } from 'lucide-react'
import { authApi } from '@/api/auth'
import type { UserOut } from '@/api/auth'
import { toast } from './Toast'

export function ReadOnlyBanner() {
  const [admin, setAdmin] = useState<UserOut | null>(null)
  const [notified, setNotified] = useState(false)
  const [notifying, setNotifying] = useState(false)

  useEffect(() => {
    authApi.householdMembers()
      .then(members => {
        const hAdmin = members.find(m => m.role === 'admin' || m.role === 'super_admin')
        if (hAdmin) setAdmin(hAdmin)
      })
      .catch(() => {})
  }, [])

  const handleNotify = async () => {
    setNotifying(true)
    try {
      await authApi.requestVerification()
      setNotified(true)
      toast('Your admin has been notified!', 'success')
    } catch {
      toast('Could not send notification. Try again.', 'error')
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl"
      style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs dark:text-amber-200 text-amber-800">
            Your account is <span className="font-semibold">pending verification</span>.
            {admin
              ? <> Contact <span className="font-semibold dark:text-white text-amber-900">{admin.display_name}</span> to get verified, or tap below to notify them.</>
              : <> Ask your household admin to verify you.</>
            }
            {' '}Until then you can view but not make changes.
          </p>
        </div>
      </div>
      {!notified ? (
        <button
          onClick={handleNotify}
          disabled={notifying}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium dark:text-amber-300 text-amber-700 transition-colors disabled:opacity-50"
          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
        >
          {notifying
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Bell className="w-3 h-3" />}
          {notifying ? 'Notifying…' : 'Notify Admin'}
        </button>
      ) : (
        <p className="text-center text-xs text-amber-600">✓ Admin notified — they'll verify you soon</p>
      )}
    </div>
  )
}
