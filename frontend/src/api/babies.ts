import { api } from './client'

export interface Baby {
  id: string; name: string; date_of_birth: string; gender?: string; household_id: string; avatar_url?: string | null; created_at: string
}
export interface WeightLog {
  id: string; baby_id: string; date: string; weight_kg: number; note?: string; created_at: string
}

export const babiesApi = {
  list: () => api.get<Baby[]>('/babies').then(r => r.data),
  create: (d: { name: string; date_of_birth: string; gender?: string }) => api.post<Baby>('/babies', d).then(r => r.data),
  patch: (id: string, d: Partial<{ name: string; date_of_birth: string; gender: string }>) => api.patch<Baby>(`/babies/${id}`, d).then(r => r.data),
  listWeight: (id: string) => api.get<WeightLog[]>(`/babies/${id}/weight`).then(r => r.data),
  addWeight: (id: string, d: { date: string; weight_kg: number; note?: string }) => api.post<WeightLog>(`/babies/${id}/weight`, d).then(r => r.data),
  uploadAvatar: (babyId: string, file: File): Promise<Baby> => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Baby>(`/uploads/babies/${babyId}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
