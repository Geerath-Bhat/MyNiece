import { useState, useEffect, useCallback } from 'react'
import { logsApi } from '@/api/logs'

export function useNextFeed(babyId: string | null) {
  const [lastFedAt, setLastFedAt] = useState<Date | null>(null)
  const [nextDueAt, setNextDueAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!babyId) return
    try {
      const data = await logsApi.lastFeed(babyId)
      setLastFedAt(new Date(data.timestamp))
      setNextDueAt(new Date(data.next_due_at))
    } catch {
      // No feed logged yet — leave null
    } finally {
      setLoading(false)
    }
  }, [babyId])

  useEffect(() => {
    setLoading(true)
    fetch()
    const id = setInterval(fetch, 60_000)  // re-poll every minute
    return () => clearInterval(id)
  }, [fetch])

  function optimisticFeed() {
    const now = new Date()
    setLastFedAt(now)
    setNextDueAt(new Date(now.getTime() + 150 * 60_000))
  }

  return { lastFedAt, nextDueAt, loading, refresh: fetch, optimisticFeed }
}
