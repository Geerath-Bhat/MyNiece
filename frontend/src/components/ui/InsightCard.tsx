import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { insightsApi } from '@/api/insights'
import type { WeeklyInsight } from '@/api/insights'
import { formatDistanceToNow } from 'date-fns'

export function InsightCard({ babyId }: { babyId: string }) {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    insightsApi.get(babyId)
      .then(setInsight)
      .catch(() => setInsight(null))
      .finally(() => setLoading(false))
  }, [babyId])

  if (loading) {
    return (
      <div className="glass-strong p-4 slide-up animate-pulse">
        <div className="h-3 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-3 bg-white/10 rounded w-full mb-2" />
        <div className="h-3 bg-white/10 rounded w-4/5" />
      </div>
    )
  }

  if (!insight) {
    return (
      <div className="glass p-4 slide-up flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Check back after a few days of logging — your first AI insight is on its way.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-hero p-4 slide-up">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Insight</p>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed">{insight.insight_text}</p>
      <p className="text-xs text-slate-400 mt-2">
        Updated {formatDistanceToNow(new Date(insight.generated_at), { addSuffix: true })}
      </p>
    </div>
  )
}
