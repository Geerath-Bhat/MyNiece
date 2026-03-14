import { api } from './client'

export interface WeeklyInsight {
  week_start: string
  insight_text: string
  generated_at: string
}

export const insightsApi = {
  get: (babyId: string) =>
    api.get<WeeklyInsight>('/analytics/insights', { params: { baby_id: babyId } }).then(r => r.data),
}
