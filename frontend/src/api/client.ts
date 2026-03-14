import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crybaby_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 or 403-with-no-token, clear and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const hasToken = !!localStorage.getItem('crybaby_token')
    if (status === 401 || (status === 403 && !hasToken)) {
      localStorage.removeItem('crybaby_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
