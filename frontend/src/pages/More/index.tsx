import { Link } from 'react-router-dom'
import { BarChart2, DollarSign, Moon, Settings, Shield, ChevronRight, TrendingUp, Stethoscope } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBaby } from '@/hooks/useBaby'

const items = [
  {
    to: '/growth',
    icon: TrendingUp,
    color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)',
    label: 'Growth',
    sub: 'Weight, height & WHO percentiles',
    adminOnly: false,
  },
  {
    to: '/health',
    icon: Stethoscope,
    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)',
    label: 'Health',
    sub: 'Doctor visits, vaccines & milestones',
    adminOnly: false,
  },
  {
    to: '/sleep',
    icon: Moon,
    color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)',
    label: 'Sleep',
    sub: 'Track sleep sessions & patterns',
    adminOnly: false,
  },
  {
    to: '/analytics',
    icon: BarChart2,
    color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)',
    label: 'Analytics',
    sub: 'Feeding, sleep & diaper insights',
    adminOnly: false,
  },
  {
    to: '/expenses',
    icon: DollarSign,
    color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)',
    label: 'Expenses',
    sub: 'Track baby-related spending',
    adminOnly: false,
  },
  {
    to: '/settings',
    icon: Settings,
    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.2)',
    label: 'Settings',
    sub: 'Profile, notifications & household',
    adminOnly: false,
  },
  {
    to: '/admin',
    icon: Shield,
    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)',
    label: 'Admin',
    sub: 'Manage users & households',
    adminOnly: true,
  },
]

export default function MorePage() {
  const user = useAuthStore(s => s.user)
  const { baby } = useBaby()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const visibleItems = items.filter(i => !i.adminOnly || isAdmin)

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="slide-up">
        <h1 className="text-xl font-bold text-white">More</h1>
        {baby && (
          <p className="text-xs text-slate-500 mt-0.5">Tracking {baby.name}</p>
        )}
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-2 slide-up-1">
        {visibleItems.map(({ to, icon: Icon, bg, border, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="card-surface group flex items-center gap-3 px-3.5 py-3.5 transition-all active:scale-[0.98]"
            style={{ borderLeft: `3px solid ${border}` }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
              style={{ background: bg }}>
              <Icon className="w-5 h-5 text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>

            {/* Chevron */}
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-slate-600 pb-2 slide-up-2">CryBaby · Made with ♡</p>
    </div>
  )
}
