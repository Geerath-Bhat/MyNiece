import { api } from './client'

export interface UserOut {
  id: string
  email: string
  display_name: string
  timezone: string
  role: string
  household_id: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserOut
}

export const authApi = {
  register: (data: {
    email: string
    password: string
    display_name: string
    timezone?: string
    household_name?: string
    invite_code?: string
  }) => api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  me: () => api.get<UserOut>('/auth/me').then((r) => r.data),

  patchMe: (data: { display_name?: string; timezone?: string }) =>
    api.patch<UserOut>('/auth/me', data).then((r) => r.data),

  householdMembers: () =>
    api.get<UserOut[]>('/auth/household/members').then((r) => r.data),

  removeMember: (userId: string) =>
    api.delete(`/auth/household/members/${userId}`),
}
