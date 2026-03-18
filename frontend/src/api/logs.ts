import { api } from './client'

export interface ActivityLog {
  id: string; baby_id: string; type: string; timestamp: string
  diaper_type?: string
  feed_type?: string        // breast_left | breast_right | both_breasts | bottle
  duration_minutes?: number
  volume_ml?: number
  custom_label?: string; notes?: string
  logged_by?: string; logged_by_name?: string
}
export interface LastFeed {
  timestamp: string; minutes_since: number; next_due_at: string
}
export interface LogsPage { total: number; items: ActivityLog[] }

export const logsApi = {
  list: (baby_id: string, params?: { type?: string; limit?: number; offset?: number }) =>
    api.get<LogsPage>('/logs', { params: { baby_id, ...params } }).then(r => r.data),

  create: (d: {
    baby_id: string; type: string; timestamp?: string
    diaper_type?: string
    feed_type?: string; duration_minutes?: number; volume_ml?: number
    custom_label?: string; notes?: string
  }) => api.post<ActivityLog>('/logs', d).then(r => r.data),

  lastFeed: (baby_id: string) => api.get<LastFeed>('/logs/last-feed', { params: { baby_id } }).then(r => r.data),

  delete: (id: string) => api.delete(`/logs/${id}`),
}
