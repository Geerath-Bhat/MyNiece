import { useState, useEffect } from 'react'
import { Plus, Wallet, Loader2, Trash2, Download, Pencil, X, Settings2, Check, Repeat2, Receipt } from 'lucide-react'
import { expensesApi } from '@/api/expenses'
import type { Expense, ExpenseSummary } from '@/api/expenses'
import { pricesApi } from '@/api/prices'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { toast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { parseUTC } from '@/utils/dates'

const CATEGORIES = ['diapers', 'formula', 'medicine', 'products', 'doctor', 'other'] as const

const CAT_TO_PRICE_KEY: Record<string, string> = {
  diapers: 'diaper',
  formula: 'feed',
}

const PRESET_PRICE_ITEMS = [
  { key: 'diaper',                    label: 'Diaper change',         hint: 'per diaper'  },
  { key: 'feed',                      label: 'Formula feed',          hint: 'per session' },
  { key: 'custom:vitamin d drops',    label: 'Vitamin D drops',       hint: 'per drop'    },
  { key: 'custom:pre-feed exercise',  label: 'Pre-feed exercise oil', hint: 'per session' },
]

const PRESET_KEYS = new Set(PRESET_PRICE_ITEMS.map(p => p.key))

const CAT_COLORS: Record<string, string> = {
  diapers: '#6366f1', formula: '#8b5cf6', medicine: '#ef4444',
  products: '#06b6d4', doctor: '#10b981', other: '#f59e0b',
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
  const [rememberPrice, setRememberPrice] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeletePrice, setConfirmDeletePrice] = useState<string | null>(null)
  const [showPrices, setShowPrices] = useState(false)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})
  const [savingPrice, setSavingPrice] = useState<string | null>(null)
  const currentMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    pricesApi.get().then(p => {
      setPrices(p)
      setPriceInputs(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])))
    }).catch(() => {})
  }, [])

  async function handleSavePrice(key: string) {
    const val = parseFloat(priceInputs[key] ?? '')
    if (isNaN(val) || val < 0) { toast('Enter a valid price', 'error'); return }
    setSavingPrice(key)
    try {
      if (val === 0) {
        await pricesApi.remove(key)
        setPrices(p => { const n = { ...p }; delete n[key]; return n })
        toast('Auto-expense disabled for this item', 'success')
      } else {
        await pricesApi.set(key, val)
        setPrices(p => ({ ...p, [key]: val }))
        toast('Price saved!', 'success')
      }
    } catch {
      toast('Failed to save price', 'error')
    } finally {
      setSavingPrice(null)
    }
  }

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
    setRememberPrice(false)
    setShowForm(true)
  }

  function openEdit(e: Expense) {
    setEditingId(e.id)
    setForm({ amount: String(e.amount), category: e.category, date: e.date, note: e.note ?? '' })
    setRememberPrice(false)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK_FORM)
    setRememberPrice(false)
  }

  function selectCategory(c: string) {
    const priceKey = CAT_TO_PRICE_KEY[c]
    const autoAmount = priceKey && prices[priceKey] ? String(prices[priceKey]) : ''
    setForm(f => ({ ...f, category: c, amount: autoAmount || f.amount }))
  }

  function getRememberKey(): string | null {
    const preset = CAT_TO_PRICE_KEY[form.category]
    if (preset) return preset
    const note = form.note.trim().toLowerCase()
    if (note) return `custom:${note}`
    return null
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
        await expensesApi.create({
          baby_id: baby.id,
          amount: parseFloat(form.amount),
          category: form.category,
          date: form.date,
          note: form.note || undefined,
        })
        if (rememberPrice) {
          const key = getRememberKey()
          const val = parseFloat(form.amount)
          if (key && val > 0) {
            await pricesApi.set(key, val)
            setPrices(p => ({ ...p, [key]: val }))
            setPriceInputs(p => ({ ...p, [key]: String(val) }))
          }
        }
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
    setConfirmDelete(null)
  }

  const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none focus:border-indigo-500/60 transition-all'

  const allPriceItems = [
    ...PRESET_PRICE_ITEMS,
    ...Object.keys(prices)
      .filter(k => !PRESET_KEYS.has(k))
      .map(k => ({ key: k, label: k.replace('custom:', ''), hint: 'custom' })),
  ]

  const rememberKey = !editingId ? getRememberKey() : null
  const existingPrice = rememberKey ? prices[rememberKey] : undefined
  const showRemember = !editingId && !!form.amount && !!rememberKey

  // Category breakdown for summary
  const catTotals = CATEGORIES.map(c => ({
    cat: c,
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)
  const grandTotal = summary?.total ?? 0

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between slide-up">
          <h1 className="text-xl font-bold text-white">Expenses</h1>
          <div className="flex gap-2">
            {baby && (
              <button
                onClick={() => expensesApi.exportCSV(baby.id).catch(() => alert('Export failed'))}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                title="Download CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button onClick={() => setShowPrices(v => !v)}
                title="Auto-expense prices"
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                style={{
                  background: showPrices ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                  border: showPrices ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                <Settings2 className={`w-4 h-4 ${showPrices ? 'text-emerald-400' : 'text-slate-400'}`} />
              </button>
            )}
            {canEdit && (
              <button onClick={showForm && !editingId ? closeForm : openAdd}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(124,58,237,0.8))', border: '1px solid rgba(167,139,250,0.3)' }}>
                {showForm && !editingId ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showForm && !editingId ? 'Cancel' : 'Add'}
              </button>
            )}
          </div>
        </div>

        {!canEdit && <ReadOnlyBanner />}

        {/* Auto-expense prices panel */}
        {showPrices && canEdit && (
          <div className="flex flex-col gap-2 slide-up">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auto-expense prices</p>
              <p className="text-xs text-slate-500">Set ₹0 to disable</p>
            </div>
            {allPriceItems.map(({ key, label, hint }) => {
              const itemColor = key === 'diaper' ? '#6366f1' : key === 'feed' ? '#8b5cf6' : '#10b981'
              const isSet = !!prices[key]
              return (
                <div key={key}
                  className="card-surface group flex items-center gap-3 px-3.5 py-3"
                  style={{ borderLeft: `3px solid ${itemColor}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${itemColor}18` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: itemColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 capitalize">{label}</p>
                    <p className="text-xs text-slate-500">{hint} · {isSet ? `₹${prices[key]} saved` : 'not set'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">₹</span>
                    <input
                      type="number" min="0" step="0.5"
                      value={priceInputs[key] ?? ''}
                      onChange={e => setPriceInputs(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 text-right"
                    />
                    <button
                      onClick={() => handleSavePrice(key)}
                      disabled={savingPrice === key}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      {savingPrice === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => setConfirmDeletePrice(key)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
            {allPriceItems.length === 0 && (
              <div className="card-surface p-6 text-center text-slate-500 text-sm">
                No prices set yet. Add an expense and use "Remember this price".
              </div>
            )}
          </div>
        )}

        {/* Month summary card */}
        <div className="rounded-3xl p-4 slide-up-1"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.06) 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{format(new Date(), 'MMMM yyyy')}</p>
              <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                ₹{grandTotal.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Category breakdown bars */}
          {catTotals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {catTotals.slice(0, 4).map(({ cat, total }) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[cat] }} />
                  <span className="text-[11px] text-slate-400 capitalize w-16 shrink-0">{cat}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(124,58,237,0.10)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${grandTotal > 0 ? (total / grandTotal) * 100 : 0}%`,
                        background: CAT_COLORS[cat],
                        opacity: 0.7,
                      }} />
                  </div>
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: CAT_COLORS[cat] }}>
                    ₹{total.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="card-surface p-4 flex flex-col gap-3 slide-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {editingId ? 'Edit Expense' : 'New Expense'}
            </p>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} type="number" placeholder="Amount (₹)" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <input className={`${inputCls} w-36`} type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const priceKey = CAT_TO_PRICE_KEY[c]
                const unitPrice = priceKey && prices[priceKey]
                return (
                  <button key={c} type="button" onClick={() => selectCategory(c)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all flex flex-col items-center"
                    style={form.category === c
                      ? { background: `${CAT_COLORS[c]}33`, border: `1px solid ${CAT_COLORS[c]}66`, color: CAT_COLORS[c] }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }
                    }>
                    {c}
                    {unitPrice ? <span className="text-[10px] opacity-60">₹{unitPrice}</span> : null}
                  </button>
                )
              })}
            </div>
            <input className={inputCls} placeholder="Note (optional)" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />

            {showRemember && (
              <div
                onClick={() => setRememberPrice(v => !v)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all select-none ${
                  rememberPrice
                    ? 'bg-emerald-500/10 border-emerald-500/25'
                    : 'bg-white/3 border-white/8 hover:bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  rememberPrice ? 'bg-emerald-500/20' : 'bg-white/5'
                }`}>
                  <Repeat2 className={`w-4 h-4 transition-colors ${rememberPrice ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium transition-colors ${rememberPrice ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {existingPrice ? `Update to ₹${form.amount} per use` : `Remember ₹${form.amount} per use`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Auto-add to expenses when activity is logged</p>
                </div>
                <div className={`w-9 h-5 rounded-full transition-all shrink-0 relative ${rememberPrice ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${rememberPrice ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300"
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

        {/* Expense list */}
        <div className="flex flex-col gap-2 slide-up-3">
          {/* Section header */}
          {expenses.length > 0 && (
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Receipt className="w-3 h-3 text-amber-400" />
              </div>
              <p className="text-xs font-semibold text-slate-400">This Month</p>
              <span className="text-[10px] text-slate-500">{expenses.length} entries</span>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="glass p-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Receipt className="w-7 h-7 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">No expenses this month</p>
                <p className="text-xs text-slate-500 mt-1">Tap Add to log your first expense</p>
              </div>
            </div>
          ) : expenses.map(e => (
            <div key={e.id}
              className="card-surface group flex items-center gap-3 px-3.5 py-3 transition-all"
              style={{ borderLeft: `3px solid ${CAT_COLORS[e.category]}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${CAT_COLORS[e.category]}15` }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[e.category] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-200 capitalize">{e.category}</p>
                  {e.note?.startsWith('Auto:') && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                      Auto
                    </span>
                  )}
                </div>
                {e.note && <p className="text-xs text-slate-500 truncate mt-0.5">{e.note.replace(/^Auto:\s*/, '')}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold" style={{ color: CAT_COLORS[e.category] }}>₹{e.amount}</p>
                <p className="text-xs text-slate-500">{format(parseUTC(e.date), 'dd MMM')}</p>
              </div>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all ml-1">
                  <button onClick={() => openEdit(e)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(e.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete expense modal */}
      {confirmDelete && (() => {
        const e = expenses.find(x => x.id === confirmDelete)
        if (!e) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(null)}>
            <div className="w-full max-w-xs modal-surface rounded-3xl p-6 flex flex-col gap-4"
              onClick={ev => ev.stopPropagation()}>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto"
                style={{ background: 'rgba(248,113,113,0.1)' }}>
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white mb-1">Delete expense?</p>
                <p className="text-sm text-slate-400">
                  <span className="text-slate-200 capitalize">{e.category}</span> · ₹{e.amount} will be removed.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  Cancel
                </button>
                <button onClick={() => del(confirmDelete)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete price modal */}
      {confirmDeletePrice && (() => {
        const label = PRESET_PRICE_ITEMS.find(p => p.key === confirmDeletePrice)?.label
          ?? confirmDeletePrice.replace('custom:', '')
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmDeletePrice(null)}>
            <div className="w-full max-w-xs modal-surface rounded-3xl p-6 flex flex-col gap-4"
              onClick={ev => ev.stopPropagation()}>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto"
                style={{ background: 'rgba(248,113,113,0.1)' }}>
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white mb-1">Remove tracked price?</p>
                <p className="text-sm text-slate-400">
                  <span className="text-slate-200 capitalize">{label}</span> will stop auto-logging expenses.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDeletePrice(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await pricesApi.remove(confirmDeletePrice)
                    setPrices(p => { const n = { ...p }; delete n[confirmDeletePrice]; return n })
                    setPriceInputs(p => { const n = { ...p }; delete n[confirmDeletePrice]; return n })
                    setConfirmDeletePrice(null)
                    toast('Price removed', 'success')
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
