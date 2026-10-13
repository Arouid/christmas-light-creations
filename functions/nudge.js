// Who still needs someone (docs/specs/staff-alerts.md): the 💬 list's rules,
// shared by the staff app (src/lib/staffAlerts.js re-exports this) and the
// server's "still waiting" nudge (owner 2026-10-12: "staff reminders for
// missed or forgotten emails/messages"). Every hour from 8 am to 8 pm
// Central, staffNudge (functions/index.js) lists customer texts, voicemails,
// missed calls, emails, website requests and problem reports that have waited
// more than WAIT_MS with nobody tapping I've got it / Take it over, and sends
// one phone notification plus one email to the alert list, again when the
// list changes or after NUDGE_GAP_MS. Pure: no Firebase.
import { KIND_WORD, isAlert, messageLink, previewOf, whoOf } from './staffPush.js'

export const LIST_DAYS = 7
export const WAIT_MS = 2 * 60 * 60 * 1000
export const NUDGE_GAP_MS = 4 * 60 * 60 * 1000
export const NUDGE_HOURS = '0 8-20 * * *' // Central, functions/index.js
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

// Website estimate requests -> list entries shaped like messages (spam/test left out).
export function requestItems(leads) {
  return (leads ?? []).filter((l) => l.status !== 'spam' && toMs(l.createdAt)).map((l) => ({
    id: `request-${l.id}`, kind: 'request', direction: 'in', leadId: l.id, status: l.status ?? 'new',
    at: new Date(toMs(l.createdAt)).toISOString(), syncedAt: toMs(l.createdAt),
    text: [l.city, l.message].filter(Boolean).join(' · '),
  }))
}

// Problems customers reported from their account (docs/specs/account-service.md)
// -> list entries shaped like messages. Calls staff logged themselves aren't alerts.
export function reportItems(calls) {
  return (calls ?? []).filter((c) => c.source === 'customer' && toMs(c.reportedAt)).map((c) => ({
    id: `report-${c.id}`, kind: 'report', direction: 'in', customerId: c.customerId, callId: c.id, status: c.status ?? 'Open',
    at: new Date(toMs(c.reportedAt)).toISOString(), syncedAt: toMs(c.reportedAt),
    text: [c.issue, c.details].filter(Boolean).join(' · '),
  }))
}

// Synced messages, requests and reports -> what the list shows: incoming, last 7 days, newest first.
export function recentIncoming(items, now = Date.now()) {
  const since = listSince(now)
  const when = (m) => Date.parse(m.at) || toMs(m.syncedAt)
  return (items ?? []).filter((m) => isAlert(m) && toMs(m.syncedAt) >= since).sort((a, b) => when(b) - when(a))
}

// Still needs someone (owner 2026-10-10: just opening the list mustn't clear
// it): nobody has tapped I've got it / Take it over, and an estimate request
// is still New, a problem report still Open. Dismissed ones are already out of
// the list. `handling` is anything with .has(id): the Map from
// src/lib/activity.js handlers(), or the Set from claimed() below.
export const needsSomeone = (m, handling) => !handling?.has?.(m.id)
  && !(m.kind === 'request' && m.status && m.status !== 'new')
  && !(m.kind === 'report' && m.status !== 'Open')
export const countOpen = (list, handling) => list.filter((m) => needsSomeone(m, handling)).length

// Activity entries -> the ids someone tapped I've got it / Take it over on.
export const CLAIMS = ['handling', 'takeover']
export const claimed = (activity) => new Set((activity ?? []).filter((e) => CLAIMS.includes(e.action) && e.target?.id).map((e) => e.target.id))

// Everything that has waited longer than waitMs with nobody on it, newest first.
export function waiting({ messages, leads, calls, activity, now = Date.now(), waitMs = WAIT_MS }) {
  const handling = claimed(activity)
  const list = recentIncoming([...(messages ?? []), ...requestItems(leads), ...reportItems(calls)], now)
  return list.filter((m) => needsSomeone(m, handling) && now - (Date.parse(m.at) || toMs(m.syncedAt)) >= waitMs)
}

// serverState/staffNudge: { at, key }. Send when the list changed or the gap has passed.
export const nudgeKey = (items) => items.map((m) => m.id).sort().join(',')
export function nudgeDue(state, items, now = Date.now()) {
  if (!items.length) return false
  const key = nudgeKey(items)
  return state?.key !== key || now - toMs(state?.at) >= NUDGE_GAP_MS
}

const hoursAgo = (m, now) => Math.max(1, Math.round((now - (Date.parse(m.at) || toMs(m.syncedAt))) / 3600000))
const line = (m, names, now) => `• ${KIND_WORD[m.kind] ?? 'Message'} from ${whoOf(m, names)}, ${hoursAgo(m, now)} h ago${previewOf(m) ? `: ${previewOf(m)}` : ''}`

// One nudge: a phone notification and an email to the alert list.
// names: { 'customer:<id>': name, 'lead:<id>': name } as whoOf expects.
export function nudgeMessage(items, names = {}, now = Date.now()) {
  const n = items.length
  const who = [...new Set(items.map((m) => whoOf(m, names)))]
  const title = n === 1 ? `Still waiting: ${KIND_WORD[items[0].kind] ?? 'message'} from ${who[0]}` : `Still waiting: ${n} customers need a reply`
  const body = n === 1 ? `${hoursAgo(items[0], now)} h with nobody on it. Tap to open.` : `${who.slice(0, 3).join(', ')}${who.length > 3 ? ` +${who.length - 3} more` : ''}. Tap I've got it on each.`
  const text = `${n === 1 ? 'One customer has' : `${n} customers have`} waited more than ${Math.round(WAIT_MS / 3600000)} hours with nobody tapping I've got it:

${items.map((m) => line(m, names, now)).join('\n')}

Open the staff app, tap 💬 and take them: https://christmas-light-creations.com/leads/#messages

This reminder repeats every ${Math.round(NUDGE_GAP_MS / 3600000)} hours (8 am to 8 pm) while someone is still waiting, and at once when a new one joins the list.`
  return {
    push: { title, body, link: n === 1 ? messageLink(items[0]) : '#messages', tag: 'nudge' },
    subject: `${title} (CLC staff)`,
    text,
  }
}
