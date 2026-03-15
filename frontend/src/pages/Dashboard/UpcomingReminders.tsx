import { useEffect, useState } from 'react'
import { Clock, Bell, Droplets, Pill, Baby, Zap } from 'lucide-react'
import { remindersApi, type Reminder } from '@/api/reminders'
import { parseUTC } from '@/utils/dates'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  feeding: <Baby className="w-4 h-4" />,
  diaper: <Droplets className="w-4 h-4" />,
  vitamin_d: <Pill className="w-4 h-4" />,
  massage: <Zap className="w-4 h-4" />,
  pre_feed_exercise: <Zap className="w-4 h-4" />,
}

const TYPE_COLORS: Record<string, string> = {
  feeding: 'bg-amber-500/20 text-amber-300',
  diaper: 'bg-blue-500/20 text-blue-300',
  vitamin_d: 'bg-yellow-500/20 text-yellow-300',
  massage: 'bg-purple-500/20 text-purple-300',
  pre_feed_exercise: 'bg-green-500/20 text-green-300',
}

function formatTimeUntil(fireAt: Date): string {
  const diff = fireAt.getTime() - Date.now()
  if (diff <= 0) return 'now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`
}

function formatTime(fireAt: Date): string {
  return fireAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  babyId: string
}

export function UpcomingReminders({ babyId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([])

  useEffect(() => {
    remindersApi.list(babyId).then(all => {
      const now = Date.now()
      const upcoming = all
        .filter(r => r.is_enabled && r.next_fire_at)
        .map(r => ({ ...r, _fireMs: parseUTC(r.next_fire_at).getTime() }))
        .filter(r => r._fireMs > now - 5 * 60_000) // include ones fired in last 5 min
        .sort((a, b) => a._fireMs - b._fireMs)
        .slice(0, 4)
      setReminders(upcoming)
    }).catch(() => {})
  }, [babyId])

  if (reminders.length === 0) return null

  return (
    <div className="glass-hero p-4 slide-up-2">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200">Upcoming Reminders</h2>
      </div>
      <div className="flex flex-col gap-2">
        {reminders.map(r => {
          const fireAt = parseUTC(r.next_fire_at)
          const colorClass = TYPE_COLORS[r.type] ?? 'bg-slate-700/50 text-slate-300'
          const icon = TYPE_ICONS[r.type] ?? <Clock className="w-4 h-4" />
          return (
            <div key={r.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{r.label}</p>
                <p className="text-xs text-slate-500">{formatTime(fireAt)}</p>
              </div>
              <span className="text-xs font-medium text-indigo-400 whitespace-nowrap">
                {formatTimeUntil(fireAt)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
