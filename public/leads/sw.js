// CLC Staff service worker: shows phone notifications for new customer
// messages (sent by the messageSync function through Firebase Cloud
// Messaging, data-only) and opens the app on tap. Nothing is cached: the app
// always loads fresh from the website. Spec: docs/specs/staff-alerts.md.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data?.json()?.data ?? {} } catch { /* not ours: show the default text */ }
  const options = {
    body: d.body || 'New customer message',
    icon: new URL('icons/icon-192.png', self.registration.scope).href,
    data: { link: d.link || '#messages' },
  }
  if (d.tag) Object.assign(options, { tag: d.tag, renotify: true })
  event.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'CLC Staff', options),
    self.navigator.setAppBadge?.().catch(() => {}),
  ]))
})

// Tap: focus the open app and take it there, or open it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.link || '#messages', self.registration.scope).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const app = wins.find((w) => w.url.startsWith(self.registration.scope))
    if (!app) return self.clients.openWindow(url)
    app.postMessage({ type: 'clc-open', url })
    return app.focus()
  })())
})
