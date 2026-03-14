import { api } from './client'

export interface PushSub { id: string; device_label?: string; created_at: string }

export const pushApi = {
  subscribe: (subscription: object, device_label?: string) =>
    api.post<PushSub>('/push/subscribe', { subscription, device_label }).then(r => r.data),
  list: () => api.get<PushSub[]>('/push/subscriptions').then(r => r.data),
  unsubscribe: (id: string) => api.delete(`/push/subscribe/${id}`),
  test: () => api.post('/push/test'),
  testTelegram: () => api.post('/push/test-telegram'),
  botInfo: () => api.get<{ bot_username: string | null }>('/push/bot-info').then(r => r.data),
}
