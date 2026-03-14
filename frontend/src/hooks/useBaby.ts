import { useState, useEffect } from 'react'
import { babiesApi } from '@/api/babies'
import type { Baby } from '@/api/babies'
import { useAuthStore } from '@/store/authStore'

export function useBaby() {
  const { activeBabyId, setActiveBabyId } = useAuthStore()
  const [baby, setBaby] = useState<Baby | null>(null)
  const [babies, setBabies] = useState<Baby[]>([])
  const [loading, setLoading] = useState(true)
  const [noBaby, setNoBaby] = useState(false)

  useEffect(() => {
    babiesApi.list().then(list => {
      setBabies(list)
      if (list.length === 0) {
        setNoBaby(true)
      } else {
        const active = list.find(b => b.id === activeBabyId) ?? list[0]
        setBaby(active)
        setActiveBabyId(active.id)
      }
    }).catch((err) => {
      // Auth errors (401/403) are handled by the axios interceptor (redirect to login).
      // Only show the no-baby setup screen for genuine "no data" cases.
      const status = err?.response?.status
      if (!status || status >= 500) {
        setNoBaby(true) // network/server error — let user retry
      }
      // 401/403 → interceptor redirects to login, no state change needed
    }).finally(() => setLoading(false))
  }, [activeBabyId, setActiveBabyId])

  return { baby, babies, loading, noBaby }
}
