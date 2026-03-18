import { useState, useEffect, useCallback } from 'react'
import { Milk, Baby, Sparkles, Loader2, Trash2, AlertTriangle, X, ScrollText } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { parseUTC, fmtDateTime } from '@/utils/dates'
import { logsApi } from '@/api/logs'
import type { ActivityLog } from '@/api/logs'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import type { FeedEvent } from '@/hooks/useActivityFeed'
import { LiveDot } from '@/components/ui/LiveDot'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'

const cfg = {
  feed:   { icon: Milk,     color: 'text-violet-400',  bg: 'bg-violet-500/10',  accent: 'rgba(124,58,237,0.45)'  },
  diaper: { icon: Baby,     color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    accent: 'rgba(6,182,212,0.45)'   },
  custom: { icon: Sparkles, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', accent: 'rgba(217,70,239,0.45)'  },
}

const FILTER_TABS = [
  { value: 'all',    label: 'All'     },
  { value: 'feed',   label: 'Feeds'   },
  { value: 'diaper', label: 'Diapers' },
  { value: 'custom', label: 'Custom'  },
]

const FEED_TYPE_LABELS: Record<string, string> = {
  breast_left:  '🤱 Left',
  breast_right: '🤱 Right',
  both_breasts: '🤱 Both',
  bottle:       '🍼 Bottle',
}

function logLabel(log: ActivityLog): string {
  if (log.type === 'feed') return 'Fed baby'
  if (log.type === 'diaper') return `Diaper change${log.diaper_type ? ` (${log.diaper_type})` : ''}`
  return log.custom_label ?? 'Custom'
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, dd MMM')
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({ log, onConfirm, onCancel }: {
  log: ActivityLog; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onCancel}>
      <div className="w-full max-w-sm modal-surface rounded-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Delete this entry?</p>
            <p className="text-xs text-slate-400 mt-0.5">{logLabel(log)} · {formatDistanceToNow(parseUTC(log.timestamp), { addSuffix: true })}</p>
          </div>
          <button onClick={onCancel} className="text-slate-600 hover:text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500">This will permanently remove the log. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-medium">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold">Yes, Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<ActivityLog | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!baby) return
    setLoading(true)
    logsApi.list(baby.id, { type: filter === 'all' ? undefined : filter, limit: 50 })
      .then(p => setLogs(p.items))
      .finally(() => setLoading(false))
  }, [baby, filter])

  const onEvent = useCallback((event: FeedEvent) => {
    if (event.type !== 'activity_log') return
    const incoming = event.payload as ActivityLog
    setLogs(prev => prev.some(l => l.id === incoming.id) ? prev : [incoming, ...prev])
  }, [])

  const { connected } = useActivityFeed({ babyId: baby?.id ?? null, onEvent })

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await logsApi.delete(pendingDelete.id)
      setLogs(prev => prev.filter(l => l.id !== pendingDelete.id))
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  // Group logs by calendar day
  const grouped: { label: string; date: string; items: ActivityLog[] }[] = []
  for (const log of logs) {
    const d = format(parseUTC(log.timestamp), 'yyyy-MM-dd')
    const last = grouped[grouped.length - 1]
    if (last?.date === d) {
      last.items.push(log)
    } else {
      grouped.push({ label: dayLabel(parseUTC(log.timestamp)), date: d, items: [log] })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between slide-up">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white">Activity Log</h1>
            <LiveDot connected={connected} />
          </div>
        </div>

        {!canEdit && <ReadOnlyBanner />}

        {/* Filter pills */}
        <div className="flex gap-2 slide-up overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_TABS.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === t.value
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/8'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center mt-10">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="glass p-10 flex flex-col items-center gap-3 slide-up-1">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
              <ScrollText className="w-7 h-7 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-600 mt-1">Log your first feed from the dashboard</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 slide-up-1">
            {grouped.map(group => (
              <div key={group.date}>
                {/* Date label */}
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{group.label}</span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(167,139,250,0.2), transparent)' }} />
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full text-indigo-400"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.18)' }}>
                    {group.items.length}
                  </span>
                </div>

                {/* Log cards for this day */}
                <div className="flex flex-col gap-2">
                  {group.items.map(log => {
                    const c = cfg[log.type as keyof typeof cfg] ?? cfg.custom
                    const Icon = c.icon
                    const ftLabel = log.type === 'feed' && log.feed_type ? FEED_TYPE_LABELS[log.feed_type] : null

                    return (
                      <div key={log.id}
                        className="glass flex items-start gap-3 px-3.5 py-3 group transition-all hover:shadow-lg"
                        style={{ borderLeft: `3px solid ${c.accent}`, borderRadius: '14px', boxShadow: `0 2px 12px ${c.accent}22` }}>
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${c.bg}`}
                          style={{ boxShadow: `0 0 12px ${c.accent}55` }}>
                          <Icon className={`w-4 h-4 ${c.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-slate-200">{logLabel(log)}</p>
                            {ftLabel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                style={{ background: 'rgba(124,58,237,0.18)', color: '#c4b5fd' }}>
                                {ftLabel}
                              </span>
                            )}
                            {log.duration_minutes && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                style={{ background: 'rgba(236,72,153,0.15)', color: '#f9a8d4' }}>
                                {log.duration_minutes}m
                              </span>
                            )}
                            {log.volume_ml && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                style={{ background: 'rgba(6,182,212,0.15)', color: '#67e8f9' }}>
                                {log.volume_ml}ml
                              </span>
                            )}
                          </div>
                          {log.notes && <p className="text-xs text-slate-500 truncate mt-0.5">{log.notes}</p>}
                          {/* Hover: exact time + logged by */}
                          <p className="text-[11px] text-slate-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {fmtDateTime(log.timestamp)}
                            {log.logged_by_name && <span className="text-slate-500"> · {log.logged_by_name}</span>}
                          </p>
                        </div>

                        {/* Time + actions */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[11px] text-slate-500 group-hover:opacity-0 transition-opacity">
                            {format(parseUTC(log.timestamp), 'HH:mm')}
                          </span>
                          {canEdit && (
                            <button onClick={() => setPendingDelete(log)}
                              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <DeleteConfirmModal
          log={pendingDelete}
          onConfirm={confirmDelete}
          onCancel={() => !deleting && setPendingDelete(null)}
        />
      )}
    </>
  )
}
