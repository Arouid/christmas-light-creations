// New-message alerts in the staff app: the 💬 list and count, and the state
// of phone notifications on this device. What a message says and links to
// lives in functions/staffPush.js, shared with the server's notifications.
// Spec: docs/specs/staff-alerts.md.
import { isAlert } from '../../functions/staffPush.js'

export * from '../../functions/staffPush.js'

export const LIST_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

// Firestore timestamp, Date, ISO string or milliseconds -> ms (0 if none).
export const toMs = (t) => {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t === 'number') return t
  return Date.parse(t) || 0
}

export const listSince = (now = Date.now()) => now - LIST_DAYS * DAY

// Synced messages -> the ones the list shows: incoming, last 7 days, newest first.
export function recentIncoming(items, now = Date.now()) {
  const since = listSince(now)
  const when = (m) => Date.parse(m.at) || toMs(m.syncedAt)
  return (items ?? []).filter((m) => isAlert(m) && toMs(m.syncedAt) >= since).sort((a, b) => when(b) - when(a))
}

// New = arrived after you last opened the list (never opened: all of them).
export const isNew = (m, seenAt) => toMs(m.syncedAt) > toMs(seenAt)
export const countNew = (list, seenAt) => list.filter((m) => isNew(m, seenAt)).length

// Phone notifications on this device. Order matters: the first thing that
// stops it is what the panel explains.
export function pushState({ prefsError, vapidKey, supported, ios, standalone, permission, on }) {
  if (prefsError) return 'rules'
  if (!vapidKey) return 'no-key'
  if (!supported) return ios && !standalone ? 'ios-install' : 'unsupported'
  if (permission === 'denied') return 'blocked'
  return on ? 'on' : 'off'
}

// A name for this device in the staff member's list ("iPhone", "Chrome on Windows").
export function deviceName(ua = '') {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) return 'iPad'
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
}
