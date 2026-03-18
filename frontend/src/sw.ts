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
    data?: { url?: string; alarm?: boolean; reminder_type?: string; reminder_id?: string; dismiss_url?: string }
  }

  const isAlarm = data.data?.alarm === true
  const reminderType = data.data?.reminder_type ?? ''
  const reminderId = data.data?.reminder_id ?? ''
  const title = data.title ?? 'CryBaby'
  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/icon-192.png',
    badge: data.badge ?? '/icons/icon-192.png',
    data: { url: data.data?.url ?? '/', alarm: isAlarm, reminderType, reminderId, dismissUrl: data.data?.dismiss_url ?? '' },
    vibrate: isAlarm
      ? [600, 200, 600, 200, 600, 400, 1000]  // strong repeated pattern for alarms
      : [200, 100, 200],
    requireInteraction: isAlarm,
    // Same tag per reminder = each repeat replaces the old notification but re-triggers sound
    tag: isAlarm ? `alarm-${reminderId}` : 'crybaby-notif',
    renotify: isAlarm,
    actions: isAlarm ? [{ action: 'dismiss', title: '✓ Dismiss alarm' }] : [],
  } as NotificationOptions

  const showPromise = self.registration.showNotification(title, options)

  // Tell any open app windows to play the alarm sound
  const notifyClients = isAlarm
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'REMINDER_ALARM', reminderType }))
      })
    : Promise.resolve()

  event.waitUntil(Promise.all([showPromise, notifyClients]))
})

// ── Notification click: open/focus the app and play melody ───────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'
  const isAlarm = event.notification.data?.alarm === true
  const rType = (event.notification.data?.reminderType as string) ?? 'custom'
  const rId = (event.notification.data?.reminderId as string) ?? ''
  const dismissUrl = (event.notification.data?.dismissUrl as string) ?? ''

  // Dismiss button — tell backend to cancel repeat pushes, don't open app
  if (event.action === 'dismiss') {
    if (rId && dismissUrl) {
      fetch(`${dismissUrl}?reminder_id=${rId}`, { method: 'POST' }).catch(() => {})
    }
    return
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        let client: WindowClient | undefined = clientList.find(c => c.url.includes(self.location.origin)) as WindowClient | undefined
        if (client && 'focus' in client) {
          await client.navigate(targetUrl)
          client = await client.focus()
        } else {
          client = (await self.clients.openWindow(targetUrl)) ?? undefined
        }
        // Play melody after the page is focused/opened
        if (client && isAlarm) {
          client.postMessage({ type: 'REMINDER_ALARM', reminderType: rType })
        }
      })
  )
})
