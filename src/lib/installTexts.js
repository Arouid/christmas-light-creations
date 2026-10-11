// Install-day texts (docs/specs/install-texts.md): the four texts sent
// around a visit (day-before reminder, On our way, All done for an install or
// a takedown), the arrival window and "minutes away" from the route's times,
// which buttons a stop gets, the reminder list of a route, and the history
// entry a tap writes. The app can't send a text itself (Google Voice has no
// API): each text is copied and pasted into Voice by a person, so every
// "sent" here means "opened in Voice". Pure: tested in tests/installTexts.test.mjs.
import { customerEmailKeys } from '../../functions/account.js'
import { TZ, addDays, centralParts, centralToMs } from '../../functions/scheduleTime.js'
import { e164, fillTemplate } from './messages.js'
import { legsKey } from './router.js'

export const OPT_OUT = 'Reply STOP to opt out of texts.'

// The stock wording; the owner edits them in ⚙ Settings → Install-day texts
// (settings/app.textTemplates, a blank one falls back to stock).
export const STOCK_TEXTS = {
  reminder: `Hi {first}, {business} here. We're coming tomorrow ({visitDay}) {when} for your {job}. Please leave side gates unlocked and keep dogs inside; nobody needs to be home. Questions? Call or text {businessPhone}. ${OPT_OUT}`,
  onway: `Hi {first}, {business} here. We're on our way to you now, {eta}. Please keep dogs inside while we work. ${OPT_OUT}`,
  done: `Hi {first}, your lights are up! Take a look tonight: they're on a timer and come on by themselves. Anything off, call or text {businessPhone}. Thank you! {business}. ${OPT_OUT}`,
  doneTakedown: `Hi {first}, your lights are down, labeled and binned for next year. Thank you for another season! Anything we missed, call or text {businessPhone}. {business}. ${OPT_OUT}`,
}
export const TEXT_LABELS = [
  ['reminder', 'Day-before reminder', 'From the route’s edit screen, for people with no email (the others get the email template).'],
  ['onway', 'On our way', 'Tapped by the crew on the stop. {eta} is the drive time of that leg.'],
  ['done', 'All done (install)', 'Offered right after ✓ Done on an install stop.'],
  ['doneTakedown', 'All done (takedown)', 'Offered right after ✓ Done on a takedown stop.'],
]
// Texts longer than this risk being split by the carrier (two SMS segments).
export const MAX_TEXT = 320

// Stock texts with the owner's edits applied (blank edits ignored).
export function mergeTexts(saved) {
  const out = { ...STOCK_TEXTS }
  for (const [k, v] of Object.entries(saved ?? {})) if (k in STOCK_TEXTS && String(v ?? '').trim()) out[k] = String(v)
  return out
}

// ---- Words from the route's times ------------------------------------------------

// The window is three hours wide, starting on the hour at or before half an
// hour ahead of the planned arrival: 10:40 -> "between 10 am and 1 pm".
export const WINDOW_MIN = 180
const hourText = (min) => {
  const h = Math.floor(min / 60) % 24
  return `${((h + 11) % 12) + 1} ${h < 12 ? 'am' : 'pm'}`
}
export function windowText(etaMin) {
  const eta = Number(etaMin)
  if (etaMin == null || !Number.isFinite(eta)) return 'during the day'
  const start = Math.floor(Math.max(0, eta - 30) / 60) * 60
  return `between ${hourText(start)} and ${hourText(start + WINDOW_MIN)}`
}

// Drive time of the leg -> "about 20 minutes away".
export function etaText(driveMin) {
  const n = Number(driveMin)
  if (!Number.isFinite(n) || n <= 0) return 'we should be there shortly'
  if (n <= 5) return 'just a few minutes away'
  if (n < 55) return `about ${Math.max(10, Math.round(n / 5) * 5)} minutes away`
  if (n < 85) return 'about an hour away'
  return `about ${Math.round(n / 30) / 2} hours away`
}

// "2026-10-15" -> "Thursday, Oct 15".
export const visitDayText = (day) => (/^\d{4}-\d\d-\d\d$/.test(String(day))
  ? new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' })
  : '')

export const jobWord = (kind) => ({ install: 'install', takedown: 'takedown', service: 'service call' }[kind] ?? 'visit')

// A route has real times once it was optimized and the stops haven't changed since.
export const routeTimed = (route) => {
  const stops = route?.stops ?? []
  return stops.length > 0 && stops.some((s) => s.driveMin != null) && route.legsKey === legsKey(stops)
}

// The placeholders a stop fills: { when, visitDay, job, eta }. `stop` is a
// timeline() row (with eta); timed = routeTimed(route).
export function stopExtras(stop, route, timed = routeTimed(route)) {
  return {
    when: timed ? windowText(stop?.eta) : 'during the day',
    visitDay: visitDayText(route?.day),
    job: jobWord(stop?.kind),
    eta: timed ? etaText(stop?.driveMin) : etaText(0),
  }
}

// Default time for the day-before reminder: 6:00 pm Central the evening
// before, or 10 minutes from now once that has passed; null when the route
// day is today or gone (a reminder would say "tomorrow").
export const REMINDER_HOUR = '18:00'
export const SOON_MS = 10 * 60_000
export function reminderTime(routeDay, now = Date.now()) {
  if (!/^\d{4}-\d\d-\d\d$/.test(String(routeDay))) return null
  if (routeDay <= centralParts(now).day) return null
  const at = centralToMs(addDays(routeDay, -1), REMINDER_HOUR)
  return at > now + SOON_MS ? at : now + SOON_MS
}

// ---- Per stop ------------------------------------------------------------------------

// Which text buttons a stop gets: { onway: true, done: 'done' | 'doneTakedown' | null }
// or { reason } when it gets none.
export function textOptions(stop, customer) {
  if (!stop?.customerId || !customer) return { reason: 'no customer on this stop' }
  if (customer.textOptOut === 'Yes') return { reason: 'asked us not to text' }
  if (!e164(stop.phone || customer.phone)) return { reason: 'no phone on file' }
  return { onway: true, done: stop.kind === 'install' ? 'done' : stop.kind === 'takedown' ? 'doneTakedown' : null }
}

// stop.texts.<step> = { at, by } -> "told 10:42 am" (Central), '' when not told.
export function toldText(mark) {
  const ms = Date.parse(mark?.at ?? '')
  if (!Number.isFinite(ms)) return ''
  return `told ${new Date(ms).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).toLowerCase()}`
}

// History template id: install-onway, takedown-done, service-onway…
export const templateId = (kind, step) => `${kind === 'takedown' ? 'takedown' : kind === 'service' ? 'service' : 'install'}-${step}`

// The text for one stop and step ('reminder' | 'onway' | 'done'), filled in.
export function stopText(step, { stop, route, customer, season, templates = STOCK_TEXTS, timed }) {
  const key = step === 'done' && stop?.kind === 'takedown' ? 'doneTakedown' : step
  return fillTemplate(templates[key] ?? STOCK_TEXTS[key], customer ?? {}, season, stopExtras(stop, route, timed))
}

// The Text & email history entry a tap writes (staff create; rules unchanged).
export function historyEntry({ stop, customer, step, text, user, now = Date.now() }) {
  return {
    id: `tx-${stop.id}-${step}-${now.toString(36)}`,
    data: {
      kind: 'text', direction: 'out', source: 'voice-app', at: new Date(now).toISOString(),
      phone: e164(stop.phone || customer?.phone), text: String(text).slice(0, 4000), customerId: stop.customerId,
      sentBy: user?.email ?? '', template: templateId(stop.kind, step),
    },
  }
}

// What Recent activity says next to "started a text to …".
export const ACTIVITY_TEXT = { reminder: 'Day-before reminder', onway: 'On our way', done: 'All done' }

// ---- The reminder list of a route --------------------------------------------------

// Install and takedown stops still to do, each with how the reminder can go:
// via 'email' (an address on the record), 'text' (a phone, not opted out), or
// null with the reason. `mark` is the stop's reminder mark, if any.
// rows: timeline() rows; customers: Map id -> customer or a plain object.
export function reminderRows(route, rows, customers, timed = routeTimed(route)) {
  const get = (id) => (customers?.get ? customers.get(id) : customers?.[id])
  return (rows ?? [])
    .filter((s) => s.customerId && ['install', 'takedown'].includes(s.kind) && s.status !== 'skipped' && s.status !== 'done')
    .map((s) => {
      const customer = get(s.customerId)
      const email = customer ? customerEmailKeys(customer)[0] ?? '' : ''
      const phone = e164(s.phone || customer?.phone)
      const optOut = customer?.textOptOut === 'Yes'
      const via = !customer ? null : email ? 'email' : phone && !optOut ? 'text' : null
      const reason = !customer ? 'customer record not found' : via ? '' : optOut ? 'asked us not to text, and no email on file' : 'no phone or email on file'
      return { stop: s, customer, when: timed ? windowText(s.eta) : 'during the day', email, phone, via, reason, mark: s.texts?.reminder ?? null }
    })
}
