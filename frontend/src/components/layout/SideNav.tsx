import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ScrollText, Bell, Mic,
  Moon, BarChart2, DollarSign, Settings, LogOut, Shield, CheckCircle, TrendingUp, Stethoscope,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { HouseholdSwitcher } from './HouseholdSwitcher'

const links = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  end: true,  adminOnly: false },
  { to: '/log',       icon: ScrollText,      label: 'Activity',   end: false, adminOnly: false },
  { to: '/reminders', icon: Bell,            label: 'Reminders',  end: false, adminOnly: false },
  { to: '/voice',     icon: Mic,             label: 'Voice',      end: false, adminOnly: false },
  { to: '/growth',    icon: TrendingUp,      label: 'Growth',     end: false, adminOnly: false },
  { to: '/health',    icon: Stethoscope,     label: 'Health',     end: false, adminOnly: false },
  { to: '/sleep',     icon: Moon,            label: 'Sleep',      end: false, adminOnly: false },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics',  end: false, adminOnly: false },
  { to: '/expenses',  icon: DollarSign,      label: 'Expenses',   end: false, adminOnly: false },
  { to: '/settings',  icon: Settings,        label: 'Settings',   end: false, adminOnly: false },
  { to: '/admin',     icon: Shield,          label: 'Admin',      end: false, adminOnly: true  },
]

export function SideNav() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const visibleLinks = links.filter(l => !l.adminOnly || isAdmin)

  return (
    <aside className="
      hidden md:flex flex-col
      fixed left-0 top-0 bottom-0 z-50
      w-16 lg:w-56
      border-r border-white/5
      nav-surface
      py-6
    ">
      {/* Logo */}
      <div className="px-3 lg:px-5 mb-8 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
          <span className="text-white font-bold text-sm">CB</span>
        </div>
        <span className="hidden lg:block text-white font-semibold text-sm tracking-wide">CryBaby</span>
      </div>

      {/* Household switcher — super_admin only */}
      {user?.role === 'super_admin' && <HouseholdSwitcher />}

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1 px-2 lg:px-3 overflow-y-auto">
        {visibleLinks.map(({ to, icon: Icon, label, end, adminOnly }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => [
              'flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all',
              'text-sm font-medium',
              isActive
                ? adminOnly ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'
                : adminOnly ? 'text-amber-600 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? (adminOnly ? 'text-amber-400' : 'text-indigo-400') : ''}`} />
                <span className="hidden lg:block truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + verification badge + logout */}
      <div className="px-2 lg:px-3 shrink-0 flex flex-col gap-1 pt-2 border-t border-white/5">
        <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 relative">
            <span className="text-xs text-indigo-300 font-bold">
              {user?.display_name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-slate-400 truncate">{user?.display_name}</span>
            {user?.is_verified && (
              <span title="Verified">
                <CheckCircle className="w-3 h-3 text-blue-400 fill-blue-400 shrink-0" />
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
