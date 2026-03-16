import { Link } from 'react-router-dom'
import { BarChart2, DollarSign, Moon, Settings, Shield, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const items = [
  { to: '/sleep',     icon: Moon,        color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  label: 'Sleep',      sub: 'Track sleep sessions & patterns',  adminOnly: false },
  { to: '/analytics', icon: BarChart2,   color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Analytics',  sub: 'Feeding & diaper insights',        adminOnly: false },
  { to: '/expenses',  icon: DollarSign,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Expenses',   sub: 'Track baby-related spending',      adminOnly: false },
  { to: '/settings',  icon: Settings,    color: 'text-slate-400',   bg: 'bg-slate-500/10',   label: 'Settings',   sub: 'Profile, notifications, household', adminOnly: false },
  { to: '/admin',     icon: Shield,      color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Admin',      sub: 'Manage users & households',        adminOnly: true  },
]

export default function MorePage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const visibleItems = items.filter(i => !i.adminOnly || isAdmin)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-white slide-up">More</h1>
      <div className="flex flex-col gap-2 slide-up-1">
        {visibleItems.map(({ to, icon: Icon, color, bg, label, sub }) => (
          <Link key={to} to={to}
            className="glass flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all active:scale-[0.98]">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
