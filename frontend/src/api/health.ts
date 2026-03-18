import { api } from './client'

export interface DoctorVisit {
  id: string
  baby_id: string
  date: string
  reason: string
  doctor_name: string | null
  notes: string | null
  next_appointment: string | null
  created_at: string
}

export interface Milestone {
  id: string
  baby_id: string
  milestone_key: string | null
  title: string
  category: string
  achieved_date: string
  notes: string | null
  created_at: string
}

export interface VaccineRecord {
  id: string
  baby_id: string
  vaccine_key: string
  given_date: string
  notes: string | null
  created_at: string
}

export const healthApi = {
  listVisits: (babyId: string) =>
    api.get<DoctorVisit[]>('/health/visits', { params: { baby_id: babyId } }).then(r => r.data),
  addVisit: (babyId: string, data: { date: string; reason: string; doctor_name?: string; notes?: string; next_appointment?: string }) =>
    api.post<DoctorVisit>('/health/visits', data, { params: { baby_id: babyId } }).then(r => r.data),
  deleteVisit: (visitId: string) =>
    api.delete(`/health/visits/${visitId}`),

  listVaccines: (babyId: string) =>
    api.get<VaccineRecord[]>('/health/vaccines', { params: { baby_id: babyId } }).then(r => r.data),
  markVaccine: (babyId: string, data: { vaccine_key: string; given_date: string; notes?: string }) =>
    api.post<VaccineRecord>('/health/vaccines', data, { params: { baby_id: babyId } }).then(r => r.data),
  unmarkVaccine: (recordId: string) =>
    api.delete(`/health/vaccines/${recordId}`),

  listMilestones: (babyId: string) =>
    api.get<Milestone[]>('/health/milestones', { params: { baby_id: babyId } }).then(r => r.data),
  addMilestone: (babyId: string, data: { title: string; category: string; achieved_date: string; milestone_key?: string; notes?: string }) =>
    api.post<Milestone>('/health/milestones', data, { params: { baby_id: babyId } }).then(r => r.data),
  deleteMilestone: (milestoneId: string) =>
    api.delete(`/health/milestones/${milestoneId}`),
}
