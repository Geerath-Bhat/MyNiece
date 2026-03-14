import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ScrollText, Bell, Mic, MoreHorizontal } from 'lucide-react'

const links = [
  { to: '/',          icon: LayoutDashboard, label: 'Home'      },
  { to: '/log',       icon: ScrollText,       label: 'Log'       },
  { to: '/reminders', icon: Bell,             label: 'Reminders' },
  { to: '/voice',     icon: Mic,              label: 'Voice'     },
  { to: '/more',      icon: MoreHorizontal,   label: 'More'      },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-700 z-50 pb-safe">
      <ul className="flex justify-around items-center h-16">
        {links.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-0.5 py-2 w-full',
                  'text-xs transition-colors',
                  isActive ? 'text-brand-500' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
