import { useState, useEffect } from 'react'
import { Shield, CheckCircle, Trash2, Loader2, Users, Baby, BarChart2 } from 'lucide-react'
import { adminApi } from '@/api/auth'
import type { UserOut, AdminStats } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

function VerifiedBadge() {
  return (
    <span title="Verified" className="inline-flex items-center gap-0.5 text-blue-400">
      <CheckCircle className="w-3.5 h-3.5 fill-blue-400 text-slate-900" />
    </span>
  )
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

export default function AdminPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserOut[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null) // user id being acted on

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return }
    Promise.all([adminApi.users(), adminApi.stats()])
      .then(([u, s]) => { setUsers(u); setStats(s) })
      .finally(() => setLoading(false))
  }, [user, navigate])

  const handleVerify = async (u: UserOut) => {
    setActing(u.id)
    try {
      const updated = u.is_verified ? await adminApi.unverify(u.id) : await adminApi.verify(u.id)
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x))
    } finally { setActing(null) }
  }

  const handleDelete = async (u: UserOut) => {
    if (!confirm(`Delete ${u.display_name}? This cannot be undone.`)) return
    setActing(u.id)
    try {
      await adminApi.deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } finally { setActing(null) }
  }

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 slide-up">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-xs text-slate-500">Full system control</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 slide-up-1">
          <StatCard label="Total Users" value={stats.total_users} icon={Users} color="text-indigo-400" />
          <StatCard label="Verified" value={stats.verified_users} icon={CheckCircle} color="text-blue-400" />
          <StatCard label="Babies" value={stats.total_babies} icon={Baby} color="text-cyan-400" />
          <StatCard label="Activity Logs" value={stats.total_activity_logs} icon={BarChart2} color="text-emerald-400" />
        </div>
      )}

      {/* User management */}
      <div className="glass-strong p-4 flex flex-col gap-1 slide-up-2">
        <p className="text-sm font-semibold text-slate-200 mb-2">All Users</p>
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs text-indigo-300 font-bold">{u.display_name.charAt(0).toUpperCase()}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-200 truncate">{u.display_name}</span>
                {u.is_verified && <VerifiedBadge />}
              </div>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>

            {/* Role badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              u.role === 'admin' ? 'bg-amber-500/15 text-amber-400' :
              u.role === 'verified' ? 'bg-blue-500/15 text-blue-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {u.role}
            </span>

            {/* Actions — skip self */}
            {u.id !== user?.id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleVerify(u)}
                  disabled={acting === u.id}
                  title={u.is_verified ? 'Revoke verification' : 'Verify user (blue tick)'}
                  className={`p-1.5 rounded-lg transition-all ${u.is_verified ? 'text-blue-400 hover:bg-blue-500/10' : 'text-slate-600 hover:text-blue-400 hover:bg-blue-500/10'}`}
                >
                  {acting === u.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  disabled={acting === u.id}
                  title="Delete user"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-700 pb-2">Only visible to admin · {user?.email}</p>
    </div>
  )
}
