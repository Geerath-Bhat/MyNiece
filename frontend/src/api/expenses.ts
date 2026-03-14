import { api } from './client'

export interface Expense {
  id: string; baby_id: string; amount: number; category: string; date: string; note?: string; user_id?: string
}
export interface ExpensesPage { total_amount: number; items: Expense[] }
export interface ExpenseSummary { total: number; by_category: Record<string, number> }

export const expensesApi = {
  list: (baby_id: string, params?: { month?: string; category?: string }) =>
    api.get<ExpensesPage>('/expenses', { params: { baby_id, ...params } }).then(r => r.data),
  create: (d: { baby_id: string; amount: number; category: string; date: string; note?: string }) =>
    api.post<Expense>('/expenses', d).then(r => r.data),
  patch: (id: string, d: Partial<Expense>) => api.patch<Expense>(`/expenses/${id}`, d).then(r => r.data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  summary: (baby_id: string, month?: string) =>
    api.get<ExpenseSummary>('/expenses/summary', { params: { baby_id, month } }).then(r => r.data),
  exportCSV: async (baby_id: string): Promise<void> => {
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
    const token = localStorage.getItem('crybaby_token') ?? ''
    const resp = await fetch(`${base}/api/expenses/export?baby_id=${baby_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) throw new Error('Export failed')
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses_${baby_id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
