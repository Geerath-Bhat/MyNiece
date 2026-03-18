import { api } from './client'

export interface GrowthEntry {
  id: string
  baby_id: string
  date: string
  weight_kg: number
  height_cm: number | null
  head_cm: number | null
  note: string | null
  created_at: string
}

export const growthApi = {
  list: (babyId: string) =>
    api.get<GrowthEntry[]>(`/babies/${babyId}/weight`).then(r => r.data),
  add: (babyId: string, data: { date: string; weight_kg: number; height_cm?: number; head_cm?: number; note?: string }) =>
    api.post<GrowthEntry>(`/babies/${babyId}/weight`, data).then(r => r.data),
  delete: (babyId: string, entryId: string) =>
    api.delete(`/babies/${babyId}/weight/${entryId}`),
}
