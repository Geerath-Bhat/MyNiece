import { api } from './client'

export interface SleepSession {
  id: string
  baby_id: string
  logged_by: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  quality: string | null
  notes: string | null
  created_at: string
}

export const sleepApi = {
  list: (babyId: string, params?: { limit?: number; offset?: number }) =>
    api.get<{ total: number; items: SleepSession[] }>('/sleep', { params: { baby_id: babyId, ...params } }).then(r => r.data),

  active: (babyId: string) =>
    api.get<SleepSession | null>('/sleep/active', { params: { baby_id: babyId } }).then(r => r.data),

  start: (body: { baby_id: string; notes?: string; quality?: string }) =>
    api.post<SleepSession>('/sleep', body).then(r => r.data),

  end: (sessionId: string, body?: { quality?: string; notes?: string }) =>
    api.patch<SleepSession>(`/sleep/${sessionId}/end`, body ?? {}).then(r => r.data),

  delete: (sessionId: string) => api.delete(`/sleep/${sessionId}`),
}
