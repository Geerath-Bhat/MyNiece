import { api } from './client'

export interface Reminder {
  id: string; baby_id: string; type: string; label: string
  interval_minutes?: number; time_of_day?: string; offset_minutes?: number
  is_enabled: boolean; next_fire_at?: string; created_at: string
}

export const remindersApi = {
  list: (baby_id?: string) => api.get<Reminder[]>('/reminders', { params: baby_id ? { baby_id } : {} }).then(r => r.data),
  create: (d: Partial<Reminder> & { baby_id: string; type: string; label: string }) => api.post<Reminder>('/reminders', d).then(r => r.data),
  patch: (id: string, d: Partial<Reminder>) => api.patch<Reminder>(`/reminders/${id}`, d).then(r => r.data),
  toggle: (id: string, is_enabled: boolean) => api.patch<Reminder>(`/reminders/${id}/toggle`, { is_enabled }).then(r => r.data),
  delete: (id: string) => api.delete(`/reminders/${id}`),
}
