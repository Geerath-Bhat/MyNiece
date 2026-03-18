import { api } from './client'

export interface FeedDay {
  date: string; count: number; timestamps: string[]
  avg_duration_minutes?: number | null
  total_duration_minutes?: number | null
}
export interface FeedingAnalytics {
  feeds: FeedDay[]; avg_interval_minutes: number | null; last_feed_at: string | null
  avg_duration_minutes?: number | null
  feed_type_counts?: Record<string, number>
}
export interface DiaperDay { date: string; wet: number; dirty: number; both: number }
export interface DiaperAnalytics { by_day: DiaperDay[]; total: number }
export interface WeeklySummary {
  week_start: string; total_feeds: number; total_diapers: number
  avg_feeding_interval_hours: number | null
  avg_feed_duration_minutes?: number | null
  total_feed_duration_minutes?: number | null
  last_weight_kg: number | null; weight_change_kg: number | null
}
export interface HeatmapPoint { hour: number; day_of_week: number; count: number }
export interface ActivityHeatmap { heatmap: HeatmapPoint[] }

export const analyticsApi = {
  feeding: (baby_id: string, days = 7) => api.get<FeedingAnalytics>('/analytics/feeding', { params: { baby_id, days } }).then(r => r.data),
  diapers: (baby_id: string, days = 7) => api.get<DiaperAnalytics>('/analytics/diapers', { params: { baby_id, days } }).then(r => r.data),
  weekly: (baby_id: string) => api.get<WeeklySummary>('/analytics/weekly-summary', { params: { baby_id } }).then(r => r.data),
  heatmap: (baby_id: string, days = 30, type = 'diaper') => api.get<ActivityHeatmap>('/analytics/activity-heatmap', { params: { baby_id, days, type } }).then(r => r.data),
}
