// Service worker for the customers' installed app (/account/, spec
// docs/specs/customer-app.md). The account always loads fresh from the website;
// the only thing kept is offline.html, shown when a page is opened with no
// network. Chrome also needs a fetch handler before it offers one-tap install.
const CACHE = 'clc-account-v1'
const OFFLINE = new URL('offline.html', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE).then((r) => r ?? Response.error())))
})
