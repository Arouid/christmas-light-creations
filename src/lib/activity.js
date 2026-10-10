// Home dashboard (docs/specs/dashboard.md): what a recent-activity entry says
// and links to, who a phone number belongs to, who's handling a message, and
// the mission-control numbers. Pure, so tests can run it.
import { parseMoney } from './discounts.js'
import { listTotals } from '../../functions/invoices.js'
import { messageLink, prettyPhone } from '../../functions/staffPush.js'

export const ACTIVITY_DAYS = 7
export const ACTIVITY_MAX = 100
export const REPEAT_MS = 2 * 60 * 1000 // same person, action and target: logged once
const OUR_PHONE = '2818190163'
const DAY = 24 * 60 * 60 * 1000

export const toMs = (t) => {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t === 'number') return t
  return Date.parse(t) || 0
}
const last10 = (p) => String(p ?? '').replace(/\D/g, '').slice(-10)
const leadName = (l) => `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim()

// ---- Who's who -----------------------------------------------------------------

// Phone (last 10 digits) -> { type, id, name }: customers first, then leads not
// yet customers. A box may hold several numbers ("281-555-0101 / 832…").
export function phoneDirectory(customers = [], leads = []) {
  const dir = new Map()
  const add = (raw, target) => {
    for (const m of String(raw ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []) {
      const k = last10(m)
      if (k.length === 10 && !dir.has(k)) dir.set(k, target)
    }
  }
  for (const c of customers ?? []) add(c.phone, { type: 'customer', id: c.id, name: c.fullName ?? '' })
  for (const l of leads ?? []) if (!l.customerId) add(l.phone, { type: 'lead', id: l.id, name: leadName(l) })
  return dir
}

// A phone number -> the person, or the number itself; null for ours or junk.
export function whoByPhone(dir, phone) {
  const k = last10(phone)
  if (k.length !== 10 || k === OUR_PHONE) return null
  return dir.get(k) ?? { type: 'phone', id: k, name: prettyPhone(k) }
}

// Staff email -> a first name: the staff list's `name` if set, else the
// address before @ ("katie.smith@…" -> "Katie").
export function staffName(email, names = {}) {
  if (!email) return 'Someone'
  if (email === 'website') return 'Website'
  const set = names[String(email).toLowerCase()]
  if (set) return set
  const first = String(email).split('@')[0].split(/[._-]/)[0]
  return first ? first[0].toUpperCase() + first.slice(1) : email
}

// ---- Entries ----------------------------------------------------------------------

// Website entries: the customer did it ("Pat Sample signed their proposal").
const WEBSITE = { 'proposal-signed': 'signed their proposal', 'proposal-paid': 'paid online', 'invoice-paid-online': 'paid an invoice online' }
const VERB = {
  email: 'emailed', 'invoice-sent': 'sent an invoice to', 'invoice-again': 'emailed the invoice again to',
  'invoice-paid': 'marked paid the invoice for', 'invoice-void': 'voided the invoice for',
  'proposal-sent': 'sent a proposal to', 'proposal-void': 'voided the proposal for', 'proposal-countersigned': 'countersigned the proposal for',
  'lead-status': 'updated', 'make-customer': 'made a customer of', 'service-logged': 'logged a service call for',
  'service-done': 'finished the service call for', handling: 'is on the message from', text: 'started a text to', call: 'started a call to',
}
export const ACTIONS = [...Object.keys(VERB), ...Object.keys(WEBSITE)]

export function targetLink(target, messages = []) {
  const t = target ?? {}
  const id = encodeURIComponent(t.id ?? '')
  if (t.type === 'customer') return `#accounts/customer/${id}`
  if (t.type === 'lead') return `#accounts/lead/${id}`
  if (t.type === 'past') return `#accounts/past/${id}`
  if (t.type === 'message') {
    if (String(t.id).startsWith('request-')) return `#accounts/lead/${encodeURIComponent(t.id.slice(8))}`
    const m = messages.find((x) => x.id === t.id)
    return m ? messageLink(m) : '#messages'
  }
  return ''
}

// An entry -> { actor, did, name, detail, link } for one line of the box.
export function describe(entry, { names = {}, messages = [] } = {}) {
  const t = entry.target ?? {}
  const name = t.name || (t.type === 'phone' ? prettyPhone(t.id) : 'someone')
  const link = targetLink(t, messages)
  if (WEBSITE[entry.action]) return { actor: name, did: WEBSITE[entry.action], name: '', detail: entry.text ?? '', link }
  const actor = staffName(entry.by, names)
  if (entry.action === 'lead-status') return { actor, did: 'marked', name, detail: entry.text ? `→ ${entry.text}` : '', link }
  return { actor, did: VERB[entry.action] ?? entry.action, name, detail: entry.text ?? '', link }
}

// Newest "I've got it" per message: Map id -> { by, at, before: [earlier emails] }.
export function handlers(entries) {
  const out = new Map()
  const sorted = [...(entries ?? [])].filter((e) => e.action === 'handling' && e.target?.id).sort((a, b) => toMs(b.at) - toMs(a.at))
  for (const e of sorted) {
    const cur = out.get(e.target.id)
    if (!cur) out.set(e.target.id, { by: e.by, at: toMs(e.at), before: [] })
    else if (e.by !== cur.by && !cur.before.includes(e.by)) cur.before.push(e.by)
  }
  return out
}

// Repeats (double taps, Call tapped twice): true if this one should be logged.
// `seen` is a Map kept by the caller.
export function firstInWindow(seen, key, now = Date.now()) {
  if (now - (seen.get(key) ?? -Infinity) < REPEAT_MS) return false
  seen.set(key, now)
  return true
}

// "just now" · "5 min ago" · "3 h ago" · "Thu, Oct 8".
export function agoText(ms, now = Date.now()) {
  const min = ms ? Math.round((now - ms) / 60000) : 0
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export const recentEntries = (entries, now = Date.now()) =>
  [...(entries ?? [])].filter((e) => toMs(e.at) >= now - ACTIVITY_DAYS * DAY || !e.at).sort((a, b) => (toMs(b.at) || now) - (toMs(a.at) || now)).slice(0, ACTIVITY_MAX)

// ---- Mission-control numbers --------------------------------------------------------

const INSTALL_STEP = { 'Not Confirmed': 'notConfirmed', '': 'notConfirmed', 'Confirmed - Needs to be Scheduled': 'confirmed', 'Install Scheduled': 'scheduled', 'Install Completed': 'installed' }
const TAKEDOWN_STEP = { '': 'waiting', 'Takedown Scheduled': 'scheduled', 'Takedown Completed': 'done', 'No Takedown': 'none' }

// Customers with that season on file -> how far installs and takedowns are.
// "Off Scheduler" / "Not Servicing" are out of the count.
export function seasonProgress(customers, season) {
  const install = { notConfirmed: 0, confirmed: 0, scheduled: 0, installed: 0 }
  const takedown = { waiting: 0, scheduled: 0, done: 0, none: 0 }
  for (const c of customers ?? []) {
    const s = c.seasons?.[season]
    if (!s) continue
    const step = INSTALL_STEP[s.installStatus ?? '']
    if (!step) continue
    install[step]++
    if (step === 'installed') takedown[TAKEDOWN_STEP[s.takedownStatus ?? ''] ?? 'waiting']++
  }
  return { install, takedown, total: Object.values(install).reduce((a, b) => a + b, 0) }
}

// Season billing marked paid: install total + takedown rate, in dollars.
export function collected(customers, season) {
  let sum = 0
  for (const c of customers ?? []) {
    const s = c.seasons?.[season] ?? {}
    if (/^yes$/i.test(String(s.install?.paid ?? '').trim())) sum += parseMoney(s.install?.total) ?? 0
    if (/^yes$/i.test(String(s.takedown?.paid ?? '').trim())) sum += parseMoney(s.takedown?.rate) ?? 0
  }
  return Math.round(sum * 100) / 100
}

export function counters({ leads, invoices, calls, today }) {
  const t = listTotals(invoices ?? [], today)
  return {
    openRequests: (leads ?? []).filter((l) => (l.status ?? 'new') === 'new').length,
    unpaidCents: t.open.cents, unpaid: t.open.n, overdue: t.overdue.n,
    openCalls: (calls ?? []).filter((c) => ['Open', 'Scheduled'].includes(c.status)).length,
  }
}

// Today's routes -> { routes: [{ id, name, done, skipped, total, status }], next: day | null }.
export function routesToday(routes, today) {
  const list = (routes ?? []).filter((r) => r.day === today).map((r) => {
    const stops = r.stops ?? []
    return {
      id: r.id, name: r.name || 'Route', status: r.status ?? 'draft', total: stops.length,
      done: stops.filter((s) => s.status === 'done').length, skipped: stops.filter((s) => s.status === 'skipped').length,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const next = (routes ?? []).map((r) => r.day).filter((d) => d > today).sort()[0] ?? null
  return { routes: list, next }
}

// The text/email sync light: green if something arrived in the last 3 days
// (same line as the daily check), amber otherwise (quiet, or the sync stopped).
export function syncLight(lastMs, now = Date.now()) {
  if (!lastMs) return 'amber'
  return now - lastMs < 3 * DAY ? 'green' : 'amber'
}
