import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBaby } from '@/hooks/useBaby'
import { useNextFeed } from '@/hooks/useNextFeed'
import { logsApi } from '@/api/logs'
import type { ActivityLog } from '@/api/logs'
import BabySetup from '@/pages/BabySetup'
import { NextFeedCard } from './NextFeedCard'
import { QuickActions } from './QuickActions'
import { TodaySummary } from './TodaySummary'
import { RecentActivity } from './RecentActivity'
import type { ActivityItem } from './RecentActivity'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function toActivityItem(log: ActivityLog): ActivityItem {
  return {
    id: log.id,
    type: log.type as ActivityItem['type'],
    label: log.type === 'feed' ? 'Fed baby'
      : log.type === 'diaper' ? `Diaper change${log.diaper_type ? ` (${log.diaper_type})` : ''}`
      : log.custom_label ?? 'Custom',
    timestamp: new Date(log.timestamp),
    note: log.notes ?? undefined,
  }
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const { baby, loading: babyLoading, noBaby, } = useBaby()
  const { lastFedAt, nextDueAt, optimisticFeed } = useNextFeed(baby?.id ?? null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [feedCount, setFeedCount] = useState(0)
  const [diaperCount, setDiaperCount] = useState(0)
  const [setupDone, setSetupDone] = useState(false)

  // Load today's summary + recent logs
  useEffect(() => {
    if (!baby) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    logsApi.list(baby.id, { limit: 10 }).then(page => {
      setActivity(page.items.map(toActivityItem))
      const todayLogs = page.items.filter(l => new Date(l.timestamp) >= today)
      setFeedCount(todayLogs.filter(l => l.type === 'feed').length)
      setDiaperCount(todayLogs.filter(l => l.type === 'diaper').length)
    }).catch(() => {})
  }, [baby, setupDone])

  async function logFeed() {
    if (!baby) return
    await logsApi.create({ baby_id: baby.id, type: 'feed' })
    optimisticFeed()
    setFeedCount(c => c + 1)
    setActivity(prev => [
      { id: String(Date.now()), type: 'feed', label: 'Fed baby', timestamp: new Date() },
      ...prev,
    ])
  }

  async function logDiaper(dtype?: string) {
    if (!baby) return
    await logsApi.create({ baby_id: baby.id, type: 'diaper', diaper_type: dtype || 'wet' })
    setDiaperCount(c => c + 1)
    setActivity(prev => [
      { id: String(Date.now()), type: 'diaper', label: `Diaper change (${dtype || 'wet'})`, timestamp: new Date() },
      ...prev,
    ])
  }

  if (babyLoading) {
    return <div className="flex items-center justify-center mt-32"><span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (noBaby && !setupDone) {
    return <BabySetup onCreated={() => setSetupDone(true)} />
  }

  // Calculate interval from nextDueAt - lastFedAt
  const intervalMinutes = (lastFedAt && nextDueAt)
    ? Math.round((nextDueAt.getTime() - lastFedAt.getTime()) / 60_000)
    : 150

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between slide-up">
        <div>
          <p className="text-slate-400 text-sm">{getGreeting()},</p>
          <h1 className="text-2xl font-bold gradient-text leading-tight">
            {user?.display_name.split(' ')[0] ?? 'Parent'}
          </h1>
          {baby && <p className="text-xs text-slate-500 mt-0.5">{baby.name}'s tracker</p>}
        </div>
        <button className="glass w-10 h-10 flex items-center justify-center rounded-xl relative">
          <Bell className="w-5 h-5 text-slate-300" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full" />
        </button>
      </div>

      {/* On wide screens: feed card + quick actions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 slide-up-1">
        <NextFeedCard
          lastFedAt={lastFedAt ?? undefined}
          intervalMinutes={intervalMinutes}
          onLogFeed={logFeed}
        />
        <div className="flex flex-col gap-4">
          <QuickActions
            onFeed={logFeed}
            onDiaper={() => logDiaper('wet')}
            onVitaminD={() => logsApi.create({ baby_id: baby!.id, type: 'custom', custom_label: 'Vitamin D' })}
            onExercise={() => logsApi.create({ baby_id: baby!.id, type: 'custom', custom_label: 'Pre-feed exercise' })}
          />
          <TodaySummary feedCount={feedCount} diaperCount={diaperCount} vitaminDDone={false} />
        </div>
      </div>

      <RecentActivity items={activity} />
    </div>
  )
}
