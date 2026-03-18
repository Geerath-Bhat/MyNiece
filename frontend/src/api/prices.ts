import { api } from './client'

export const pricesApi = {
  get: () => api.get<{ prices: Record<string, number> }>('/prices').then(r => r.data.prices),
  set: (item: string, price_inr: number) =>
    api.put(`/prices/${encodeURIComponent(item)}`, { item, price_inr }).then(r => r.data),
  remove: (item: string) => api.delete(`/prices/${encodeURIComponent(item)}`),
}
