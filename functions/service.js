// Problem reports from the customer's account (docs/specs/account-service.md):
// pure helpers for the server function reportProblem and for myAccount's
// `service` answer, shared with the account page. No Firebase here, so tests
// can import it.
import { pushFor } from './staffPush.js'

// The FAQ promise ("same day locally, 48 hours max during peak weeks"): what
// the confirmation says. One place to change.
export const SERVICE_DAYS = 2
export const NOTE_MAX = 1000

// What the customer picks → the issue words staff use on the Service tab
// (src/lib/customers.js SERVICE_ISSUES).
export const REPORT_ISSUES = [
  { key: 'section', label: 'A whole section is out', issue: 'Section out' },
  { key: 'bulbs', label: 'A bulb or a few bulbs are out', issue: 'Burned-out bulbs' },
  { key: 'down', label: 'Lights fell down or are damaged', issue: 'Lights down / damaged' },
  { key: 'timer', label: 'The timer (not coming on or off when they should)', issue: 'Timer' },
  { key: 'other', label: 'Something else', issue: 'Other' },
]

// Request body → { problem, issue, details } or { problem: [code, message] }.
export function reportRequest(data) {
  const choice = REPORT_ISSUES.find((i) => i.key === data?.problem)
  if (!choice) return { error: ['invalid-argument', 'Please pick what’s wrong.'] }
  if (data.note != null && typeof data.note !== 'string') return { error: ['invalid-argument', 'The note must be text.'] }
  const details = String(data.note ?? '').replace(/\s+/g, ' ').trim()
  if (details.length > NOTE_MAX) return { error: ['invalid-argument', `Please keep the note under ${NOTE_MAX} characters.`] }
  return { key: choice.key, issue: choice.issue, details }
}

// The service call the server writes: the same fields staff's Log call writes
// (src/leads/useStaffLists.js), plus where it came from. Stamps (createdAt,
// updatedAt, reportedAt) are added by the caller with server time.
export function reportCall({ customer, issue, details, email, day }) {
  return {
    customerId: customer.id,
    customerName: customer.fullName ?? '',
    issue,
    ...(details ? { details } : {}),
    received: day,
    status: 'Open',
    source: 'customer',
    reportedBy: email,
    updatedBy: 'website',
  }
}

export const OPEN_STATUSES = ['Open', 'Scheduled']
export const isOpenCall = (c) => OPEN_STATUSES.includes(c?.status)

// The call that still counts as open for this customer (newest first), or null.
export function openReport(calls) {
  return [...(calls ?? [])].filter(isOpenCall).sort((a, b) => String(b.received ?? '').localeCompare(String(a.received ?? '')))[0] ?? null
}

// What the customer may see of a call: never the staff notes.
export function openSummary(id, c) {
  if (!c) return null
  return {
    id, issue: String(c.issue ?? ''), received: String(c.received ?? ''), status: String(c.status ?? ''), source: c.source === 'customer' ? 'customer' : 'staff',
    details: c.source === 'customer' ? String(c.details ?? '') : '',
  }
}

// '2026-12-02' → 'Dec 2' (for the customer).
export const shortDate = (iso) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number)
  return Number.isFinite(d) ? new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : String(iso ?? '')
}

// What a second report is told while one is open.
export const openMessage = (open) =>
  `We already have an open service call for you (${open.issue}${open.received ? `, reported ${shortDate(open.received)}` : ''}) and we’re on it. Anything urgent? Call us at 281-819-0163.`

// The staff phone notification, worded like a new message (staffPush.js).
export function reportPush(call, customerId, now = Date.now()) {
  const m = { kind: 'report', direction: 'in', at: new Date(now).toISOString(), customerId, text: [call.issue, call.details].filter(Boolean).join(' · ') }
  return pushFor([m], { [`customer:${customerId}`]: call.customerName }, now)
}

const STAFF_APP = 'https://christmas-light-creations.com/leads/'
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// The staff alert email, like the new-estimate one (leadEmail.js).
export function reportEmail(call, customer = {}) {
  const name = oneLine(call.customerName) || 'A customer'
  const where = oneLine(customer.city)
  const subject = `Problem report: ${name}${where ? `, ${where}` : ''}: ${oneLine(call.issue)}`.slice(0, 180)
  const phoneDigits = String(customer.phone ?? '').replace(/\D/g, '')
  const address = oneLine(customer.address)
  const rows = [
    ['Name', name],
    ['Problem', call.issue],
    ['Note', call.details],
    ['Phone', customer.phone, phoneDigits && `tel:${phoneDigits}`],
    ['Email', call.reportedBy, call.reportedBy && `mailto:${call.reportedBy}`],
    ['Address', address, address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`],
  ].filter(([, v]) => oneLine(v))
  const text = [
    `${name} reported a problem with their lights from their account.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${oneLine(v)}`),
    '',
    `It’s on the Service tab: ${STAFF_APP}#service`,
  ].join('\n')
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="margin:0 0 12px"><strong>${esc(name)} reported a problem with their lights from their account.</strong></p>
<table style="border-collapse:collapse">${rows.map(([k, v, href]) => `
<tr><td style="padding:2px 12px 2px 0;color:#666">${esc(k)}</td><td style="padding:2px 0">${href ? `<a href="${esc(href)}">${esc(oneLine(v))}</a>` : esc(oneLine(v))}</td></tr>`).join('')}
</table>
<p style="margin:20px 0 0"><a href="${STAFF_APP}#service" style="background:#ffcf4d;color:#050b1a;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open the Service tab</a></p>
</div>`
  return { subject, text, html, replyTo: call.reportedBy || undefined }
}

// ---- Your schedule (docs/specs/account-service.md) --------------------------

const SCHEDULE_FIELDS = ['installStatus', 'day', 'plannedDate', 'weekOf', 'timeframe', 'takedownStatus']

// The season entry → only the fields the customer may see, as short strings.
export function scheduleFor(seasons, season) {
  const s = seasons?.[season] ?? {}
  return { season: String(season), ...Object.fromEntries(SCHEDULE_FIELDS.map((k) => [k, String(s[k] ?? '').trim().slice(0, 80)])) }
}

const DAYS = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' }
const shortDay = (d) => DAYS[String(d ?? '').trim().slice(0, 3).toLowerCase()] ?? String(d ?? '').trim()
const TAKEDOWN = { 'Takedown Completed': 'done ✓', 'Takedown Scheduled': 'scheduled', 'No Takedown': 'not booked' }

// → { install, takedown } texts for the line, { none: true } when they aren't
// on this season's schedule, or null when nothing should show.
export function scheduleText(s) {
  if (!s) return null
  const st = s.installStatus ?? ''
  if (st === 'Off Scheduler' || st === 'Not Servicing') return null
  const when = [shortDay(s.day), s.plannedDate].filter(Boolean).join(' ') || (s.weekOf ? `week of ${s.weekOf}` : '')
  let install
  if (st === 'Install Completed') install = 'Up ✓'
  else if (st === 'Install Scheduled') install = when || 'scheduled'
  else if (st === 'Confirmed - Needs to be Scheduled') install = `being scheduled${s.timeframe ? ` (${s.timeframe})` : ''}`
  else return { none: true, season: s.season }
  const takedown = TAKEDOWN[s.takedownStatus ?? ''] ?? 'in January'
  return { install, takedown, season: s.season }
}
