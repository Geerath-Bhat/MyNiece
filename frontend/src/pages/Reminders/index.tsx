import { useState, useEffect } from 'react'
import { Bell, Milk, Baby, Pill, Dumbbell, Sparkles, Plus, ChevronRight, Loader2 } from 'lucide-react'
import { remindersApi } from '@/api/reminders'
import type { Reminder } from '@/api/reminders'
import { useBaby } from '@/hooks/useBaby'

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  feeding:           { icon: Milk,     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  diaper:            { icon: Baby,     color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  vitamin_d:         { icon: Pill,     color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  massage:           { icon: Dumbbell, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  pre_feed_exercise: { icon: Dumbbell, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  custom:            { icon: Sparkles, color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
}

function formatDetail(r: Reminder): string {
  if (r.interval_minutes) return `Every ${r.interval_minutes / 60}h`
  if (r.time_of_day) return `Daily at ${r.time_of_day}`
  return '—'
}

export default function RemindersPage() {
  const { baby } = useBaby()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!baby) return
    remindersApi.list(baby.id).then(setReminders).finally(() => setLoading(false))
  }, [baby])

  async function toggle(r: Reminder) {
    const updated = await remindersApi.toggle(r.id, !r.is_enabled)
    setReminders(prev => prev.map(x => x.id === r.id ? updated : x))
  }

  if (loading) return (
    <div className="flex justify-center mt-20">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-xl font-bold text-white">Reminders</h1>
        <button className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex flex-col gap-2 slide-up-1">
        {reminders.map(r => {
          const cfg = TYPE_CFG[r.type] ?? TYPE_CFG.custom
          const Icon = cfg.icon
          return (
            <div key={r.id} className="glass flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{r.label}</p>
                <p className="text-xs text-slate-500">{formatDetail(r)}</p>
              </div>
              <button onClick={() => toggle(r)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${r.is_enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${r.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            </div>
          )
        })}
      </div>

      <div className="glass p-4 flex items-center gap-3 slide-up-2">
        <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="text-xs text-slate-400">Push notifications activate once you allow them in Settings.</p>
      </div>
    </div>
  )
}
