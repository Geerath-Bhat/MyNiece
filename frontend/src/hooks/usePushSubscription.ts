import { useState, useEffect } from 'react'
import { pushApi } from '@/api/push'

function urlB64ToUint8Array(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Wrap serviceWorker.ready with a timeout so it never hangs forever
function swReadyWithTimeout(ms = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service worker took too long to activate')), ms)
    ),
  ])
}

export function usePushSubscription() {
  const [subscribed, setSubscribed] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (!ok) return

    swReadyWithTimeout().then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  async function subscribe() {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey || !supported) throw new Error('Push not supported or VAPID key missing')

    const reg = await swReadyWithTimeout(8000)
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
