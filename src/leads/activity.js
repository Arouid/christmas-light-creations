// Recent staff activity (docs/specs/dashboard.md): one entry per action, so
// people don't do the same thing twice. logActivity() is called right after an
// action succeeds (email sent, invoice sent, status changed, Text tapped…);
// it never throws and never slows the action. LeadsApp keeps the signed-in
// user and the customer/lead lists here, so callers only name the action.
import { useMemo, useState } from 'react'
import { ACTIVITY_DAYS, firstInWindow, handlers, phoneDirectory, recentEntries, staffNamesMap, toMs, whoByPhone } from '../lib/activity'
import { appendLog, useLiveCollection, useLiveSince } from './staffStore'

const DAY = 24 * 60 * 60 * 1000
const state = { user: null, dir: new Map(), names: new Map(), seen: new Map() }
const leadName = (l) => `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim()

export function setActivityContext(user, customers, leads, past) {
  state.user = user ?? null
  state.dir = phoneDirectory(customers ?? [], leads ?? [])
  state.names = new Map([
    ...(customers ?? []).map((c) => [`customer:${c.id}`, c.fullName ?? '']),
    ...(leads ?? []).map((l) => [`lead:${l.id}`, leadName(l)]),
    ...(past ?? []).map((p) => [`past:${p.id}`, p.fullName ?? '']),
  ])
}

export const byPhone = (phone) => whoByPhone(state.dir, phone)
export const customerTarget = (id, name) => (id ? { type: 'customer', id, name } : null)

// target: { type, id, name? } (name filled in from the lists when missing).
export function logActivity(action, target, text = '') {
  const user = state.user
  if (!user || !target?.type) return
  const id = String(target.id ?? '')
  if (!firstInWindow(state.seen, `${action}|${target.type}|${id}`)) return
  const name = String(target.name || state.names.get(`${target.type}:${id}`) || '').slice(0, 200)
  appendLog(user, 'activity', { action, target: { type: target.type, id, name }, text: String(text ?? '').slice(0, 300) })
    .catch((e) => console.warn('Activity not logged', e.code ?? e.message))
}

const newestFirst = (a, b) => toMs(b.at) - toMs(a.at)
const byId = (a, b) => a.id.localeCompare(b.id)

// The last 7 days of entries, live, who's handling which message, and staff
// names (⚙ Settings → Staff names, else the staff list's `name`, else the email).
export function useActivityFeed(user, settingNames) {
  const [since] = useState(() => new Date(Date.now() - ACTIVITY_DAYS * DAY))
  const { items, error } = useLiveSince(user, 'activity', 'at', since, newestFirst)
  const staff = useLiveCollection(user, 'staff', byId).items
  const entries = useMemo(() => recentEntries(items ?? []), [items])
  const handling = useMemo(() => handlers(items ?? []), [items])
  const names = useMemo(() => staffNamesMap(staff ?? [], settingNames ?? []), [staff, settingNames])
  return { entries, handling, names, error, loading: !items && !error }
}
