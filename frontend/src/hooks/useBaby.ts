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
    }).catch(() => setNoBaby(true))
    .finally(() => setLoading(false))
  }, [activeBabyId, setActiveBabyId])

  return { baby, babies, loading, noBaby }
}
