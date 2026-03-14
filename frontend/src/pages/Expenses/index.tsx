import { useState, useEffect } from 'react'
import { Plus, DollarSign, Loader2, Trash2, Download } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { expensesApi } from '@/api/expenses'
import type { Expense, ExpenseSummary } from '@/api/expenses'
import { useBaby } from '@/hooks/useBaby'
import { format } from 'date-fns'

const CATEGORIES = ['diapers', 'medicine', 'products', 'doctor', 'other'] as const
const CAT_COLORS: Record<string, string> = {
  diapers: '#6366f1', medicine: '#ef4444', products: '#06b6d4', doctor: '#10b981', other: '#f59e0b',
}

export default function ExpensesPage() {
  const { baby } = useBaby()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', category: 'diapers', date: format(new Date(), 'yyyy-MM-dd'), note: '' })
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

  async function save() {
    if (!baby || !form.amount) return
    setSaving(true)
    await expensesApi.create({ baby_id: baby.id, amount: parseFloat(form.amount), category: form.category, date: form.date, note: form.note || undefined })
    setForm(f => ({ ...f, amount: '', note: '' }))
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function del(id: string) {
    await expensesApi.delete(id)
    setExpenses(p => p.filter(e => e.id !== id))
  }

  const pieData = summary
    ? Object.entries(summary.by_category).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : []

  const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none focus:border-indigo-500/60 transition-all'

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-xl font-bold text-white">Expenses</h1>
        <div className="flex gap-2">
          {baby && (
            <a href={expensesApi.export(baby.id)} className="glass px-3 py-2 flex items-center gap-1 rounded-xl text-sm text-slate-300">
              <Download className="w-4 h-4" />
            </a>
          )}
          <button onClick={() => setShowForm(f => !f)} className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

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

      {/* Add form */}
      {showForm && (
        <div className="glass-strong p-4 flex flex-col gap-3 slide-up">
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
          <button onClick={save} disabled={saving || !form.amount}
            className="btn-glow bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Save Expense
          </button>
        </div>
      )}

      {/* Pie chart + list — side by side on lg */}
      {pieData.length > 0 && (
        <div className="glass p-4 slide-up-2 lg:col-span-1">
          <p className="text-sm font-medium text-slate-300 mb-2">Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={CAT_COLORS[entry.name] ?? '#6366f1'} />)}
              </Pie>
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toFixed(0)}`} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
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
              <p className="text-xs text-slate-500">{format(new Date(e.date), 'dd MMM')}</p>
            </div>
            <button onClick={() => del(e.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all ml-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
