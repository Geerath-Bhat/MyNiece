import { useState, useEffect } from 'react'
import { Shield, CheckCircle, Trash2, Loader2, Users, Baby, BarChart2, X, Crown, AlertTriangle, Home, ShieldPlus, ShieldMinus } from 'lucide-react'
import { adminApi } from '@/api/auth'
import type { UserOut, AdminStats, HouseholdOut } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/Toast'

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    super_admin: { label: 'super admin', cls: 'bg-fuchsia-500/15 text-fuchsia-400' },
    admin:       { label: 'admin',       cls: 'bg-amber-500/15 text-amber-400'    },
    verified:    { label: 'verified',    cls: 'bg-blue-500/15 text-blue-400'      },
    member:      { label: 'member',      cls: 'bg-slate-700 text-slate-400'       },
  }
  const { label, cls } = cfg[role] ?? cfg.member
  return <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cls}`}>{label}</span>
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="glass p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

type DeleteWarning = 'last_member' | 'only_admin' | 'normal'

export default function AdminPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'super_admin'
  const [users, setUsers] = useState<UserOut[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [households, setHouseholds] = useState<HouseholdOut[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserOut | null>(null)

  useEffect(() => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) { navigate('/'); return }
    const calls = isSuperAdmin
      ? Promise.all([adminApi.users(), adminApi.stats(), adminApi.households()])
          .then(([u, s, h]) => { setUsers(u); setStats(s); setHouseholds(h) })
      : adminApi.users().then(u => setUsers(u))
    calls.finally(() => setLoading(false))
  }, [user, navigate, isSuperAdmin])

  const canManage = (target: UserOut) => {
    if (!user || target.id === user.id) return false
    if (isSuperAdmin) return true
    return !['admin', 'super_admin'].includes(target.role)
  }

  const getDeleteWarning = (target: UserOut): DeleteWarning => {
    const householdMembers = users.filter(u => u.household_id === target.household_id)
    if (householdMembers.length === 1) return 'last_member'
    const admins = householdMembers.filter(u => ['admin', 'super_admin'].includes(u.role))
    if (target.role === 'admin' && admins.length === 1) return 'only_admin'
    return 'normal'
  }

  const getHouseholdName = (householdId: string) =>
    households.find(h => h.id === householdId)?.name ?? 'their household'

  const handleVerify = async (u: UserOut) => {
    setActing(u.id)
    try {
      const updated = u.is_verified ? await adminApi.unverify(u.id) : await adminApi.verify(u.id)
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x))
    } catch {
      toast('Failed to update user', 'error')
    } finally { setActing(null) }
  }

  const handlePromote = async (u: UserOut) => {
    setActing(u.id)
    try {
      const updated = u.role === 'admin' ? await adminApi.demote(u.id) : await adminApi.promote(u.id)
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x))
      toast(u.role === 'admin' ? `${u.display_name} demoted to member` : `${u.display_name} promoted to admin`, 'success')
    } catch {
      toast('Failed to update role', 'error')
    } finally { setActing(null) }
  }

  const handleDelete = async (u: UserOut) => {
    setActing(u.id)
    try {
      await adminApi.deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      setConfirmDelete(null)
    } catch {
      toast('Failed to delete user. Please try again.', 'error')
    } finally {
      setActing(null)
    }
  }

  // Reusable user row — inline render function to share state/handlers
  const renderUserRow = (u: UserOut) => (
    <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
        <span className="text-xs text-indigo-300 font-bold">{u.display_name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-200 truncate">{u.display_name}</span>
          {u.is_verified && (
            <span title="Verified" className="inline-flex items-center gap-0.5 text-blue-400">
              <CheckCircle className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{u.email}</p>
      </div>
      <RoleBadge role={u.role} />
      {canManage(u) && (
        <div className="flex items-center gap-1 shrink-0">
          {u.role !== 'admin' && (
            <button
              onClick={() => handleVerify(u)}
              disabled={acting === u.id}
              title={u.is_verified ? 'Revoke verification' : 'Verify user'}
              className={`p-1.5 rounded-lg transition-all ${u.is_verified ? 'text-blue-400 hover:bg-blue-500/10' : 'text-slate-600 hover:text-blue-400 hover:bg-blue-500/10'}`}
            >
              {acting === u.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle className="w-3.5 h-3.5" />}
            </button>
          )}
          {isSuperAdmin && u.role !== 'super_admin' && (
            <button
              onClick={() => handlePromote(u)}
              disabled={acting === u.id}
              title={u.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
              className={`p-1.5 rounded-lg transition-all ${u.role === 'admin' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'}`}
            >
              {acting === u.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : u.role === 'admin'
                  ? <ShieldMinus className="w-3.5 h-3.5" />
                  : <ShieldPlus className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(u)}
            disabled={acting === u.id}
            title="Delete user"
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  const warning = confirmDelete ? getDeleteWarning(confirmDelete) : 'normal'
  const householdName = confirmDelete ? getHouseholdName(confirmDelete.household_id) : ''
  const remainingCount = confirmDelete
    ? users.filter(u => u.household_id === confirmDelete.household_id).length - 1
    : 0

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 slide-up">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSuperAdmin ? 'bg-fuchsia-500/15' : 'bg-amber-500/15'}`}>
            {isSuperAdmin
              ? <Crown className="w-5 h-5 text-fuchsia-400" />
              : <Shield className="w-5 h-5 text-amber-400" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
            </h1>
            <p className="text-xs text-slate-500">
              {isSuperAdmin ? 'Global control across all households' : 'Manage your household members'}
            </p>
          </div>
        </div>

        {/* Stats — super_admin only */}
        {isSuperAdmin && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 slide-up-1">
            <StatCard label="Total Users" value={stats.total_users} icon={Users} color="text-indigo-400" />
            <StatCard label="Verified" value={stats.verified_users} icon={CheckCircle} color="text-blue-400" />
            <StatCard label="Babies" value={stats.total_babies} icon={Baby} color="text-cyan-400" />
            <StatCard label="Activity Logs" value={stats.total_activity_logs} icon={BarChart2} color="text-emerald-400" />
          </div>
        )}

        {/* User list */}
        {isSuperAdmin ? (
          // Grouped by household for super_admin
          <>
            {households.map(hh => {
              const hUsers = users.filter(u => u.household_id === hh.id)
              if (hUsers.length === 0) return null
              return (
                <div key={hh.id} className="glass-strong p-4 flex flex-col gap-1 slide-up-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-fuchsia-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-fuchsia-300 font-bold">{hh.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">{hh.name}</p>
                    <span className="text-xs text-slate-600 ml-auto">{hUsers.length} member{hUsers.length !== 1 ? 's' : ''}</span>
                  </div>
                  {hUsers.map(renderUserRow)}
                </div>
              )
            })}
          </>
        ) : (
          // Flat list for household admin
          <div className="glass-strong p-4 flex flex-col gap-1 slide-up-2">
            <p className="text-sm font-semibold text-slate-200 mb-2">Your Household Members</p>
            {users.map(renderUserRow)}
          </div>
        )}

        <p className="text-center text-xs text-slate-700 pb-2">
          {isSuperAdmin ? 'Super Admin' : 'Household Admin'} · {user?.email}
        </p>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm modal-surface rounded-3xl p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: warning === 'last_member' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)' }}>
                {warning === 'last_member'
                  ? <Home className="w-6 h-6 text-amber-400" />
                  : <Trash2 className="w-6 h-6 text-red-400" />}
              </div>
              <button onClick={() => setConfirmDelete(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {warning === 'last_member' && (
                <>
                  <p className="text-base font-bold text-white">Delete entire household?</p>
                  <p className="text-sm text-slate-400">
                    <span className="text-slate-200">{confirmDelete.display_name}</span> is the{' '}
                    <span className="text-amber-400 font-medium">last member</span> of{' '}
                    <span className="text-slate-200">{householdName}</span>.
                  </p>
                  <div className="rounded-xl p-3 flex items-start gap-2.5"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                      Deleting this user will <strong>permanently delete the entire {householdName} household</strong> — including all babies, activity logs, sleep sessions, expenses, and reminders. This cannot be undone.
                    </p>
                  </div>
                </>
              )}
              {warning === 'only_admin' && (
                <>
                  <p className="text-base font-bold text-white">Delete admin?</p>
                  <p className="text-sm text-slate-400">
                    <span className="text-slate-200">{confirmDelete.display_name}</span> is the{' '}
                    <span className="text-red-400 font-medium">only admin</span> of{' '}
                    <span className="text-slate-200">{householdName}</span>.
                  </p>
                  <div className="rounded-xl p-3 flex items-start gap-2.5"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">
                      The remaining <strong>{remainingCount} member{remainingCount !== 1 ? 's' : ''}</strong> in {householdName} will have no admin. Consider promoting another member first.
                    </p>
                  </div>
                </>
              )}
              {warning === 'normal' && (
                <>
                  <p className="text-base font-bold text-white">Delete user?</p>
                  <p className="text-sm text-slate-400">
                    <span className="text-slate-200">{confirmDelete.display_name}</span>{' '}
                    ({confirmDelete.email}) will be permanently removed. This cannot be undone.
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={acting === confirmDelete.id}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  warning === 'last_member' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {acting === confirmDelete.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {warning === 'last_member' ? 'Delete Household' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
