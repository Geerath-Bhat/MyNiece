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
  feed:   { icon: Milk,     color: 'text-violet-400',  bg: 'bg-violet-500/15', dot: 'bg-violet-400' },
  diaper: { icon: Baby,     color: 'text-cyan-400',    bg: 'bg-cyan-500/15',   dot: 'bg-cyan-400'   },
  custom: { icon: Sparkles, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', dot: 'bg-fuchsia-400' },
}

interface Props { items: ActivityItem[] }

export function RecentActivity({ items }: Props) {
  return (
    <div className="slide-up-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-3">Recent Activity</p>

      {items.length === 0 ? (
        <div className="glass p-6 text-center text-slate-500 text-sm">
          No activity yet — log your first feed above
        </div>
      ) : (
        <div className="relative flex flex-col gap-0">
          {/* Timeline line */}
          <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-violet-500/30 via-fuchsia-500/20 to-transparent" />

          {items.slice(0, 6).map((item, i) => {
            const { icon: Icon, color, bg, dot } = typeConfig[item.type]
            return (
              <div key={item.id} className={`relative flex items-start gap-3 py-2.5 ${i < items.length - 1 ? 'pb-3' : ''}`}>
                {/* Timeline dot */}
                <div className="relative z-10 shrink-0 mt-0.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${dot}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 glass px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{item.label}</p>
                    <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.note}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
