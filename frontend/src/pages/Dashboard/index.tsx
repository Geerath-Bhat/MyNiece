import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { NextFeedCard } from './NextFeedCard'
import { QuickActions } from './QuickActions'
import { TodaySummary } from './TodaySummary'
import { RecentActivity } from './RecentActivity'
import type { ActivityItem } from './RecentActivity'

// ── Demo data shown until backend is wired in Milestone 2 ──────
const DEMO_LAST_FED = new Date(Date.now() - 90 * 60_000)   // 90 min ago

const DEMO_ACTIVITY: ActivityItem[] = [
  { id: '1', type: 'feed',   label: 'Fed baby',            timestamp: DEMO_LAST_FED },
  { id: '2', type: 'diaper', label: 'Diaper change',       timestamp: new Date(Date.now() - 3 * 60 * 60_000), note: 'Wet' },
  { id: '3', type: 'feed',   label: 'Fed baby',            timestamp: new Date(Date.now() - 4 * 60 * 60_000) },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [activity, setActivity] = useState<ActivityItem[]>(DEMO_ACTIVITY)
  const [feedCount, setFeedCount] = useState(2)
  const [diaperCount, setDiaperCount] = useState(1)
  const [lastFedAt, setLastFedAt] = useState<Date>(DEMO_LAST_FED)

  function logFeed() {
    const now = new Date()
    setLastFedAt(now)
    setFeedCount((c) => c + 1)
    setActivity((prev) => [
      { id: String(Date.now()), type: 'feed', label: 'Fed baby', timestamp: now },
      ...prev,
    ])
  }

  function logDiaper() {
    const now = new Date()
    setDiaperCount((c) => c + 1)
    setActivity((prev) => [
      { id: String(Date.now()), type: 'diaper', label: 'Diaper change', timestamp: now },
      ...prev,
    ])
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between slide-up">
        <div>
          <p className="text-slate-400 text-sm">{getGreeting()},</p>
          <h1 className="text-2xl font-bold gradient-text leading-tight">
            {user?.display_name.split(' ')[0] ?? 'Parent'}
          </h1>
        </div>
        <button className="glass w-10 h-10 flex items-center justify-center rounded-xl relative">
          <Bell className="w-5 h-5 text-slate-300" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full" />
        </button>
      </div>

      <NextFeedCard lastFedAt={lastFedAt} intervalMinutes={150} onLogFeed={logFeed} />
      <QuickActions onFeed={logFeed} onDiaper={logDiaper} onVitaminD={() => {}} onExercise={() => {}} />
      <TodaySummary feedCount={feedCount} diaperCount={diaperCount} vitaminDDone={false} />
      <RecentActivity items={activity} />
    </div>
  )
}
