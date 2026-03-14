import { useState, useEffect, useCallback } from 'react'
import { Milk, Baby, Sparkles, Filter, Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { logsApi } from '@/api/logs'
import type { ActivityLog } from '@/api/logs'
import { useBaby } from '@/hooks/useBaby'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import type { FeedEvent } from '@/hooks/useActivityFeed'
import { LiveDot } from '@/components/ui/LiveDot'

const cfg = {
  feed:   { icon: Milk,     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  diaper: { icon: Baby,     color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  custom: { icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10' },
}

const TYPES = ['all', 'feed', 'diaper', 'custom']

function logLabel(log: ActivityLog): string {
  if (log.type === 'feed') return 'Fed baby'
  if (log.type === 'diaper') return `Diaper change${log.diaper_type ? ` (${log.diaper_type})` : ''}`
  return log.custom_label ?? 'Custom'
}

export default function ActivityLogPage() {
  const { baby } = useBaby()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    if (!baby) return
    setLoading(true)
    logsApi.list(baby.id, { type: filter === 'all' ? undefined : filter, limit: 30 })
      .then(p => setLogs(p.items))
      .finally(() => setLoading(false))
  }, [baby, filter])

  // Real-time SSE: prepend new activity_log events from other caregivers
  const onEvent = useCallback((event: FeedEvent) => {
    if (event.type !== 'activity_log') return
    const incoming = event.payload as ActivityLog
    setLogs(prev => {
      // Deduplicate by id in case this client created the log itself
      if (prev.some(l => l.id === incoming.id)) return prev
      return [incoming, ...prev]
    })
  }, [])

  const { connected } = useActivityFeed({ babyId: baby?.id ?? null, onEvent })

  async function deleteLog(id: string) {
    await logsApi.delete(id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between slide-up">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Activity Log</h1>
          <LiveDot connected={connected} />
        </div>
        <button onClick={() => setShowFilter(f => !f)}
          className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {showFilter && (
        <div className="flex gap-2 slide-up">
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all ${filter === t ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center mt-10"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="glass p-8 text-center text-slate-500 text-sm slide-up-1">
          No activity yet — log your first feed from the dashboard
        </div>
      ) : (
        <div className="flex flex-col gap-2 slide-up-1">
          {logs.map(log => {
            const c = cfg[log.type as keyof typeof cfg] ?? cfg.custom
            const Icon = c.icon
            return (
              <div key={log.id} className="glass flex items-center gap-3 px-4 py-3.5 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{logLabel(log)}</p>
                  {log.notes && <p className="text-xs text-slate-500 truncate">{log.notes}</p>}
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
                <button onClick={() => deleteLog(log.id)}
                  className="opacity-0 group-hover:opacity-100 ml-1 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
