/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Push notification handler ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json() as {
    title?: string
    body?: string
    icon?: string
    badge?: string
    data?: { url?: string; alarm?: boolean }
  }

  const isAlarm = data.data?.alarm === true
  const title = data.title ?? 'CryBaby'
  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/icon-192.png',
    badge: data.badge ?? '/icons/icon-192.png',
    data: { url: data.data?.url ?? '/', alarm: isAlarm },
    vibrate: isAlarm
      ? [300, 100, 300, 100, 300, 200, 500]  // strong pattern for reminders
      : [200, 100, 200],
    requireInteraction: isAlarm,              // reminder stays until dismissed
  } as NotificationOptions

  const showPromise = self.registration.showNotification(title, options)

  // Tell any open app windows to play the alarm sound
  const notifyClients = isAlarm
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'REMINDER_ALARM' }))
      })
    : Promise.resolve()

  event.waitUntil(Promise.all([showPromise, notifyClients]))
})

// ── Notification click: open/focus the app ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
