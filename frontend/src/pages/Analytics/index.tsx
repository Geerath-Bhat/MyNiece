import { useState, useEffect, useMemo } from 'react'
import { useThemeStore } from '@/store/themeStore'
import {
  Loader2, TrendingUp, TrendingDown, Droplets, Clock,
  Scale, Moon, Wallet, Minus, Milk, Timer, Zap, BarChart2, PieChart as PieIcon, Activity,
} from 'lucide-react'
import { InsightCard } from '@/components/ui/InsightCard'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell,
  ComposedChart, Line,
} from 'recharts'
import { analyticsApi } from '@/api/analytics'
import type { FeedingAnalytics, DiaperAnalytics, WeeklySummary } from '@/api/analytics'
import { babiesApi } from '@/api/babies'
import type { WeightLog } from '@/api/babies'
import { sleepApi } from '@/api/sleep'
import type { SleepSession } from '@/api/sleep'
import { expensesApi } from '@/api/expenses'
import type { ExpenseSummary } from '@/api/expenses'
import { useBaby } from '@/hooks/useBaby'
import { format } from 'date-fns'
import { parseUTC } from '@/utils/dates'

// ── Constants ─────────────────────────────────────────────────────
const COLORS = ['#7c3aed', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
const CAT_COLORS: Record<string, string> = {
  diapers: '#7c3aed', medicine: '#ec4899', products: '#06b6d4',
  doctor: '#10b981', other: '#f59e0b', formula: '#a855f7',
}
const FEED_TYPE_COLORS: Record<string, string> = {
  breast_left: '#a855f7', breast_right: '#ec4899',
  both_breasts: '#7c3aed', bottle: '#06b6d4',
}
const FEED_TYPE_LABELS: Record<string, string> = {
  breast_left: '🤱 Left', breast_right: '🤱 Right',
  both_breasts: '🤱 Both', bottle: '🍼 Bottle',
}

// ── Trend badge ───────────────────────────────────────────────────
function Trend({ value, unit = '' }: { value: number | null | undefined; unit?: string }) {
  if (value == null) return null
  const up = value > 0
  const zero = value === 0
  const Icon = zero ? Minus : up ? TrendingUp : TrendingDown
  const color = zero ? 'text-slate-500' : up ? 'text-emerald-400' : 'text-red-400'
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{up ? '+' : ''}{value.toFixed(1)}{unit}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, trend, trendUnit, icon: Icon, accentColor, gradient }: {
  label: string; value: string; sub?: string; trend?: number | null; trendUnit?: string
  icon: React.ElementType; accentColor: string; gradient: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-3.5 flex flex-col gap-1.5"
      style={{ background: gradient, border: `1px solid ${accentColor}35` }}>
      <div className="absolute top-0 left-0 right-0 h-[2.5px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 font-medium leading-tight">{label}</p>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}18` }}>
          <Icon className="w-3 h-3" style={{ color: accentColor }} />
        </div>
      </div>
      <p className="text-xl font-bold leading-none" style={{ color: accentColor }}>{value}</p>
      <div className="flex items-center justify-between">
        {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
        {trend !== undefined && <Trend value={trend} unit={trendUnit} />}
      </div>
    </div>
  )
}

// ── Chart glow dot ────────────────────────────────────────────────
function GlowDot(props: { cx?: number; cy?: number; stroke?: string }) {
  const { cx = 0, cy = 0, stroke = '#7c3aed' } = props
  return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
}

// ── Donut label ───────────────────────────────────────────────────
function DonutCenter({ cx, cy, value, label, theme = 'dark' }: { cx?: number; cy?: number; value: string; label: string; theme?: string }) {
  const valueFill = theme === 'dark' ? '#f1f5f9' : '#2d1a6e'
  const labelFill = theme === 'dark' ? '#64748b' : '#7c3aed'
  return (
    <g>
      <text x={cx} y={(cy ?? 0) - 6} textAnchor="middle" fill={valueFill} fontSize={16} fontWeight={700}>{value}</text>
      <text x={cx} y={(cy ?? 0) + 11} textAnchor="middle" fill={labelFill} fontSize={10}>{label}</text>
    </g>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────
function FeedHeatmap({ heatmap, theme = 'dark' }: { heatmap: { hour: number; day_of_week: number; count: number }[]; theme?: string }) {
  const emptyCell = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(124,58,237,0.08)'
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxCount = Math.max(...heatmap.map(p => p.count), 1)
  const grid: Record<string, number> = {}
  heatmap.forEach(p => { grid[`${p.day_of_week}-${p.hour}`] = p.count })
  const hourLabels = [0, 4, 8, 12, 16, 20]

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex gap-0.5 ml-7 mb-0.5">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center" style={{ minWidth: 9 }}>
            {hourLabels.includes(h) && (
              <span className="text-[8px] text-slate-600">
                {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </span>
            )}
          </div>
        ))}
      </div>
      {DAYS.map((day, di) => (
        <div key={day} className="flex items-center gap-0.5">
          <span className="text-[9px] text-slate-600 w-6 shrink-0">{day}</span>
          {Array.from({ length: 24 }, (_, h) => {
            const count = grid[`${di}-${h}`] ?? 0
            const intensity = count / maxCount
            return (
              <div key={h} className="flex-1 rounded-[2px] transition-all"
                title={count ? `${count} feed${count > 1 ? 's' : ''} at ${h}:00 ${day}` : ''}
                style={{
                  height: 11,
                  minWidth: 9,
                  background: count === 0
                    ? emptyCell
                    : `rgba(124,58,237,${0.15 + intensity * 0.78})`,
                }} />
            )
          })}
        </div>
      ))}
      <div className="flex items-center gap-1.5 mt-1 ml-7">
        <span className="text-[9px] text-slate-600">Less</span>
        {[0.04, 0.25, 0.5, 0.75, 1].map(v => (
          <div key={v} className="w-2.5 h-2.5 rounded-[2px]"
            style={{ background: v < 0.1 ? emptyCell : `rgba(124,58,237,${0.15 + v * 0.78})` }} />
        ))}
        <span className="text-[9px] text-slate-600">More</span>
      </div>
    </div>
  )
}

// ── Range selector ────────────────────────────────────────────────
function RangeSelector({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-xl p-1 shrink-0">
      {[7, 14, 30].map(d => (
        <button key={d} onClick={() => onChange(d)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            value === d ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}>
          {d}d
        </button>
      ))}
    </div>
  )
}

// ── Chart tabs ────────────────────────────────────────────────────
const CHART_TABS = [
  { id: 'feeds',   label: 'Feeds',   icon: Milk,     activeClass: 'bg-violet-600 shadow-violet-500/25' },
  { id: 'sleep',   label: 'Sleep',   icon: Moon,     activeClass: 'bg-indigo-600 shadow-indigo-500/25' },
  { id: 'diapers', label: 'Diapers', icon: Droplets, activeClass: 'bg-cyan-600 shadow-cyan-500/25' },
  { id: 'more',    label: 'More',    icon: Scale,    activeClass: 'bg-emerald-600 shadow-emerald-500/25' },
] as const
type ChartTab = typeof CHART_TABS[number]['id']

// ── Main page ─────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { baby } = useBaby()
  const theme = useThemeStore(s => s.theme)
  const [days, setDays] = useState(7)
  const [chartTab, setChartTab] = useState<ChartTab>('feeds')

  const tooltipStyle = useMemo(() => ({
    background: theme === 'dark' ? '#13101f' : '#ffffff',
    border: '1px solid rgba(167,139,250,0.2)',
    borderRadius: 10,
    color: theme === 'dark' ? '#f1f5f9' : '#2d1a6e',
    fontSize: 12,
    padding: '8px 12px',
  }), [theme])
  const gridStroke = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(124,58,237,0.15)'
  const axisColor  = theme === 'dark' ? '#475569' : '#6d28d9'

  const [feeding, setFeeding] = useState<FeedingAnalytics | null>(null)
  const [diapers, setDiapers] = useState<DiaperAnalytics | null>(null)
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([])
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null)
  const [heatmap, setHeatmap] = useState<{ hour: number; day_of_week: number; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!baby) return
    setLoading(true)
    const currentMonth = format(new Date(), 'yyyy-MM')
    Promise.all([
      analyticsApi.feeding(baby.id, days),
      analyticsApi.diapers(baby.id, days),
      analyticsApi.weekly(baby.id),
      babiesApi.listWeight(baby.id),
      sleepApi.list(baby.id, { limit: days * 3 }),
      expensesApi.summary(baby.id, currentMonth),
      analyticsApi.heatmap(baby.id, Math.max(days, 14), 'feed'),
    ]).then(([f, d, w, wts, slp, exp, hm]) => {
      setFeeding(f); setDiapers(d); setWeekly(w)
      setWeights(wts); setSleepSessions(slp.items)
      setExpenseSummary(exp); setHeatmap(hm.heatmap)
    }).finally(() => setLoading(false))
  }, [baby, days])

  if (loading) return (
    <div className="flex justify-center mt-20">
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
    </div>
  )

  // ── Derived chart data ─────────────────────────────────────────
  const dateFmt = days <= 7 ? 'EEE' : 'dd MMM'

  const feedChartData = feeding?.feeds.map(f => ({
    date: format(parseUTC(f.date), dateFmt),
    feeds: f.count,
    duration: f.avg_duration_minutes ? +f.avg_duration_minutes.toFixed(1) : null,
  })) ?? []

  const feedTypePie = Object.entries(feeding?.feed_type_counts ?? {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ key: k, name: FEED_TYPE_LABELS[k] ?? k, value: v }))

  const diaperChartData = diapers?.by_day.map(d => ({
    date: format(parseUTC(d.date), dateFmt),
    wet: d.wet, dirty: d.dirty, both: d.both,
  })) ?? []

  const diaperPieParts = [
    { name: 'Wet',   value: diapers?.by_day.reduce((s, d) => s + d.wet,   0) ?? 0 },
    { name: 'Dirty', value: diapers?.by_day.reduce((s, d) => s + d.dirty, 0) ?? 0 },
    { name: 'Both',  value: diapers?.by_day.reduce((s, d) => s + d.both,  0) ?? 0 },
  ].filter(d => d.value > 0)
  const totalDiapers = diaperPieParts.reduce((s, d) => s + d.value, 0)

  const weightChartData = weights.slice(0, 10).reverse().map(w => ({
    date: format(parseUTC(w.date), 'dd MMM'), kg: w.weight_kg,
  }))

  const sleepChartData = (() => {
    const byDate: Record<string, number> = {}
    sleepSessions.filter(s => s.duration_minutes && s.ended_at).forEach(s => {
      const d = format(parseUTC(s.started_at), dateFmt)
      byDate[d] = (byDate[d] ?? 0) + (s.duration_minutes! / 60)
    })
    return Object.entries(byDate).map(([date, hours]) => ({ date, hours: +hours.toFixed(1) }))
  })()

  const expensePieData = expenseSummary
    ? Object.entries(expenseSummary.by_category).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : []

  const totalSleepMins = sleepSessions.filter(s => s.duration_minutes).reduce((s, x) => s + x.duration_minutes!, 0)
  const avgSleepH = sleepSessions.length ? (totalSleepMins / sleepSessions.length / 60).toFixed(1) : '—'
  const avgFeedDur = weekly?.avg_feed_duration_minutes
  const feedTotal = feedTypePie.reduce((s, e) => s + e.value, 0)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <RangeSelector value={days} onChange={setDays} />
      </div>

      {/* ── AI Insight ──────────────────────────────────────────── */}
      {baby && <InsightCard babyId={baby.id} />}

      {/* ── Stat cards — 2×2 ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 slide-up-1">
        <StatCard label="Feeds this week" value={String(weekly?.total_feeds ?? 0)}
          sub="total sessions" icon={Milk}
          gradient="linear-gradient(135deg,rgba(124,58,237,0.18),rgba(124,58,237,0.05))"
          accentColor="#7c3aed" />
        <StatCard label="Avg duration" value={avgFeedDur ? `${Math.round(avgFeedDur)}m` : '—'}
          sub="per feed session" icon={Timer}
          gradient="linear-gradient(135deg,rgba(236,72,153,0.18),rgba(236,72,153,0.05))"
          accentColor="#ec4899" />
        <StatCard label="Feed interval" value={weekly?.avg_feeding_interval_hours ? `${weekly.avg_feeding_interval_hours.toFixed(1)}h` : '—'}
          sub="avg this week" icon={Clock}
          gradient="linear-gradient(135deg,rgba(14,165,233,0.18),rgba(14,165,233,0.05))"
          accentColor="#0ea5e9" />
        <StatCard label="Last weight" value={weights[0] ? `${weights[0].weight_kg}kg` : '—'}
          trend={weekly?.weight_change_kg ?? null} trendUnit="kg" icon={Scale}
          gradient="linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))"
          accentColor="#10b981" />
      </div>

      {/* ── Chart tab bar ────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 slide-up-2">
        {CHART_TABS.map(({ id, label, icon: Icon, activeClass }) => (
          <button key={id} onClick={() => setChartTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${
              chartTab === id
                ? `${activeClass} text-white shadow-lg`
                : 'text-slate-500 hover:text-slate-300'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* FEEDS TAB                                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {chartTab === 'feeds' && (
        <div className="flex flex-col gap-4 slide-up">

          {/* Feed count + duration — ComposedChart */}
          <div className="glass-hero p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Feed Trend</p>
                  <p className="text-xs text-slate-500">Count · avg duration per day</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(124,58,237,0.7)' }} />
                  <span className="text-[10px] text-slate-400">feeds</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 bg-fuchsia-400 rounded" />
                  <span className="text-[10px] text-slate-400">min</span>
                </div>
              </div>
            </div>
            {feedChartData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No feeding data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={feedChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="feedBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ec4899', fontSize: 10 }} axisLine={false} tickLine={false} unit="m" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(124,58,237,0.06)' }}
                    formatter={(v: unknown, name) => [
                      name === 'duration' ? `${v}m` : `${v} feeds`,
                      name === 'duration' ? 'Avg duration' : 'Feeds',
                    ]} />
                  <Bar yAxisId="left" dataKey="feeds" fill="url(#feedBarGrad)" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Line yAxisId="right" type="monotone" dataKey="duration" stroke="#ec4899" strokeWidth={2.5}
                    dot={<GlowDot stroke="#ec4899" />} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Feed type + heatmap — 2 panels */}
          {feedTypePie.length > 0 && (
            <div className="glass-hero p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
                  <PieIcon className="w-4 h-4 text-fuchsia-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Feed Type Breakdown</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Donut */}
                <div className="shrink-0">
                  <PieChart width={120} height={120}>
                    <Pie data={feedTypePie} cx={55} cy={55} innerRadius={34} outerRadius={54}
                      dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {feedTypePie.map(e => (
                        <Cell key={e.key} fill={FEED_TYPE_COLORS[e.key] ?? '#7c3aed'} />
                      ))}
                    </Pie>
                    <DonutCenter cx={55} cy={55} value={String(feedTotal)} label="sessions" theme={theme} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v} sessions`, '']} />
                  </PieChart>
                </div>
                {/* Legend rows */}
                <div className="flex flex-col gap-2 flex-1">
                  {feedTypePie.map(e => {
                    const pct = feedTotal ? Math.round((e.value / feedTotal) * 100) : 0
                    const color = FEED_TYPE_COLORS[e.key] ?? '#7c3aed'
                    const barW = `${pct}%`
                    return (
                      <div key={e.key}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-xs text-slate-300">{e.name}</span>
                          </div>
                          <span className="text-xs font-bold text-white">{e.value} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: barW, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Heatmap */}
          {heatmap.length > 0 && (
            <div className="glass-hero p-4">
              <div className="flex items-center gap-2.5 mb-0.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Feed Timing</p>
                  <p className="text-xs text-slate-500">When baby is typically fed (hour × day)</p>
                </div>
              </div>
              <div className="mb-4" />
              <FeedHeatmap heatmap={heatmap} theme={theme} />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SLEEP TAB                                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {chartTab === 'sleep' && (
        <div className="flex flex-col gap-4 slide-up">

          {/* Sleep mini stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sessions', value: String(sleepSessions.length), color: '#6366f1' },
              { label: 'Avg / session', value: `${avgSleepH}h`, color: '#7c3aed' },
              { label: 'Total hrs', value: totalSleepMins > 0 ? `${(totalSleepMins / 60).toFixed(1)}h` : '—', color: '#a855f7' },
            ].map(s => (
              <div key={s.label} className="glass-hero p-3 flex flex-col items-center gap-1 text-center">
                <p className="text-lg font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Sleep duration bar chart */}
          <div className="glass-hero p-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Moon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Sleep Duration</p>
                <p className="text-xs text-slate-500">Total hours by day · last {days} days</p>
              </div>
            </div>
            {sleepChartData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No sleep sessions recorded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={sleepChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                  <Tooltip formatter={(v: unknown) => [`${v}h`, 'Sleep']} contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Bar dataKey="hours" fill="url(#sleepGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent sessions list */}
          {sleepSessions.length > 0 && (
            <div className="glass-hero p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Recent Sessions</p>
              </div>
              <div className="flex flex-col gap-0">
                {sleepSessions.filter(s => s.ended_at).slice(0, 6).map(s => {
                  const hrs = s.duration_minutes ? (s.duration_minutes / 60).toFixed(1) : null
                  const qualityColor: Record<string, string> = {
                    good: '#10b981', fair: '#f59e0b', poor: '#ef4444',
                  }
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-slate-200">
                          {format(parseUTC(s.started_at), 'EEE dd MMM · HH:mm')}
                        </p>
                        {s.quality && (
                          <span className="text-[10px] font-semibold capitalize"
                            style={{ color: qualityColor[s.quality] ?? '#64748b' }}>
                            {s.quality}
                          </span>
                        )}
                      </div>
                      {hrs && (
                        <span className="text-sm font-bold" style={{ color: '#818cf8' }}>{hrs}h</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DIAPERS TAB                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {chartTab === 'diapers' && (
        <div className="flex flex-col gap-4 slide-up">

          {/* Diaper mini stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: String(totalDiapers), color: '#06b6d4' },
              { label: 'Wet',   value: String(diaperPieParts.find(d => d.name === 'Wet')?.value ?? 0),   color: '#0ea5e9' },
              { label: 'Dirty', value: String(diaperPieParts.find(d => d.name === 'Dirty')?.value ?? 0), color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="glass-hero p-3 flex flex-col items-center gap-1 text-center">
                <p className="text-lg font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Stacked bar chart */}
          <div className="glass-hero p-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Diaper Changes</p>
                <p className="text-xs text-slate-500">By type · last {days} days</p>
              </div>
            </div>
            {diaperChartData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No diaper data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={diaperChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="dirtyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="bothGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.05)' }} />
                  <Bar dataKey="wet"   name="Wet"   stackId="a" fill="url(#wetGrad)" />
                  <Bar dataKey="dirty" name="Dirty" stackId="a" fill="url(#dirtyGrad)" />
                  <Bar dataKey="both"  name="Both"  stackId="a" fill="url(#bothGrad)" radius={[5, 5, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Type breakdown donut */}
          {diaperPieParts.length > 0 && (
            <div className="glass-hero p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <PieIcon className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Type Breakdown</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <PieChart width={120} height={120}>
                    <Pie data={diaperPieParts} cx={55} cy={55} innerRadius={34} outerRadius={54}
                      dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {diaperPieParts.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <DonutCenter cx={55} cy={55} value={String(totalDiapers)} label="total" theme={theme} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  {diaperPieParts.map((d, i) => {
                    const pct = totalDiapers ? Math.round((d.value / totalDiapers) * 100) : 0
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                            <span className="text-xs text-slate-300">{d.name}</span>
                          </div>
                          <span className="text-xs font-bold text-white">{d.value} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MORE TAB (Growth + Expenses)                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {chartTab === 'more' && (
        <div className="flex flex-col gap-4 slide-up">

          {/* Weight trend */}
          <div className="glass-hero p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Weight Trend</p>
                  <p className="text-xs text-slate-500">All logged entries</p>
                </div>
              </div>
              {weights[0] && (
                <p className="text-xl font-bold" style={{ color: '#10b981' }}>{weights[0].weight_kg} kg</p>
              )}
            </div>
            {weightChartData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No weight entries yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weightChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => [`${v}kg`, 'Weight']} contentStyle={tooltipStyle}
                    cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#weightGrad)" dot={<GlowDot stroke="#10b981" />}
                    activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {weights.length > 0 && (
              <div className="flex flex-col gap-0 mt-3">
                {weights.slice(0, 3).map(w => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs font-semibold" style={{ color: '#10b981' }}>{w.weight_kg} kg</span>
                    <span className="text-xs text-slate-500">{format(parseUTC(w.date), 'dd MMM yyyy')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="glass-hero p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Expenses</p>
                  <p className="text-xs text-slate-500">{format(new Date(), 'MMMM yyyy')}</p>
                </div>
              </div>
              {expenseSummary?.total != null && (
                <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>₹{expenseSummary.total.toFixed(0)}</p>
              )}
            </div>
            {expensePieData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No expenses this month</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <PieChart width={120} height={120}>
                    <Pie data={expensePieData} cx={55} cy={55} innerRadius={34} outerRadius={54}
                      dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {expensePieData.map((entry, i) => (
                        <Cell key={i} fill={CAT_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <DonutCenter cx={55} cy={55}
                      value={`₹${(expenseSummary?.total ?? 0).toFixed(0)}`} label="total" theme={theme} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `₹${Number(v).toFixed(0)}`} />
                  </PieChart>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  {expensePieData.map((entry, i) => {
                    const color = CAT_COLORS[entry.name] ?? COLORS[i % COLORS.length]
                    const pct = expenseSummary?.total ? Math.round((entry.value / expenseSummary.total) * 100) : 0
                    return (
                      <div key={entry.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-xs text-slate-300 capitalize">{entry.name}</span>
                          </div>
                          <span className="text-xs font-bold text-white">₹{entry.value.toFixed(0)} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
