import { useState } from 'react'
import { Bell, Milk, Baby, Pill, Dumbbell, Plus, ChevronRight } from 'lucide-react'

interface Reminder { id: string; label: string; detail: string; icon: React.ElementType; iconColor: string; iconBg: string; enabled: boolean }

const DEFAULTS: Reminder[] = [
  { id: '1', label: 'Feeding',        detail: 'Every 2.5 hours',    icon: Milk,     iconColor: 'text-indigo-400', iconBg: 'bg-indigo-500/10', enabled: true  },
  { id: '2', label: 'Diaper Check',   detail: 'Every 3 hours',      icon: Baby,     iconColor: 'text-cyan-400',   iconBg: 'bg-cyan-500/10',   enabled: true  },
  { id: '3', label: 'Vitamin D',      detail: 'Daily at 12:30 PM',  icon: Pill,     iconColor: 'text-amber-400',  iconBg: 'bg-amber-500/10',  enabled: true  },
  { id: '4', label: 'Body Massage',   detail: 'Daily at 10:00 AM',  icon: Dumbbell, iconColor: 'text-emerald-400',iconBg: 'bg-emerald-500/10',enabled: false },
]

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULTS)

  function toggle(id: string) {
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-xl font-bold text-white">Reminders</h1>
        <button className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex flex-col gap-2 slide-up-1">
        {reminders.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.id} className="glass flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.iconBg}`}>
                <Icon className={`w-5 h-5 ${r.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{r.label}</p>
                <p className="text-xs text-slate-500">{r.detail}</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => toggle(r.id)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${r.enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${r.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            </div>
          )
        })}
      </div>

      <div className="glass p-4 flex items-center gap-3 slide-up-2">
        <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="text-xs text-slate-400">Push notifications activate in Milestone 3. Toggles are saved.</p>
      </div>
    </div>
  )
}
