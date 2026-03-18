import { Milk, Baby, Sparkles, ScrollText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityItem {
  id: string
  type: 'feed' | 'diaper' | 'custom'
  label: string
  timestamp: Date
  note?: string
  feed_type?: string
  duration_minutes?: number
}

const FEED_TYPE_LABELS: Record<string, string> = {
  breast_left: '🤱 L', breast_right: '🤱 R',
  both_breasts: '🤱 Both', bottle: '🍼',
}

const typeConfig = {
  feed:   { icon: Milk,     color: 'text-violet-400',  bg: 'bg-violet-500/15',  accent: 'rgba(124,58,237,0.4)'  },
  diaper: { icon: Baby,     color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    accent: 'rgba(6,182,212,0.4)'   },
  custom: { icon: Sparkles, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', accent: 'rgba(217,70,239,0.4)'  },
}

interface Props { items: ActivityItem[] }

export function RecentActivity({ items }: Props) {
  return (
    <div className="slide-up-3">
      {/* Section header — consistent with other pages */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl bg-slate-500/10 flex items-center justify-center">
          <ScrollText className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Recent Activity</p>
      </div>

      {items.length === 0 ? (
        <div className="glass p-8 text-center flex flex-col items-center gap-2">
          <Milk className="w-8 h-8 text-slate-700" />
          <p className="text-sm text-slate-500">No activity yet — log your first feed above</p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-0">
          {/* Timeline spine */}
          <div className="absolute left-[17px] top-5 bottom-5 w-px"
            style={{ background: 'linear-gradient(to bottom, rgba(124,58,237,0.35), rgba(124,58,237,0.05) 90%, transparent)' }} />

          {items.slice(0, 6).map((item) => {
            const { icon: Icon, color, bg, accent } = typeConfig[item.type]
            const ftLabel = item.type === 'feed' && item.feed_type ? FEED_TYPE_LABELS[item.feed_type] : null

            return (
              <div key={item.id} className="relative flex items-start gap-3 py-1.5">
                {/* Icon */}
                <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>

                {/* Card */}
                <div className="card-surface flex-1 min-w-0 px-3 py-2.5"
                  style={{ borderLeft: `3px solid ${accent}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-slate-200 truncate">{item.label}</p>
                        {ftLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0"
                            style={{ background: 'rgba(124,58,237,0.18)', color: '#c4b5fd' }}>
                            {ftLabel}
                          </span>
                        )}
                        {item.duration_minutes && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0"
                            style={{ background: 'rgba(236,72,153,0.15)', color: '#f9a8d4' }}>
                            {item.duration_minutes}m
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.note}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0 mt-0.5">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
