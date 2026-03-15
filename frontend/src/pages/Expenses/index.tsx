import { useState, useEffect } from 'react'
import { Plus, DollarSign, Loader2, Trash2, Download, Pencil, X } from 'lucide-react'
import { expensesApi } from '@/api/expenses'
import type { Expense, ExpenseSummary } from '@/api/expenses'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { format } from 'date-fns'
import { parseUTC } from '@/utils/dates'

const CATEGORIES = ['diapers', 'medicine', 'products', 'doctor', 'other'] as const
const CAT_COLORS: Record<string, string> = {
  diapers: '#6366f1', medicine: '#ef4444', products: '#06b6d4', doctor: '#10b981', other: '#f59e0b',
}

const BLANK_FORM = { amount: '', category: 'diapers', date: format(new Date(), 'yyyy-MM-dd'), note: '' }

export default function ExpensesPage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const currentMonth = format(new Date(), 'yyyy-MM')

  const load = async () => {
    if (!baby) return
    const [page, sum] = await Promise.all([
      expensesApi.list(baby.id, { month: currentMonth }),
      expensesApi.summary(baby.id, currentMonth),
    ])
    setExpenses(page.items)
    setSummary(sum)
    setLoading(false)
  }

  useEffect(() => { load() }, [baby])

  function openAdd() {
    setEditingId(null)
    setForm(BLANK_FORM)
    setShowForm(true)
  }

  function openEdit(e: Expense) {
    setEditingId(e.id)
    setForm({ amount: String(e.amount), category: e.category, date: e.date, note: e.note ?? '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK_FORM)
  }

  async function save() {
    if (!baby || !form.amount) return
    setSaving(true)
    try {
      if (editingId) {
        const updated = await expensesApi.patch(editingId, {
          amount: parseFloat(form.amount),
          category: form.category,
          date: form.date,
          note: form.note || undefined,
        })
        setExpenses(prev => prev.map(e => e.id === editingId ? updated : e))
      } else {
        await expensesApi.create({ baby_id: baby.id, amount: parseFloat(form.amount), category: form.category, date: form.date, note: form.note || undefined })
        await load()
      }
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    await expensesApi.delete(id)
    setExpenses(p => p.filter(e => e.id !== id))
    setSummary(s => s ? { ...s, total: s.total - (expenses.find(e => e.id === id)?.amount ?? 0) } : s)
  }

  const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none focus:border-indigo-500/60 transition-all'

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-xl font-bold text-white">Expenses</h1>
        <div className="flex gap-2">
          {baby && (
            <button
              onClick={() => expensesApi.exportCSV(baby.id).catch(() => alert('Export failed'))}
              className="glass px-3 py-2 flex items-center gap-1 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {canEdit && (
            <button onClick={showForm && !editingId ? closeForm : openAdd}
              className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300">
              {showForm && !editingId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm && !editingId ? 'Cancel' : 'Add'}
            </button>
          )}
        </div>
      </div>

      {!canEdit && <ReadOnlyBanner />}

      {/* Month total */}
      <div className="glass-strong p-4 flex items-center gap-3 slide-up-1">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">{format(new Date(), 'MMMM yyyy')}</p>
          <p className="text-2xl font-bold text-white">₹{summary?.total.toFixed(0) ?? 0}</p>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="glass-strong p-4 flex flex-col gap-3 slide-up">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {editingId ? 'Edit Expense' : 'New Expense'}
          </p>
          <div className="flex gap-2">
            <input className={`${inputCls} flex-1`} type="number" placeholder="Amount" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <input className={`${inputCls} w-36`} type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${form.category === c ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                {c}
              </button>
            ))}
          </div>
          <input className={inputCls} placeholder="Note (optional)" value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={closeForm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving || !form.amount}
              className="flex-1 btn-glow bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingId ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2 slide-up-3">
        {expenses.length === 0 ? (
          <div className="glass p-6 text-center text-slate-500 text-sm">No expenses logged this month</div>
        ) : expenses.map(e => (
          <div key={e.id} className="glass flex items-center gap-3 px-4 py-3 group">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[e.category] }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 capitalize">{e.category}</p>
              {e.note && <p className="text-xs text-slate-500 truncate">{e.note}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-white">₹{e.amount}</p>
              <p className="text-xs text-slate-500">{format(parseUTC(e.date), 'dd MMM')}</p>
            </div>
            {canEdit && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all ml-1">
                <button onClick={() => openEdit(e)} className="text-slate-600 hover:text-indigo-400 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(e.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
