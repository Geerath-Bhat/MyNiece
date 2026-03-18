import { useState, useEffect } from 'react'
import { Plus, Loader2, Trash2, X, Stethoscope, Syringe, ChevronDown, ChevronUp, Calendar, Check, Star } from 'lucide-react'
import { format, differenceInDays, addDays } from 'date-fns'
import { parseUTC } from '@/utils/dates'
import { healthApi } from '@/api/health'
import type { DoctorVisit, VaccineRecord, Milestone } from '@/api/health'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { toast } from '@/components/ui/Toast'

// ── IAP 2023 Vaccine Schedule ────────────────────────────────────────────────

interface VaccineDef {
  key: string
  name: string
  scheduledDays: number   // days after birth
  description: string
}

interface VaccineGroup {
  label: string
  scheduledDays: number
  vaccines: VaccineDef[]
}

const VACCINE_SCHEDULE: VaccineGroup[] = [
  {
    label: 'At Birth', scheduledDays: 0,
    vaccines: [
      { key: 'bcg_birth',   name: 'BCG',         scheduledDays: 0,  description: 'Tuberculosis protection' },
      { key: 'hepb_1',      name: 'Hepatitis B',  scheduledDays: 0,  description: '1st dose' },
      { key: 'opv_0',       name: 'OPV-0',        scheduledDays: 0,  description: 'Oral polio — birth dose' },
    ],
  },
  {
    label: '6 Weeks', scheduledDays: 42,
    vaccines: [
      { key: 'dtwp_1',      name: 'DTwP / DTaP',  scheduledDays: 42, description: '1st dose — Diphtheria, Tetanus, Pertussis' },
      { key: 'ipv_1',       name: 'IPV',           scheduledDays: 42, description: '1st dose — Injectable Polio' },
      { key: 'hib_1',       name: 'Hib',           scheduledDays: 42, description: '1st dose — Haemophilus influenzae B' },
      { key: 'hepb_2',      name: 'Hepatitis B',   scheduledDays: 42, description: '2nd dose' },
      { key: 'pcv_1',       name: 'PCV',           scheduledDays: 42, description: '1st dose — Pneumococcal' },
      { key: 'rotavirus_1', name: 'Rotavirus',     scheduledDays: 42, description: '1st dose' },
    ],
  },
  {
    label: '10 Weeks', scheduledDays: 70,
    vaccines: [
      { key: 'dtwp_2',      name: 'DTwP / DTaP',  scheduledDays: 70, description: '2nd dose' },
      { key: 'ipv_2',       name: 'IPV',           scheduledDays: 70, description: '2nd dose' },
      { key: 'hib_2',       name: 'Hib',           scheduledDays: 70, description: '2nd dose' },
      { key: 'rotavirus_2', name: 'Rotavirus',     scheduledDays: 70, description: '2nd dose' },
    ],
  },
  {
    label: '14 Weeks', scheduledDays: 98,
    vaccines: [
      { key: 'dtwp_3',      name: 'DTwP / DTaP',  scheduledDays: 98, description: '3rd dose' },
      { key: 'ipv_3',       name: 'IPV',           scheduledDays: 98, description: '3rd dose' },
      { key: 'hib_3',       name: 'Hib',           scheduledDays: 98, description: '3rd dose' },
      { key: 'pcv_2',       name: 'PCV',           scheduledDays: 98, description: '2nd dose' },
      { key: 'rotavirus_3', name: 'Rotavirus',     scheduledDays: 98, description: '3rd dose' },
    ],
  },
  {
    label: '6 Months', scheduledDays: 180,
    vaccines: [
      { key: 'opv_1',  name: 'OPV',        scheduledDays: 180, description: '1st dose' },
      { key: 'hepb_3', name: 'Hepatitis B', scheduledDays: 180, description: '3rd dose' },
    ],
  },
  {
    label: '9 Months', scheduledDays: 274,
    vaccines: [
      { key: 'mmr_1', name: 'MMR',  scheduledDays: 274, description: '1st dose — Measles, Mumps, Rubella' },
      { key: 'opv_2', name: 'OPV',  scheduledDays: 274, description: '2nd dose' },
    ],
  },
  {
    label: '12 Months', scheduledDays: 365,
    vaccines: [
      { key: 'hepa_1',     name: 'Hepatitis A', scheduledDays: 365, description: '1st dose' },
      { key: 'pcv_booster', name: 'PCV',        scheduledDays: 365, description: 'Booster dose' },
    ],
  },
  {
    label: '15 Months', scheduledDays: 457,
    vaccines: [
      { key: 'mmr_2',       name: 'MMR',       scheduledDays: 457, description: '2nd dose' },
      { key: 'varicella_1', name: 'Varicella', scheduledDays: 457, description: '1st dose — Chickenpox' },
    ],
  },
  {
    label: '18 Months', scheduledDays: 548,
    vaccines: [
      { key: 'dtwp_booster', name: 'DTwP / DTaP', scheduledDays: 548, description: 'Booster' },
      { key: 'ipv_booster',  name: 'IPV',          scheduledDays: 548, description: 'Booster' },
      { key: 'hib_booster',  name: 'Hib',          scheduledDays: 548, description: 'Booster' },
      { key: 'hepa_2',       name: 'Hepatitis A',  scheduledDays: 548, description: '2nd dose' },
    ],
  },
  {
    label: '2 Years', scheduledDays: 730,
    vaccines: [
      { key: 'typhoid_1', name: 'Typhoid', scheduledDays: 730, description: '1st dose' },
    ],
  },
  {
    label: '4–6 Years', scheduledDays: 1460,
    vaccines: [
      { key: 'dtwp_booster2',   name: 'DTwP / DTaP', scheduledDays: 1460, description: '2nd booster' },
      { key: 'opv_booster',     name: 'OPV',          scheduledDays: 1460, description: 'Booster' },
      { key: 'varicella_2',     name: 'Varicella',    scheduledDays: 1460, description: '2nd dose' },
      { key: 'typhoid_booster', name: 'Typhoid',      scheduledDays: 1460, description: 'Booster' },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function dueDate(dob: Date, scheduledDays: number) {
  return addDays(dob, scheduledDays)
}

function groupStatus(dob: Date, group: VaccineGroup, given: Set<string>): 'done' | 'due' | 'upcoming' {
  const allDone = group.vaccines.every(v => given.has(v.key))
  if (allDone) return 'done'
  const due = dueDate(dob, group.scheduledDays)
  if (new Date() >= due) return 'due'
  return 'upcoming'
}

const STATUS_COLORS = {
  done:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-400', label: 'Done' },
  due:      { bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   badge: 'bg-amber-500/15 text-amber-400',    label: 'Due now' },
  upcoming: { bg: 'bg-white/3',        border: 'border-white/8',        badge: 'bg-white/10 text-slate-500',        label: 'Upcoming' },
}

// ── Vaccine row ───────────────────────────────────────────────────────────────

function VaccineRow({ vaccine, record, canEdit, onMark, onUnmark }: {
  vaccine: VaccineDef
  record?: VaccineRecord
  canEdit: boolean
  onMark: (key: string, date: string) => void
  onUnmark: (id: string) => void
}) {
  const [showDateInput, setShowDateInput] = useState(false)
  const [dateVal, setDateVal] = useState(format(new Date(), 'yyyy-MM-dd'))

  if (record) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-200">{vaccine.name}</span>
          <span className="text-xs text-slate-500 ml-2">{vaccine.description}</span>
        </div>
        <span className="text-xs text-emerald-400 shrink-0">{format(parseUTC(record.given_date), 'dd MMM yyyy')}</span>
        {canEdit && (
          <button onClick={() => onUnmark(record.id)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => canEdit && setShowDateInput(v => !v)}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${showDateInput ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/20 hover:border-indigo-400'}`}
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-300">{vaccine.name}</span>
          <span className="text-xs text-slate-500 ml-2">{vaccine.description}</span>
        </div>
      </div>
      {showDateInput && (
        <div className="flex items-center gap-2 pl-8">
          <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60" />
          <button
            onClick={() => { onMark(vaccine.key, dateVal); setShowDateInput(false) }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
            Mark given
          </button>
          <button onClick={() => setShowDateInput(false)} className="text-slate-500 hover:text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Milestone definitions (CDC/WHO developmental milestones) ─────────────────

interface MilestoneDef {
  key: string
  title: string
  ageLabel: string   // e.g. "1–2 months"
}

interface MilestoneCategory {
  id: string
  label: string
  color: string
  bg: string
  milestones: MilestoneDef[]
}

const MILESTONE_CATEGORIES: MilestoneCategory[] = [
  {
    id: 'social', label: 'Social & Emotional', color: 'text-pink-400', bg: 'bg-pink-500/10',
    milestones: [
      { key: 'first_smile',        title: 'First smile',              ageLabel: '1–2 months'  },
      { key: 'recognizes_parents', title: 'Recognises parents',       ageLabel: '2–3 months'  },
      { key: 'laughs_aloud',       title: 'Laughs out loud',          ageLabel: '3–4 months'  },
      { key: 'stranger_anxiety',   title: 'Stranger anxiety',         ageLabel: '6–8 months'  },
      { key: 'waves_bye',          title: 'Waves bye-bye',            ageLabel: '9–12 months' },
      { key: 'plays_peekaboo',     title: 'Plays peek-a-boo',        ageLabel: '9–12 months' },
      { key: 'shows_affection',    title: 'Shows affection',          ageLabel: '12–18 months'},
    ],
  },
  {
    id: 'motor', label: 'Motor Skills', color: 'text-violet-400', bg: 'bg-violet-500/10',
    milestones: [
      { key: 'holds_head_up',    title: 'Holds head up',          ageLabel: '1–2 months'  },
      { key: 'rolls_over',       title: 'Rolls over',             ageLabel: '3–5 months'  },
      { key: 'sits_unsupported', title: 'Sits without support',   ageLabel: '5–7 months'  },
      { key: 'crawls',           title: 'Crawls',                 ageLabel: '7–10 months' },
      { key: 'pulls_to_stand',   title: 'Pulls to stand',         ageLabel: '8–10 months' },
      { key: 'first_steps',      title: 'First steps',            ageLabel: '9–12 months' },
      { key: 'walks_alone',      title: 'Walks independently',    ageLabel: '12–15 months'},
      { key: 'runs',             title: 'Runs',                   ageLabel: '18–24 months'},
      { key: 'pincer_grasp',     title: 'Pincer grasp',           ageLabel: '9–10 months' },
      { key: 'self_feeds',       title: 'Self-feeds finger foods', ageLabel: '9–12 months' },
    ],
  },
  {
    id: 'language', label: 'Language', color: 'text-sky-400', bg: 'bg-sky-500/10',
    milestones: [
      { key: 'coos',           title: 'Coos',                ageLabel: '2–3 months'  },
      { key: 'babbles',        title: 'Babbles',             ageLabel: '4–6 months'  },
      { key: 'mama_dada',      title: 'Says mama / dada',   ageLabel: '6–9 months'  },
      { key: 'first_word',     title: 'First real word',     ageLabel: '9–12 months' },
      { key: 'two_word',       title: '2-word phrases',      ageLabel: '18–24 months'},
      { key: 'fifty_words',    title: '50+ words',           ageLabel: '~24 months'  },
    ],
  },
  {
    id: 'cognitive', label: 'Cognitive', color: 'text-amber-400', bg: 'bg-amber-500/10',
    milestones: [
      { key: 'follows_objects',    title: 'Follows moving objects',  ageLabel: '2–3 months'  },
      { key: 'object_permanence',  title: 'Object permanence',       ageLabel: '8–10 months' },
      { key: 'imitates_actions',   title: 'Imitates actions',        ageLabel: '9–12 months' },
      { key: 'solves_problems',    title: 'Solves simple problems',  ageLabel: '12–18 months'},
      { key: 'pretend_play',       title: 'Pretend / imaginative play', ageLabel: '18–24 months'},
    ],
  },
]

// ── Milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({ def, record, canEdit, onMark, onDelete }: {
  def: MilestoneDef
  record?: Milestone
  canEdit: boolean
  onMark: (key: string, date: string) => void
  onDelete: (id: string) => void
}) {
  const [showDateInput, setShowDateInput] = useState(false)
  const [dateVal, setDateVal] = useState(format(new Date(), 'yyyy-MM-dd'))

  if (record) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-200">{def.title}</span>
          <span className="text-xs text-slate-500 ml-2">{def.ageLabel}</span>
        </div>
        <span className="text-xs text-emerald-400 shrink-0">{format(parseUTC(record.achieved_date), 'dd MMM yyyy')}</span>
        {canEdit && (
          <button onClick={() => onDelete(record.id)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => canEdit && setShowDateInput(v => !v)}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${showDateInput ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/20 hover:border-indigo-400'}`}
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-300">{def.title}</span>
          <span className="text-xs text-slate-500 ml-2">{def.ageLabel}</span>
        </div>
      </div>
      {showDateInput && (
        <div className="flex items-center gap-2 pl-8">
          <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60" />
          <button
            onClick={() => { onMark(def.key, dateVal); setShowDateInput(false) }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
            Mark done
          </button>
          <button onClick={() => setShowDateInput(false)} className="text-slate-500 hover:text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BLANK_VISIT = { date: format(new Date(), 'yyyy-MM-dd'), reason: '', doctor_name: '', notes: '', next_appointment: '' }
const BLANK_MILESTONE = { title: '', category: 'Social & Emotional', achieved_date: format(new Date(), 'yyyy-MM-dd'), notes: '' }

export default function HealthPage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
  const [tab, setTab] = useState<'visits' | 'vaccines' | 'milestones'>('visits')
  const [visits, setVisits] = useState<DoctorVisit[]>([])
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_VISIT)
  const [milestoneForm, setMilestoneForm] = useState(BLANK_MILESTONE)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedMilestoneCategories, setExpandedMilestoneCategories] = useState<Set<string>>(new Set(['social', 'motor', 'language', 'cognitive']))

  useEffect(() => {
    if (!baby) return
    Promise.all([
      healthApi.listVisits(baby.id),
      healthApi.listVaccines(baby.id),
      healthApi.listMilestones(baby.id),
    ]).then(([v, vax, ms]) => {
      setVisits(v)
      setVaccineRecords(vax)
      setMilestones(ms)
    }).finally(() => setLoading(false))
  }, [baby])

  // Auto-expand due groups on first load
  useEffect(() => {
    if (!baby?.date_of_birth || vaccineRecords === undefined) return
    const dob = new Date(baby.date_of_birth)
    const given = new Set(vaccineRecords.map(r => r.vaccine_key))
    const dueGroups = VACCINE_SCHEDULE
      .filter(g => groupStatus(dob, g, given) === 'due')
      .map(g => g.label)
    setExpandedGroups(new Set(dueGroups))
  }, [baby, vaccineRecords])

  async function saveVisit() {
    if (!baby || !form.reason) return
    setSaving(true)
    try {
      const visit = await healthApi.addVisit(baby.id, {
        date: form.date,
        reason: form.reason,
        doctor_name: form.doctor_name || undefined,
        notes: form.notes || undefined,
        next_appointment: form.next_appointment || undefined,
      })
      setVisits(prev => [visit, ...prev])
      setShowForm(false)
      setForm(BLANK_VISIT)
      toast('Visit logged!', 'success')
    } catch {
      toast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVisit(id: string) {
    await healthApi.deleteVisit(id)
    setVisits(prev => prev.filter(v => v.id !== id))
    setConfirmDelete(null)
    toast('Visit deleted', 'success')
  }

  async function markVaccine(key: string, date: string) {
    if (!baby) return
    try {
      const record = await healthApi.markVaccine(baby.id, { vaccine_key: key, given_date: date })
      setVaccineRecords(prev => [...prev, record])
      toast('Vaccine recorded!', 'success')
    } catch {
      toast('Failed to record vaccine', 'error')
    }
  }

  async function unmarkVaccine(id: string) {
    await healthApi.unmarkVaccine(id)
    setVaccineRecords(prev => prev.filter(r => r.id !== id))
    toast('Vaccine unmarked', 'success')
  }

  function toggleGroup(label: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function toggleMilestoneCategory(id: string) {
    setExpandedMilestoneCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function markMilestone(milestoneKey: string, date: string) {
    if (!baby) return
    const cat = MILESTONE_CATEGORIES.find(c => c.milestones.some(m => m.key === milestoneKey))
    const def = cat?.milestones.find(m => m.key === milestoneKey)
    if (!def || !cat) return
    try {
      const record = await healthApi.addMilestone(baby.id, {
        title: def.title,
        category: cat.label,
        achieved_date: date,
        milestone_key: milestoneKey,
      })
      setMilestones(prev => [...prev, record])
      toast('Milestone recorded!', 'success')
    } catch {
      toast('Failed to record milestone', 'error')
    }
  }

  async function deleteMilestone(id: string) {
    await healthApi.deleteMilestone(id)
    setMilestones(prev => prev.filter(m => m.id !== id))
    toast('Milestone removed', 'success')
  }

  async function saveCustomMilestone() {
    if (!baby || !milestoneForm.title) return
    setSaving(true)
    try {
      const record = await healthApi.addMilestone(baby.id, {
        title: milestoneForm.title,
        category: milestoneForm.category,
        achieved_date: milestoneForm.achieved_date,
        notes: milestoneForm.notes || undefined,
      })
      setMilestones(prev => [...prev, record])
      setShowForm(false)
      setMilestoneForm(BLANK_MILESTONE)
      toast('Milestone saved!', 'success')
    } catch {
      toast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none focus:border-indigo-500/60 transition-all'
  const dob = baby?.date_of_birth ? new Date(baby.date_of_birth) : null
  const givenKeys = new Set(vaccineRecords.map(r => r.vaccine_key))
  const totalVaccines = VACCINE_SCHEDULE.flatMap(g => g.vaccines).length
  const givenCount = vaccineRecords.length
  const achievedKeys = new Set(milestones.map(m => m.milestone_key).filter(Boolean) as string[])
  const totalPredefined = MILESTONE_CATEGORIES.flatMap(c => c.milestones).length
  const achievedCount = achievedKeys.size

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between slide-up">
          <h1 className="text-xl font-bold text-white">Health</h1>
          {canEdit && (tab === 'visits' || tab === 'milestones') && (
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(124,58,237,0.8))', border: '1px solid rgba(167,139,250,0.3)' }}>
              {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? 'Cancel' : tab === 'visits' ? 'Add Visit' : 'Custom Milestone'}
            </button>
          )}
        </div>

        {!canEdit && <ReadOnlyBanner />}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 slide-up">
          <button onClick={() => { setTab('visits'); setShowForm(false) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'visits' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Stethoscope className="w-3.5 h-3.5" />
            Visits
          </button>
          <button onClick={() => { setTab('vaccines'); setShowForm(false) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'vaccines' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Syringe className="w-3.5 h-3.5" />
            Vaccines
            <span className={`text-[10px] px-1 py-0.5 rounded-md ${tab === 'vaccines' ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {givenCount}/{totalVaccines}
            </span>
          </button>
          <button onClick={() => { setTab('milestones'); setShowForm(false) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'milestones' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Star className="w-3.5 h-3.5" />
            Milestones
            <span className={`text-[10px] px-1 py-0.5 rounded-md ${tab === 'milestones' ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {achievedCount}/{totalPredefined}
            </span>
          </button>
        </div>

        {/* ── VISITS TAB ─────────────────────────────────────────────────── */}
        {tab === 'visits' && (
          <>
            {/* Add form */}
            {showForm && (
              <div className="glass-hero p-4 flex flex-col gap-3 slide-up">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Log Doctor Visit</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 px-1">Date *</label>
                    <input className={inputCls} type="date" value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 px-1">Doctor name</label>
                    <input className={inputCls} placeholder="Dr. Sharma" value={form.doctor_name}
                      onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} />
                  </div>
                </div>
                <input className={inputCls} placeholder="Reason for visit *" value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notes (optional)" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500 px-1">Next appointment (optional)</label>
                  <input className={inputCls} type="date" value={form.next_appointment}
                    onChange={e => setForm(f => ({ ...f, next_appointment: e.target.value }))} />
                </div>
                <button onClick={saveVisit} disabled={saving || !form.reason}
                  className="btn-glow bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Visit
                </button>
              </div>
            )}

            {/* Visit list */}
            <div className="flex flex-col gap-2">
              {visits.length === 0 ? (
                <div className="glass p-10 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    <Stethoscope className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-400">No visits logged yet</p>
                    <p className="text-xs text-slate-500 mt-1">Tap Add Visit to record a doctor visit</p>
                  </div>
                </div>
              ) : visits.map(v => (
                <div key={v.id}
                  className="card-surface group flex items-start gap-3 px-3.5 py-3 transition-all"
                  style={{ borderLeft: '3px solid rgba(14,165,233,0.5)' }}>
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Stethoscope className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{v.reason}</p>
                    {v.doctor_name && <p className="text-xs text-slate-400">{v.doctor_name}</p>}
                    {v.notes && <p className="text-xs text-slate-500 mt-0.5">{v.notes}</p>}
                    {v.next_appointment && (
                      <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Next: {format(parseUTC(v.next_appointment), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <p className="text-xs text-slate-400">{format(parseUTC(v.date), 'dd MMM yyyy')}</p>
                    {canEdit && (
                      <button onClick={() => setConfirmDelete(v.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── VACCINES TAB ───────────────────────────────────────────────── */}
        {tab === 'vaccines' && (
          <div className="flex flex-col gap-2">
            {VACCINE_SCHEDULE.map(group => {
              const status = dob ? groupStatus(dob, group, givenKeys) : 'upcoming'
              const colors = STATUS_COLORS[status]
              const isExpanded = expandedGroups.has(group.label)
              const dueOn = dob ? dueDate(dob, group.scheduledDays) : null
              const daysUntil = dob ? differenceInDays(dueDate(dob, group.scheduledDays), new Date()) : null

              return (
                <div key={group.label} className="glass-hero overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${colors.bg}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-200">{group.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors.badge}`}>
                          {colors.label}
                        </span>
                        {status === 'upcoming' && daysUntil !== null && daysUntil > 0 && (
                          <span className="text-[10px] text-slate-500">in {daysUntil}d</span>
                        )}
                      </div>
                      {dueOn && (
                        <p className="text-xs text-slate-500 mt-0.5">{format(dueOn, 'dd MMM yyyy')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">
                        {group.vaccines.filter(v => givenKeys.has(v.key)).length}/{group.vaccines.length}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 divide-y divide-white/5">
                      {group.vaccines.map(vaccine => (
                        <VaccineRow
                          key={vaccine.key}
                          vaccine={vaccine}
                          record={vaccineRecords.find(r => r.vaccine_key === vaccine.key)}
                          canEdit={canEdit}
                          onMark={markVaccine}
                          onUnmark={unmarkVaccine}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── MILESTONES TAB ─────────────────────────────────────────────── */}
        {tab === 'milestones' && (
          <div className="flex flex-col gap-3">
            {/* Custom milestone form */}
            {showForm && (
              <div className="glass-hero p-4 flex flex-col gap-3 slide-up">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Log Custom Milestone</p>
                <input className={inputCls} placeholder="Milestone title *" value={milestoneForm.title}
                  onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 px-1">Category</label>
                    <select className={inputCls} value={milestoneForm.category}
                      onChange={e => setMilestoneForm(f => ({ ...f, category: e.target.value }))}>
                      {MILESTONE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.label}>{c.label}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 px-1">Date achieved *</label>
                    <input className={inputCls} type="date" value={milestoneForm.achieved_date}
                      onChange={e => setMilestoneForm(f => ({ ...f, achieved_date: e.target.value }))} />
                  </div>
                </div>
                <input className={inputCls} placeholder="Notes (optional)" value={milestoneForm.notes}
                  onChange={e => setMilestoneForm(f => ({ ...f, notes: e.target.value }))} />
                <button onClick={saveCustomMilestone} disabled={saving || !milestoneForm.title}
                  className="btn-glow bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Milestone
                </button>
              </div>
            )}

            {/* Custom milestones (no milestone_key) */}
            {milestones.filter(m => !m.milestone_key).length > 0 && (
              <div className="glass-hero overflow-hidden">
                <div className="px-4 py-3 bg-white/3 border-b border-white/5">
                  <span className="text-sm font-semibold text-slate-200">Custom Milestones</span>
                </div>
                <div className="px-4 pb-2 divide-y divide-white/5">
                  {milestones.filter(m => !m.milestone_key).map(m => (
                    <div key={m.id} className="flex items-center gap-3 py-2.5 group">
                      <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                        <Star className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">{m.title}</p>
                        {m.notes && <p className="text-xs text-slate-500">{m.notes}</p>}
                      </div>
                      <span className="text-xs text-emerald-400 shrink-0">{format(parseUTC(m.achieved_date), 'dd MMM yyyy')}</span>
                      {canEdit && (
                        <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predefined milestone categories */}
            {MILESTONE_CATEGORIES.map(cat => {
              const isExpanded = expandedMilestoneCategories.has(cat.id)
              const catAchieved = cat.milestones.filter(m => achievedKeys.has(m.key)).length

              return (
                <div key={cat.id} className="glass-hero overflow-hidden">
                  <button
                    onClick={() => toggleMilestoneCategory(cat.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white/3 transition-all hover:bg-white/5">
                    <div className={`w-8 h-8 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
                      <Star className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold ${cat.color}`}>{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">{catAchieved}/{cat.milestones.length}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 divide-y divide-white/5">
                      {cat.milestones.map(def => (
                        <MilestoneRow
                          key={def.key}
                          def={def}
                          record={milestones.find(m => m.milestone_key === def.key)}
                          canEdit={canEdit}
                          onMark={markMilestone}
                          onDelete={deleteMilestone}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete visit modal */}
      {confirmDelete && (() => {
        const v = visits.find(x => x.id === confirmDelete)
        if (!v) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(null)}>
            <div className="w-full max-w-xs modal-surface rounded-3xl p-6 flex flex-col gap-4"
              onClick={ev => ev.stopPropagation()}>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white mb-1">Delete visit?</p>
                <p className="text-sm text-slate-400">{v.reason} on {format(parseUTC(v.date), 'dd MMM yyyy')} will be removed.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
                <button onClick={() => deleteVisit(confirmDelete)}
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
