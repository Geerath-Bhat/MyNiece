import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, Droplets, Calendar, Scale } from 'lucide-react'
import { InsightCard } from '@/components/ui/InsightCard'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { analyticsApi } from '@/api/analytics'
import type { FeedingAnalytics, DiaperAnalytics, WeeklySummary } from '@/api/analytics'
import { useBaby } from '@/hooks/useBaby'
import { format } from 'date-fns'

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="glass p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { baby } = useBaby()
  const [feeding, setFeeding] = useState<FeedingAnalytics | null>(null)
  const [diapers, setDiapers] = useState<DiaperAnalytics | null>(null)
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!baby) return
    Promise.all([
      analyticsApi.feeding(baby.id, 7),
      analyticsApi.diapers(baby.id, 7),
      analyticsApi.weekly(baby.id),
    ]).then(([f, d, w]) => {
      setFeeding(f); setDiapers(d); setWeekly(w)
    }).finally(() => setLoading(false))
  }, [baby])

  if (loading) return (
    <div className="flex justify-center mt-20">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )

  const feedChartData = feeding?.feeds.map(f => ({
    date: format(new Date(f.date), 'EEE'),
    feeds: f.count,
  })) ?? []

  const diaperChartData = diapers?.by_day.map(d => ({
    date: format(new Date(d.date), 'EEE'),
    wet: d.wet, dirty: d.dirty, both: d.both,
  })) ?? []

  const pieData = diaperChartData.length
    ? [
      { name: 'Wet', value: diapers!.by_day.reduce((s, d) => s + d.wet, 0) },
      { name: 'Dirty', value: diapers!.by_day.reduce((s, d) => s + d.dirty, 0) },
      { name: 'Both', value: diapers!.by_day.reduce((s, d) => s + d.both, 0) },
    ].filter(d => d.value > 0)
    : []

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-white slide-up">Analytics</h1>

      {/* AI Insight */}
      {baby && <InsightCard babyId={baby.id} />}

      {/* Weekly summary stats */}
      <div className="grid grid-cols-2 gap-3 slide-up-1">
        <StatCard label="Total Feeds" value={String(weekly?.total_feeds ?? 0)}
          sub="this week" icon={TrendingUp} color="text-indigo-400" />
        <StatCard label="Total Diapers" value={String(weekly?.total_diapers ?? 0)}
          sub="this week" icon={Droplets} color="text-cyan-400" />
        <StatCard
          label="Avg Feed Interval"
          value={weekly?.avg_feeding_interval_hours ? `${weekly.avg_feeding_interval_hours.toFixed(1)}h` : '—'}
          sub="this week" icon={Calendar} color="text-amber-400"
        />
        <StatCard
          label="Last Weight"
          value={weekly?.last_weight_kg ? `${weekly.last_weight_kg}kg` : '—'}
          sub={weekly?.weight_change_kg != null
            ? `${weekly.weight_change_kg >= 0 ? '+' : ''}${weekly.weight_change_kg.toFixed(2)}kg`
            : undefined}
          icon={Scale} color="text-emerald-400"
        />
      </div>

      {/* Charts — stack on mobile, 2-col on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feeding timeline */}
        <div className="glass p-4 slide-up-2">
          <p className="text-sm font-medium text-slate-300 mb-3">Feeding Timeline (7 days)</p>
          {feedChartData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No feeding data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={feedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }} />
                <Line type="monotone" dataKey="feeds" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Diaper bar chart */}
        <div className="glass p-4 slide-up-3">
          <p className="text-sm font-medium text-slate-300 mb-3">Diaper Changes (7 days)</p>
          {diaperChartData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No diaper data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={diaperChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }} />
                <Bar dataKey="wet" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="dirty" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="both" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Diaper type pie */}
        {pieData.length > 0 && (
          <div className="glass p-4 slide-up-4 lg:col-span-2">
            <p className="text-sm font-medium text-slate-300 mb-3">Diaper Breakdown</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
