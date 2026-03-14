import { Milk, Baby, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityItem {
  id: string
  type: 'feed' | 'diaper' | 'custom'
  label: string
  timestamp: Date
  note?: string
}

const typeConfig = {
  feed:   { icon: Milk,     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  diaper: { icon: Baby,     color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  custom: { icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10' },
}

interface Props { items: ActivityItem[] }

export function RecentActivity({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="slide-up-3">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-3">Recent Activity</p>
        <div className="glass p-6 text-center text-slate-500 text-sm">
          No activity yet — log your first feed above
        </div>
      </div>
    )
  }

  return (
    <div className="slide-up-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-3">Recent Activity</p>
      <div className="flex flex-col gap-2">
        {items.slice(0, 5).map((item) => {
          const { icon: Icon, color, bg } = typeConfig[item.type]
          return (
            <div key={item.id} className="glass flex items-center gap-3 px-4 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{item.label}</p>
                {item.note && <p className="text-xs text-slate-500 truncate">{item.note}</p>}
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
