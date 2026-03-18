import { useState, useEffect } from 'react'
import { Plus, Loader2, Trash2, X, TrendingUp, Scale, Ruler, Circle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { parseUTC } from '@/utils/dates'
import { growthApi } from '@/api/growth'
import type { GrowthEntry } from '@/api/growth'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { toast } from '@/components/ui/Toast'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

// ── WHO Growth Standards (0–24 months) ──────────────────────────────────────

const WHO_WEIGHT_BOYS: [number, number, number][] = [
  [2.5,3.3,4.4],[3.4,4.5,5.8],[4.4,5.6,7.1],[5.1,6.4,7.9],[5.6,7.0,8.7],
  [6.0,7.5,9.3],[6.4,7.9,9.8],[6.7,8.3,10.3],[7.0,8.6,10.7],[7.2,8.9,11.0],
  [7.5,9.2,11.4],[7.7,9.4,11.7],[7.8,9.6,12.0],[8.0,9.9,12.3],[8.2,10.1,12.6],
  [8.4,10.3,12.8],[8.5,10.5,13.1],[8.7,10.7,13.4],[8.9,10.9,13.7],[9.0,11.1,13.9],
  [9.2,11.3,14.2],[9.4,11.5,14.5],[9.5,11.8,14.7],[9.7,12.0,15.0],[9.8,12.2,15.3],
]
const WHO_WEIGHT_GIRLS: [number, number, number][] = [
  [2.4,3.2,4.2],[3.2,4.2,5.5],[4.0,5.1,6.6],[4.7,5.8,7.5],[5.1,6.4,8.2],
  [5.5,6.9,8.8],[5.8,7.3,9.3],[6.1,7.6,9.8],[6.3,7.9,10.2],[6.6,8.2,10.5],
  [6.8,8.5,10.9],[7.0,8.7,11.2],[7.1,8.9,11.5],[7.3,9.2,11.8],[7.4,9.4,12.1],
  [7.6,9.6,12.4],[7.8,9.8,12.6],[7.9,10.0,12.9],[8.1,10.2,13.2],[8.2,10.4,13.5],
  [8.4,10.6,13.7],[8.6,10.9,14.0],[8.7,11.1,14.3],[8.9,11.3,14.6],[9.0,11.5,14.8],
]
const WHO_HEIGHT_BOYS: [number, number, number][] = [
  [46.1,49.9,53.7],[50.8,54.7,58.6],[54.4,58.4,62.4],[57.3,61.4,65.5],[59.7,63.9,68.0],
  [61.7,65.9,70.1],[63.3,67.6,71.9],[64.8,69.2,73.5],[66.2,70.6,75.0],[67.5,72.0,76.5],
  [68.7,73.3,77.9],[69.9,74.5,79.2],[71.0,75.7,80.5],[72.1,76.9,81.8],[73.1,78.0,83.0],
  [74.1,79.1,84.2],[75.0,80.2,85.4],[76.0,81.2,86.5],[76.9,82.3,87.7],[77.7,83.2,88.8],
  [78.6,84.2,89.8],[79.4,85.1,90.9],[80.2,86.0,91.9],[81.0,86.9,92.9],[81.7,87.8,93.9],
]
const WHO_HEIGHT_GIRLS: [number, number, number][] = [
  [45.4,49.1,52.9],[49.8,53.7,57.6],[53.0,57.1,61.1],[55.6,59.8,64.0],[57.8,62.1,66.4],
  [59.6,64.0,68.5],[61.2,65.7,70.3],[62.7,67.3,71.9],[64.0,68.7,73.5],[65.3,70.1,75.0],
  [66.5,71.5,76.4],[67.7,72.8,77.8],[68.9,74.0,79.2],[70.0,75.2,80.5],[71.0,76.4,81.7],
  [72.0,77.5,83.0],[73.0,78.6,84.2],[74.0,79.7,85.4],[74.9,80.7,86.5],[75.8,81.7,87.6],
  [76.7,82.7,88.7],[77.5,83.7,89.8],[78.4,84.6,90.8],[79.2,85.5,91.9],[80.0,86.4,92.9],
]

function ageMonths(dob: Date, entryDate: Date): number {
  return differenceInDays(entryDate, dob) / 30.44
}

function buildChartData(
  entries: GrowthEntry[],
  dob: Date,
  metric: 'weight' | 'height',
  gender: string,
) {
  const whoData = metric === 'weight'
    ? (gender === 'female' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS)
    : (gender === 'female' ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS)

  const whoPoints = whoData.map(([p3, p50, p97], month) => ({
    month, p3, p50, p97,
    bandBase: p3,
    bandRange: parseFloat((p97 - p3).toFixed(3)),
  }))

  const actualPoints = entries
    .filter(e => metric === 'weight' ? e.weight_kg : e.height_cm)
    .map(e => ({
      month: parseFloat(ageMonths(dob, parseUTC(e.date)).toFixed(1)),
      actual: metric === 'weight' ? e.weight_kg : e.height_cm,
    }))
    .sort((a, b) => a.month - b.month)

  const merged = whoPoints.map(pt => {
    const nearest = actualPoints.find(a => Math.abs(a.month - pt.month) < 0.75)
    return { ...pt, actual: nearest?.actual ?? null }
  })

  for (const a of actualPoints) {
    if (!merged.some(m => Math.abs(m.month - a.month) < 0.75)) {
      merged.push({ month: a.month, p3: 0, p50: 0, p97: 0, bandBase: 0, bandRange: 0, actual: a.actual })
    }
  }

  return merged.sort((a, b) => a.month - b.month)
}

// Estimate WHO percentile band for a value at a given age in months
function getPercentileLabel(value: number, ageM: number, metric: 'weight' | 'height', gender: string): string {
  const whoData = metric === 'weight'
    ? (gender === 'female' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS)
    : (gender === 'female' ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS)
  const idx = Math.min(Math.round(ageM), whoData.length - 1)
  if (idx < 0) return ''
  const [p3, p50, p97] = whoData[idx]
  if (value < p3) return 'Below P3'
  if (value < p50) return `P3–P50`
  if (value < p97) return `P50–P97`
  return 'Above P97'
}

const BLANK = { date: format(new Date(), 'yyyy-MM-dd'), weight_kg: '', height_cm: '', head_cm: '', note: '' }

export default function GrowthPage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
  const [entries, setEntries] = useState<GrowthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [tab, setTab] = useState<'weight' | 'height'>('weight')

  useEffect(() => {
    if (!baby) return
    growthApi.list(baby.id)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [baby])

  async function save() {
    if (!baby || !form.weight_kg) return
    setSaving(true)
    try {
      const entry = await growthApi.add(baby.id, {
        date: form.date,
        weight_kg: parseFloat(form.weight_kg),
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        head_cm: form.head_cm ? parseFloat(form.head_cm) : undefined,
        note: form.note || undefined,
      })
      setEntries(prev => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setShowForm(false)
      setForm(BLANK)
      toast('Growth entry saved!', 'success')
    } catch {
      toast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    if (!baby) return
    await growthApi.delete(baby.id, id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setConfirmDelete(null)
    toast('Entry deleted', 'success')
  }

  const dob = baby?.date_of_birth ? new Date(baby.date_of_birth) : null
  const gender = baby?.gender ?? 'male'
  const hasHeight = entries.some(e => e.height_cm)

  const chartData = dob ? buildChartData(entries, dob, tab, gender) : []

  const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none focus:border-indigo-500/60 transition-all'

  // Latest entry stats
  const latest = entries[0] ?? null
  const latestAgeM = latest && dob ? ageMonths(dob, parseUTC(latest.date)) : null

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between slide-up">
          <h1 className="text-xl font-bold text-white">Growth</h1>
          {canEdit && (
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(124,58,237,0.8))', border: '1px solid rgba(167,139,250,0.3)' }}>
              {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? 'Cancel' : 'Add'}
            </button>
          )}
        </div>

        {!canEdit && <ReadOnlyBanner />}

        {/* Latest stats strip */}
        {latest && latestAgeM !== null && (
          <div className="flex gap-2 slide-up">
            {[
              {
                icon: Scale,
                value: `${latest.weight_kg} kg`,
                label: 'Latest weight',
                sub: getPercentileLabel(latest.weight_kg, latestAgeM, 'weight', gender),
                bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.22)',
                iconBg: 'rgba(99,102,241,0.18)', color: '#a5b4fc',
              },
              ...(latest.height_cm ? [{
                icon: Ruler,
                value: `${latest.height_cm} cm`,
                label: 'Latest height',
                sub: getPercentileLabel(latest.height_cm, latestAgeM, 'height', gender),
                bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.2)',
                iconBg: 'rgba(16,185,129,0.18)', color: '#34d399',
              }] : []),
              ...(latest.head_cm ? [{
                icon: Circle,
                value: `${latest.head_cm} cm`,
                label: 'Head circ.',
                sub: format(parseUTC(latest.date), 'dd MMM'),
                bg: 'rgba(217,70,239,0.10)', border: 'rgba(217,70,239,0.2)',
                iconBg: 'rgba(217,70,239,0.15)', color: '#e879f9',
              }] : []),
            ].map(({ icon: Icon, value, label, sub, bg, border, iconBg }) => (
              <div key={label} className="flex-1 rounded-2xl px-3 py-3 flex flex-col gap-1.5"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-white opacity-75">{label}</p>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                </div>
                <p className="text-lg font-bold leading-none tabular-nums text-white">{value}</p>
                {sub && <p className="text-[10px] text-white opacity-60">{sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="glass-hero p-4 flex flex-col gap-3 slide-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Measurement</p>
            <input className={inputCls} type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 px-1">Weight (kg) *</label>
                <input className={inputCls} type="number" step="0.01" placeholder="3.50"
                  value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 px-1">Height (cm)</label>
                <input className={inputCls} type="number" step="0.1" placeholder="52.0"
                  value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 px-1">Head (cm)</label>
                <input className={inputCls} type="number" step="0.1" placeholder="34.0"
                  value={form.head_cm} onChange={e => setForm(f => ({ ...f, head_cm: e.target.value }))} />
              </div>
            </div>
            <input className={inputCls} placeholder="Note (optional)" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            <button onClick={save} disabled={saving || !form.weight_kg}
              className="btn-glow bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Measurement
            </button>
          </div>
        )}

        {/* WHO chart */}
        {entries.length > 0 && dob && (
          <div className="glass-hero p-4 flex flex-col gap-3 slide-up-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-indigo-400" />
                </div>
                <p className="text-xs font-semibold text-slate-300">WHO Percentile Chart</p>
              </div>
              <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {(['weight', 'height'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'height' && !hasHeight ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                <Ruler className="w-8 h-8 text-slate-700" />
                <p className="text-slate-500 text-sm">No height data yet</p>
                <p className="text-slate-600 text-xs">Add a measurement with height to see this chart</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[0, 24]}
                    tickCount={7}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: 'Age (months)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#475569' }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, fontSize: 12 }}
                    labelFormatter={v => `${v} months`}
                    formatter={(val, name) => {
                      if (name === 'bandBase' || name === 'bandRange') return null
                      if (val == null) return null
                      const unit = tab === 'weight' ? 'kg' : 'cm'
                      const labels: Record<string, string> = { actual: 'Actual', p50: 'Median (P50)', p3: 'P3', p97: 'P97' }
                      return [`${Number(val).toFixed(1)} ${unit}`, labels[String(name)] ?? String(name)]
                    }}
                  />
                  <Area dataKey="bandBase" stackId="band" fill="transparent" stroke="none" dot={false} legendType="none" tooltipType="none" />
                  <Area dataKey="bandRange" stackId="band" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.3)" strokeDasharray="4 3" dot={false} legendType="none" tooltipType="none" />
                  <Line dataKey="p3" stroke="none" dot={false} strokeWidth={0} name="p3" legendType="none" />
                  <Line dataKey="p97" stroke="none" dot={false} strokeWidth={0} name="p97" legendType="none" />
                  <Line dataKey="p50" stroke="#818cf8" strokeWidth={1.5} dot={false} strokeDasharray="6 3" name="p50" legendType="none" />
                  <Line dataKey="actual" stroke="#10b981" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#064e3b' }}
                    activeDot={{ r: 6, fill: '#10b981' }}
                    connectNulls={false} name="actual" legendType="none" />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 px-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#818cf8" strokeWidth="2" strokeDasharray="5 3" /></svg>
                <span className="text-[10px] text-slate-500">WHO median</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#10b981" stroke="#064e3b" strokeWidth="1.5" /></svg>
                <span className="text-[10px] text-slate-500">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="20" height="12"><rect x="0" y="0" width="20" height="12" rx="3" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.3)" strokeWidth="1" strokeDasharray="3 2" /></svg>
                <span className="text-[10px] text-slate-500">P3–P97 range</span>
              </div>
            </div>
          </div>
        )}

        {/* Entry list */}
        <div className="flex flex-col gap-2 slide-up-3">
          {entries.length > 0 && (
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Scale className="w-3 h-3 text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-slate-400">Measurements</p>
              <span className="text-[10px] text-slate-500">{entries.length} recorded</span>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="glass p-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">No measurements yet</p>
                <p className="text-xs text-slate-600 mt-1">Tap Add to log your first growth entry</p>
              </div>
            </div>
          ) : entries.map(e => {
            const ageM = dob ? ageMonths(dob, parseUTC(e.date)) : null
            const ageLabel = ageM !== null
              ? ageM < 1 ? `${Math.round(ageM * 30.44)}d old`
              : ageM < 24 ? `${Math.floor(ageM)}m old`
              : `${Math.floor(ageM / 12)}y old`
              : null
            const pLabel = ageM !== null
              ? getPercentileLabel(e.weight_kg, ageM, 'weight', gender)
              : null
            return (
              <div key={e.id}
                className="card-surface group flex items-center gap-3 px-3.5 py-3 transition-all"
                style={{ borderLeft: '3px solid rgba(99,102,241,0.5)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/10">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{e.weight_kg} kg</span>
                    {e.height_cm && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                        {e.height_cm} cm
                      </span>
                    )}
                    {e.head_cm && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{ background: 'rgba(217,70,239,0.12)', color: '#e879f9' }}>
                        HC {e.head_cm} cm
                      </span>
                    )}
                    {pLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
                        {pLabel}
                      </span>
                    )}
                  </div>
                  {e.note && <p className="text-xs text-slate-500 truncate mt-0.5">{e.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{format(parseUTC(e.date), 'dd MMM yyyy')}</p>
                  {ageLabel && <p className="text-[11px] text-indigo-400 mt-0.5">{ageLabel}</p>}
                </div>
                {canEdit && (
                  <button onClick={() => setConfirmDelete(e.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Delete modal */}
      {confirmDelete && (() => {
        const e = entries.find(x => x.id === confirmDelete)
        if (!e) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(null)}>
            <div className="w-full max-w-xs modal-surface rounded-3xl p-6 flex flex-col gap-4"
              onClick={ev => ev.stopPropagation()}>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white mb-1">Delete measurement?</p>
                <p className="text-sm text-slate-400">
                  {e.weight_kg} kg on {format(parseUTC(e.date), 'dd MMM yyyy')} will be removed.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
                <button onClick={() => del(confirmDelete)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
