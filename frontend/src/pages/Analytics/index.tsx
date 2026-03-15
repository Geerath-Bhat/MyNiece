import { useState, useEffect, useMemo } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { Loader2, TrendingUp, TrendingDown, Droplets, Clock, Scale, Moon, Wallet, Minus } from 'lucide-react'
import { InsightCard } from '@/components/ui/InsightCard'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell,
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

const COLORS = ['#7c3aed', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
const CAT_COLORS: Record<string, string> = {
  diapers: '#7c3aed', medicine: '#ec4899', products: '#06b6d4', doctor: '#10b981', other: '#f59e0b',
}

// ── Trend badge ───────────────────────────────────────────────────
function Trend({ value, unit = '' }: { value: number | null | undefined; unit?: string }) {
  if (value == null) return null
  const up = value > 0
  const zero = value === 0
  const Icon = zero ? Minus : up ? TrendingUp : TrendingDown
  const color = zero ? 'text-slate-500' : up ? 'text-emerald-400' : 'text-red-400'
  const label = `${up ? '+' : ''}${value.toFixed(2)}${unit}`
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, trend, trendUnit, icon: Icon, color, gradient, accentColor }: {
  label: string
  value: string
  sub?: string
  trend?: number | null
  trendUnit?: string
  icon: React.ElementType
  color: string
  gradient: string
  accentColor: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: gradient, border: `1px solid ${accentColor}40` }}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}66)`, opacity: 0.9 }} />
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('400', '400/15')}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold leading-tight" style={{ color: accentColor }}>{value}</p>
      <div className="flex items-center justify-between">
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
        {trend !== undefined && <Trend value={trend} unit={trendUnit} />}
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────
function SectionHeader({ icon: Icon, color, title, sub }: {
  icon: React.ElementType; color: string; title: string; sub?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('400', '400/15')}`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

// Custom dot for area chart — uses CSS variable so it matches the page bg in both themes
function GlowDot(props: { cx?: number; cy?: number; stroke?: string }) {
  const { cx = 0, cy = 0, stroke = '#7c3aed' } = props
  return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="var(--color-bg)" strokeWidth={2} />
}

export default function AnalyticsPage() {
  const { baby } = useBaby()
  const theme = useThemeStore(s => s.theme)
  const tooltipStyle = useMemo(() => ({
    background: theme === 'dark' ? '#120f22' : '#ffffff',
    border: '1px solid rgba(167,139,250,0.25)',
    borderRadius: 12,
    color: theme === 'dark' ? '#f1f5f9' : '#2d1a6e',
    fontSize: 12,
    padding: '8px 12px',
  }), [theme])
  const dotStroke = theme === 'dark' ? '#0d0b18' : '#f0ebff'
  const gridStroke = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(124,58,237,0.08)'
  const axisColor  = theme === 'dark' ? '#64748b' : '#7b68b0'
  const [feeding, setFeeding] = useState<FeedingAnalytics | null>(null)
  const [diapers, setDiapers] = useState<DiaperAnalytics | null>(null)
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([])
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!baby) return
    const currentMonth = format(new Date(), 'yyyy-MM')
    Promise.all([
      analyticsApi.feeding(baby.id, 7),
      analyticsApi.diapers(baby.id, 7),
      analyticsApi.weekly(baby.id),
      babiesApi.listWeight(baby.id),
      sleepApi.list(baby.id, { limit: 14 }),
      expensesApi.summary(baby.id, currentMonth),
    ]).then(([f, d, w, wts, slp, exp]) => {
      setFeeding(f); setDiapers(d); setWeekly(w)
      setWeights(wts)
      setSleepSessions(slp.items)
      setExpenseSummary(exp)
    }).finally(() => setLoading(false))
  }, [baby])

  if (loading) return (
    <div className="flex justify-center mt-20">
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
    </div>
  )

  const feedChartData = feeding?.feeds.map(f => ({
    date: format(parseUTC(f.date), 'EEE'),
    feeds: f.count,
  })) ?? []

  const diaperChartData = diapers?.by_day.map(d => ({
    date: format(parseUTC(d.date), 'EEE'),
    wet: d.wet, dirty: d.dirty, both: d.both,
  })) ?? []

  const pieData = diaperChartData.length
    ? [
      { name: 'Wet',   value: diapers!.by_day.reduce((s, d) => s + d.wet,   0) },
      { name: 'Dirty', value: diapers!.by_day.reduce((s, d) => s + d.dirty, 0) },
      { name: 'Both',  value: diapers!.by_day.reduce((s, d) => s + d.both,  0) },
    ].filter(d => d.value > 0)
    : []

  const weightChartData = weights.slice(0, 10).reverse().map(w => ({
    date: format(parseUTC(w.date), 'dd MMM'),
    kg: w.weight_kg,
  }))

  const sleepChartData = (() => {
    const byDate: Record<string, number> = {}
    sleepSessions.filter(s => s.duration_minutes && s.ended_at).forEach(s => {
      const d = format(parseUTC(s.started_at), 'EEE')
      byDate[d] = (byDate[d] ?? 0) + (s.duration_minutes! / 60)
    })
    return Object.entries(byDate).map(([date, hours]) => ({ date, hours: +hours.toFixed(1) }))
  })()

  const expensePieData = expenseSummary
    ? Object.entries(expenseSummary.by_category).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : []

  const totalSleep = sleepSessions
    .filter(s => s.duration_minutes)
    .reduce((sum, s) => sum + s.duration_minutes!, 0)
  const avgSleepHours = sleepSessions.length ? (totalSleep / sleepSessions.length / 60).toFixed(1) : null

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-white slide-up">Analytics</h1>

      {baby && <InsightCard babyId={baby.id} />}

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 slide-up-1">
        <StatCard
          label="Feeds this week" value={String(weekly?.total_feeds ?? 0)}
          sub="total sessions" icon={TrendingUp} color="text-violet-400"
          gradient="linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 100%)"
          accentColor="#7c3aed"
        />
        <StatCard
          label="Diapers this week" value={String(weekly?.total_diapers ?? 0)}
          sub="total changes" icon={Droplets} color="text-cyan-400"
          gradient="linear-gradient(135deg, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.06) 100%)"
          accentColor="#06b6d4"
        />
        <StatCard
          label="Avg feed interval"
          value={weekly?.avg_feeding_interval_hours ? `${weekly.avg_feeding_interval_hours.toFixed(1)}h` : '—'}
          sub="this week" icon={Clock} color="text-fuchsia-400"
          gradient="linear-gradient(135deg, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0.06) 100%)"
          accentColor="#ec4899"
        />
        <StatCard
          label="Last weight"
          value={weights[0] ? `${weights[0].weight_kg}kg` : '—'}
          trend={weekly?.weight_change_kg ?? null} trendUnit="kg"
          icon={Scale} color="text-emerald-400"
          gradient="linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 100%)"
          accentColor="#10b981"
        />
      </div>

      {/* ── Feeding trend ───────────────────────────────────────────── */}
      <div className="glass-hero p-4 slide-up-2">
        <SectionHeader icon={TrendingUp} color="text-violet-400" title="Feeding Trend" sub="Last 7 days" />
        {feedChartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No feeding data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={feedChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(124,58,237,0.3)', strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="feeds" stroke="#7c3aed" strokeWidth={2.5}
                fill="url(#feedGrad)" dot={<GlowDot stroke="#7c3aed" />}
                activeDot={{ r: 6, fill: '#7c3aed', stroke: dotStroke, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Diapers ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4">
        <div className="glass-hero p-4 slide-up-3">
          <SectionHeader icon={Droplets} color="text-cyan-400" title="Diaper Changes" sub="Last 7 days by type" />
          {diaperChartData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No diaper data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={diaperChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="wetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="dirtyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="bothGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="wet" name="Wet" stackId="a" fill="url(#wetGrad)" />
                <Bar dataKey="dirty" name="Dirty" stackId="a" fill="url(#dirtyGrad)" />
                <Bar dataKey="both" name="Both" stackId="a" fill="url(#bothGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Diaper type breakdown pills */}
          {pieData.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ background: `${COLORS[i]}22`, border: `1px solid ${COLORS[i]}44` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-xs text-slate-300">{d.name}</span>
                  <span className="text-xs font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sleep ───────────────────────────────────────────────────── */}
      <div className="glass-hero p-4 slide-up-4">
        <SectionHeader icon={Moon} color="text-indigo-400" title="Sleep Duration"
          sub={avgSleepHours ? `avg ${avgSleepHours}h per session` : 'Last 14 days'} />
        {sleepChartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No sleep sessions recorded yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sleepChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip
                formatter={(v: unknown) => [`${v}h`, 'Sleep']}
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="hours" fill="url(#sleepGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Expenses ────────────────────────────────────────────────── */}
      {(expensePieData.length > 0 || expenseSummary) && (
        <div className="glass-hero p-4 slide-up-4">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Wallet} color="text-amber-400" title="Expenses"
              sub={format(new Date(), 'MMMM yyyy')} />
            {expenseSummary?.total != null && (
              <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>₹{expenseSummary.total.toFixed(0)}</p>
            )}
          </div>
          {expensePieData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No expenses this month</p>
          ) : (
            <div className="flex gap-4 items-center">
              <div className="shrink-0">
                <PieChart width={130} height={130}>
                  <Pie data={expensePieData} cx={60} cy={60} innerRadius={38} outerRadius={58}
                    dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {expensePieData.map((entry, i) => (
                      <Cell key={i} fill={CAT_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `₹${Number(v).toFixed(0)}`} />
                </PieChart>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                {expensePieData.map((entry, i) => {
                  const color = CAT_COLORS[entry.name] ?? COLORS[i % COLORS.length]
                  const pct = expenseSummary?.total ? ((entry.value / expenseSummary.total) * 100).toFixed(0) : 0
                  return (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs text-slate-400 flex-1 capitalize">{entry.name}</span>
                      <span className="text-xs text-slate-500">{pct}%</span>
                      <span className="text-xs font-semibold text-white">₹{entry.value.toFixed(0)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Weight trend ─────────────────────────────────────────────── */}
      <div className="glass-hero p-4 flex flex-col gap-3 slide-up-5">
        <div className="flex items-center justify-between">
          <SectionHeader icon={Scale} color="text-emerald-400" title="Weight Trend" />
          <span className="text-xs text-slate-500 -mt-3">Log from Dashboard → Weight</span>
        </div>

        {weightChartData.length > 0 && (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={weightChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" domain={['auto', 'auto']} />
              <Tooltip formatter={(v: unknown) => [`${v}kg`, 'Weight']} contentStyle={tooltipStyle}
                cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2.5}
                fill="url(#weightGrad)" dot={<GlowDot stroke="#10b981" />}
                activeDot={{ r: 6, fill: '#10b981', stroke: dotStroke, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {weights.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-2">No weight entries yet</p>
        ) : (
          <div className="flex flex-col gap-1">
            {weights.slice(0, 4).map(w => (
              <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm font-bold" style={{ color: '#10b981' }}>{w.weight_kg} kg</span>
                  {w.note && <span className="text-xs text-slate-500 ml-2">{w.note}</span>}
                </div>
                <span className="text-xs text-slate-500">{format(parseUTC(w.date), 'dd MMM yyyy')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
