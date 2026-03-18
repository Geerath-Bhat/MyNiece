import { useState, useEffect, useCallback } from 'react'
import { Bell, ChevronRight, Milk, Baby, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { parseUTC } from '@/utils/dates'
import { useAuthStore } from '@/store/authStore'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { useNextFeed } from '@/hooks/useNextFeed'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { logsApi } from '@/api/logs'
import type { ActivityLog } from '@/api/logs'
import BabySetup from '@/pages/BabySetup'
import { NextFeedCard } from './NextFeedCard'
import { QuickActions } from './QuickActions'
import { RecentActivity } from './RecentActivity'
import { LogPastEventModal } from './LogPastEventModal'
import { FeedLogModal } from './FeedLogModal'
import { WeightLogModal } from './WeightLogModal'
import { UpcomingReminders } from './UpcomingReminders'
import type { ActivityItem } from './RecentActivity'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getBabyAge(dob: string): string {
  const birth = new Date(dob)
  const now = new Date()
  const weeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (weeks < 1) return 'newborn'
  if (weeks < 8) return `${weeks}w old`
  const months = Math.floor(weeks / 4.33)
  return `${months}mo old`
}

function toActivityItem(log: ActivityLog): ActivityItem {
  return {
    id: log.id,
    type: log.type as ActivityItem['type'],
    label: log.type === 'feed' ? 'Fed baby'
      : log.type === 'diaper' ? `Diaper change${log.diaper_type ? ` (${log.diaper_type})` : ''}`
      : log.custom_label ?? 'Custom',
    timestamp: parseUTC(log.timestamp),
    note: log.notes ?? undefined,
    feed_type: log.feed_type,
    duration_minutes: log.duration_minutes,
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

function AvatarCircle({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const src = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE}${avatarUrl}`) : null

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-violet-500/20 shrink-0"
      />
    )
  }
  return (
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
      <span className="text-white font-bold text-lg">{initials}</span>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { baby, babies, loading: babyLoading, noBaby } = useBaby()
  const canEdit = useCanEdit()
  const { lastFedAt, nextDueAt, optimisticFeed, refresh: refreshFeed } = useNextFeed(baby?.id ?? null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [feedCount, setFeedCount] = useState(0)
  const [diaperCount, setDiaperCount] = useState(0)
  const [lastFeedType, setLastFeedType] = useState<string | undefined>()
  const [lastFeedDuration, setLastFeedDuration] = useState<number | undefined>()
  const [setupDone, setSetupDone] = useState(false)
  const [showPastLog, setShowPastLog] = useState(false)
  const [showFeedLog, setShowFeedLog] = useState(false)
  const [showWeightLog, setShowWeightLog] = useState(false)

  const loadLogs = useCallback(() => {
    if (!baby) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    logsApi.list(baby.id, { limit: 10 }).then(page => {
      setActivity(page.items.map(toActivityItem))
      const todayLogs = page.items.filter(l => new Date(l.timestamp) >= today)
      setFeedCount(todayLogs.filter(l => l.type === 'feed').length)
      setDiaperCount(todayLogs.filter(l => l.type === 'diaper').length)
      const lastFeed = page.items.find(l => l.type === 'feed')
      setLastFeedType(lastFeed?.feed_type ?? undefined)
      setLastFeedDuration(lastFeed?.duration_minutes ?? undefined)
    }).catch(() => {})
  }, [baby])

  useEffect(() => { loadLogs() }, [loadLogs, setupDone])

  useActivityFeed({
    babyId: baby?.id ?? null,
    onEvent: (event) => {
      if (event.type === 'activity_log') {
        loadLogs()
        if (event.payload?.type === 'feed') refreshFeed()
      }
    },
  })

  function logFeed() {
    setShowFeedLog(true)
  }

  function onFeedLogged() {
    optimisticFeed()
    loadLogs()
    refreshFeed()
  }

  async function logDiaper() {
    if (!baby) return
    await logsApi.create({ baby_id: baby.id, type: 'diaper', diaper_type: 'wet' })
    setDiaperCount(c => c + 1)
    setActivity(prev => [
      { id: String(Date.now()), type: 'diaper', label: 'Diaper change (wet)', timestamp: new Date() },
      ...prev,
    ])
  }

  if (babyLoading) {
    return (
      <div className="flex items-center justify-center mt-32">
        <span className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (noBaby && !setupDone) {
    return <BabySetup existingBabies={babies} onCreated={() => setSetupDone(true)} />
  }

  const intervalMinutes = (lastFedAt && nextDueAt)
    ? Math.round((nextDueAt.getTime() - lastFedAt.getTime()) / 60_000)
    : 150

  const firstName = user?.display_name.split(' ')[0] ?? 'Parent'

  return (
    <div className="flex flex-col gap-4 pb-2">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="relative rounded-3xl slide-up"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(168,85,247,0.12) 60%, rgba(236,72,153,0.10) 100%)', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 40px rgba(124,58,237,0.12), 0 2px 8px rgba(124,58,237,0.07)' }}>

        {/* Decorative orb */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #c084fc, transparent 70%)' }} />

        <div className="relative p-5">
          {/* Top row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs font-medium">{getGreeting()},</p>
              <h1 className="text-2xl font-bold gradient-text leading-tight">{firstName}</h1>
            </div>
            {/* Bell — navigates to Activity Log */}
            <button
              onClick={() => navigate('/log')}
              className="w-10 h-10 flex items-center justify-center rounded-2xl relative"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}
            >
              <Bell className="w-5 h-5 text-violet-300" />
              {activity.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-fuchsia-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Baby info row */}
          {baby && (
            <div className="flex items-center gap-3 mb-4">
              <AvatarCircle name={baby.name} avatarUrl={baby.avatar_url} />
              <div className="flex-1">
                <p className="text-lg font-bold text-white leading-tight">{baby.name}</p>
                <p className="text-xs text-violet-300">{getBabyAge(baby.date_of_birth)}</p>
              </div>
            </div>
          )}

          {/* Today stats strip */}
          <div className="flex gap-2">
            {[
              {
                icon: Milk, value: feedCount, label: 'feeds today',
                bg: 'rgba(124,58,237,0.18)', border: 'rgba(167,139,250,0.25)',
                iconBg: 'rgba(124,58,237,0.25)', color: '#a78bfa',
              },
              {
                icon: Baby, value: diaperCount, label: 'diapers today',
                bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.25)',
                iconBg: 'rgba(6,182,212,0.25)', color: '#67e8f9',
              },
              {
                icon: Clock,
                value: intervalMinutes ? `${Math.round(intervalMinutes / 60)}h` : '—',
                label: 'interval',
                bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.25)',
                iconBg: 'rgba(236,72,153,0.25)', color: '#f0abfc',
              },
            ].map(({ icon: Icon, value, label, bg, border, iconBg }) => (
              <div key={label} className="flex-1 rounded-2xl px-2 py-3 flex flex-col items-center gap-1.5"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: iconBg }}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-2xl font-bold leading-none tabular-nums text-white">{value}</p>
                <p className="text-[10px] font-medium leading-tight text-center text-white opacity-75">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Next Feed Countdown ─────────────────────────────────── */}
      <NextFeedCard
        lastFedAt={lastFedAt ?? undefined}
        intervalMinutes={intervalMinutes}
        onLogFeed={() => setShowFeedLog(true)}
        canEdit={canEdit}
        lastFeedType={lastFeedType}
        lastFeedDuration={lastFeedDuration}
      />

      {/* ── Quick Log Grid ──────────────────────────────────────── */}
      {canEdit && (
        <>
          <QuickActions
            onFeed={logFeed}
            onDiaper={logDiaper}
            onVitaminD={() => baby && logsApi.create({ baby_id: baby.id, type: 'custom', custom_label: 'Vitamin D' })}
            onExercise={() => baby && logsApi.create({ baby_id: baby.id, type: 'custom', custom_label: 'Pre-feed exercise' })}
            onSleep={() => navigate('/sleep')}
            onWeight={() => setShowWeightLog(true)}
          />

          {/* Log past event link */}
          <button
            onClick={() => setShowPastLog(true)}
            className="flex items-center justify-center gap-1.5 py-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <span>+ Log a past event</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}

      {/* ── Recent Activity ─────────────────────────────────────── */}
      <RecentActivity items={activity} />

      {/* ── Upcoming Reminders ──────────────────────────────────── */}
      {baby && <UpcomingReminders babyId={baby.id} />}

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showFeedLog && baby && (
        <FeedLogModal
          babyId={baby.id}
          onLogged={onFeedLogged}
          onClose={() => setShowFeedLog(false)}
        />
      )}
      {showPastLog && baby && (
        <LogPastEventModal
          babyId={baby.id}
          onLogged={loadLogs}
          onClose={() => setShowPastLog(false)}
        />
      )}
      {showWeightLog && baby && (
        <WeightLogModal
          babyId={baby.id}
          babyName={baby.name}
          onSaved={loadLogs}
          onClose={() => setShowWeightLog(false)}
        />
      )}

    </div>
  )
}
