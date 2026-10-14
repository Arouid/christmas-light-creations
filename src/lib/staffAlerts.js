// New-message alerts in the staff app: the 💬 list and count, and the state
// of phone notifications on this device. What a message says and links to
// lives in functions/staffPush.js, shared with the server's notifications.
// Spec: docs/specs/staff-alerts.md.
export * from '../../functions/staffPush.js'

// The list's rules (last 7 days, requests, reports, who still needs someone)
// live in functions/nudge.js, shared with the server's "still waiting" nudge.
export { COVER_MS, LIST_DAYS, WAIT_MS, chatItems, countOpen, coverage, coveredBy, listSince, needsSomeone, personKey, recentIncoming, reportItems, requestItems, toMs } from '../../functions/nudge.js'
import { toMs } from '../../functions/nudge.js'

// New = arrived after you last opened the list (never opened: all of them).
// Only used while the activity log isn't available (rules not published).
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
