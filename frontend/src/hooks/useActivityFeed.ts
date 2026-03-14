import { useEffect, useRef, useState, useCallback } from 'react'

export interface FeedEvent {
  type: 'activity_log' | 'sleep_start' | 'sleep_end'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
}

interface UseActivityFeedOptions {
  babyId: string | null
  onEvent: (event: FeedEvent) => void
}

export function useActivityFeed({ babyId, onEvent }: UseActivityFeedOptions) {
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(1000)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (!babyId) return
    const token = localStorage.getItem('crybaby_token')
    if (!token) return

    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
    const url = `${base}/api/sse/feed?baby_id=${babyId}&token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setConnected(true)
      retryDelayRef.current = 1000 // reset backoff on successful connect
    }

    es.onmessage = (e) => {
      try {
        const event: FeedEvent = JSON.parse(e.data)
        onEventRef.current(event)
      } catch {
        // ignore malformed messages
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      esRef.current = null
      // Exponential backoff: 1s → 2s → 4s → ... capped at 30s
      const delay = retryDelayRef.current
      retryDelayRef.current = Math.min(delay * 2, 30_000)
      retryRef.current = setTimeout(connect, delay)
    }
  }, [babyId])

  useEffect(() => {
    connect()

    // Reconnect when tab becomes visible again
    const onVisible = () => { if (document.visibilityState === 'visible') connect() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (retryRef.current) clearTimeout(retryRef.current)
      esRef.current?.close()
      esRef.current = null
      setConnected(false)
    }
  }, [connect])

  return { connected }
}
