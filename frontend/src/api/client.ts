import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token + optional as_household param on every request.
// as_household is read directly from the persisted Zustand store in localStorage
// so it survives page reloads without any extra init step.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crybaby_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  try {
    const raw = localStorage.getItem('crybaby-household')
    if (raw) {
      const id = JSON.parse(raw)?.state?.selectedHousehold?.id
      if (id) config.params = { ...(config.params ?? {}), as_household: id }
    }
  } catch { /* ignore parse errors */ }

  return config
})

// On 401 or 403-with-no-token → redirect to login
// On 403-with-token → likely "account needs verification" — surface to UI via custom error
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const hasToken = !!localStorage.getItem('crybaby_token')
    if (status === 401 || (status === 403 && !hasToken)) {
      localStorage.removeItem('crybaby_token')
      window.location.href = '/login'
    }
    if (err.response?.data?.detail) {
      err.userMessage = err.response.data.detail
    }
    return Promise.reject(err)
  }
)
