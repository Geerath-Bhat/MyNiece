import { api } from './client'

export interface UserOut {
  id: string
  email: string
  display_name: string
  timezone: string
  role: string           // 'admin' | 'verified' | 'member'
  household_id: string
  is_verified: boolean
  avatar_url: string | null
  theme: string
  telegram_chat_id: string | null
}

export interface AdminStats {
  total_users: number
  verified_users: number
  total_households: number
  total_babies: number
  total_activity_logs: number
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserOut
}

export interface OTPChallengeResponse {
  otp_required: true
  user_id: string
  email_hint: string
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
    api.post<AuthResponse | OTPChallengeResponse>('/auth/login', data).then((r) => r.data),

  verifyOtp: (data: { user_id: string; code: string }) =>
    api.post<AuthResponse>('/auth/verify-otp', data).then((r) => r.data),

  resendOtp: (userId: string) =>
    api.post('/auth/resend-otp', { user_id: userId, code: '' }).then((r) => r.data),

  me: () => api.get<UserOut>('/auth/me').then((r) => r.data),

  patchMe: (data: { display_name?: string; timezone?: string; telegram_chat_id?: string }) =>
    api.patch<UserOut>('/auth/me', data).then((r) => r.data),

  householdMembers: () =>
    api.get<UserOut[]>('/auth/household/members').then((r) => r.data),

  householdInviteCode: () =>
    api.get<{ invite_code: string; household_name: string }>('/auth/household/invite-code').then((r) => r.data),

  removeMember: (userId: string) =>
    api.delete(`/auth/household/members/${userId}`),
}

export const adminApi = {
  users: () => api.get<UserOut[]>('/admin/users').then(r => r.data),
  verify: (userId: string) => api.patch<UserOut>(`/admin/users/${userId}/verify`).then(r => r.data),
  unverify: (userId: string) => api.patch<UserOut>(`/admin/users/${userId}/unverify`).then(r => r.data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  stats: () => api.get<AdminStats>('/admin/stats').then(r => r.data),
}
