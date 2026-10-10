// The staff app's service worker (public/leads/sw.js), run in a fake worker
// scope: what a push shows and where a tap goes. Spec: docs/specs/staff-alerts.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const SCOPE = 'https://christmas-light-creations.com/leads/'
const src = readFileSync('public/leads/sw.js', 'utf8')

function worker({ wins = [] } = {}) {
  const on = {}
  const seen = { shown: [], opened: [], badge: 0 }
  const self = {
    addEventListener: (type, fn) => { on[type] = fn },
    skipWaiting: () => {},
    registration: { scope: SCOPE, showNotification: async (title, options) => { seen.shown.push({ title, ...options }) } },
    clients: { claim: async () => {}, matchAll: async () => wins, openWindow: async (url) => { seen.opened.push(url) } },
    navigator: { setAppBadge: async () => { seen.badge++ } },
  }
  vm.runInNewContext(src, { self, URL, Promise })
  const fire = async (type, event) => {
    let work
    on[type]({ ...event, waitUntil: (p) => { work = p } })
    await work
  }
  return { fire, seen }
}
const pushOf = (payload) => ({ data: { json: () => (typeof payload === 'string' ? JSON.parse(payload) : payload) } })
const window = (url) => {
  const w = { url, posted: [], focused: 0 }
  w.postMessage = (m) => w.posted.push(m)
  w.focus = async () => { w.focused++ }
  return w
}

test('a push shows our title, preview and icon, replaces the same person’s older one, and marks the app icon', async () => {
  const { fire, seen } = worker()
  await fire('push', pushOf({ from: '448935757441', data: { title: 'Text from Sample Customer', body: 'Thursday works', link: '#accounts/customer/sample-customer', tag: 'customer:sample-customer' } }))
  assert.deepEqual(JSON.parse(JSON.stringify(seen.shown)), [{
    title: 'Text from Sample Customer', body: 'Thursday works', icon: `${SCOPE}icons/icon-192.png`,
    data: { link: '#accounts/customer/sample-customer' }, tag: 'customer:sample-customer', renotify: true,
  }])
  assert.equal(seen.badge, 1)
})

test('a push we can’t read still shows something (browsers require it)', async () => {
  const { fire, seen } = worker()
  await fire('push', { data: { json: () => { throw new SyntaxError('not JSON') } } })
  await fire('push', {})
  assert.deepEqual(seen.shown.map((n) => [n.title, n.body, n.data.link, n.tag]), [
    ['CLC Staff', 'New customer message', '#messages', undefined],
    ['CLC Staff', 'New customer message', '#messages', undefined],
  ])
})

test('tap with the app closed: opens it at the link', async () => {
  const { fire, seen } = worker()
  const notification = { data: { link: '#accounts/lead/demo-2' }, close: () => {} }
  await fire('notificationclick', { notification })
  assert.deepEqual(seen.opened, [`${SCOPE}#accounts/lead/demo-2`])
})

test('tap with the app open: focuses it and tells it where to go (other sites’ windows ignored)', async () => {
  const other = window('https://christmas-light-creations.com/')
  const app = window(`${SCOPE}?x#map`)
  const { fire, seen } = worker({ wins: [other, app] })
  let closed = 0
  await fire('notificationclick', { notification: { data: { link: '#messages' }, close: () => { closed++ } } })
  assert.equal(closed, 1)
  assert.deepEqual(seen.opened, [])
  assert.deepEqual(JSON.parse(JSON.stringify(app.posted)), [{ type: 'clc-open', url: `${SCOPE}#messages` }])
  assert.equal(app.focused, 1)
  assert.equal(other.focused, 0)
})
