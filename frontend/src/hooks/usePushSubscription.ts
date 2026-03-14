import { useState, useEffect } from 'react'
import { pushApi } from '@/api/push'

function urlB64ToUint8Array(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const [subscribed, setSubscribed] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  async function subscribe() {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey || !supported) return

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey),
      })
    }
    await pushApi.subscribe(sub.toJSON(), navigator.userAgent.slice(0, 50))
    setSubscribed(true)
  }

  return { subscribed, supported, subscribe }
}
