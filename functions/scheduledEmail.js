// Scheduled email ("Send later"), server side: the request checks (the same
// as Send, plus the time), room per day, and what the sender does with each
// waiting email. Pure: no Firebase, but Node only (the Send checks use
// node:crypto), so the staff app imports ./scheduleTime.js instead. Used by
// scheduleStaffEmail and sendScheduledEmails in functions/index.js.
// Spec: docs/specs/scheduled-email.md. Tested in tests/scheduledEmail.test.mjs.
import { DAILY_LIMIT, historyTarget, recipientsOf, staffEmailRequest, TARGETS } from './staffEmail.js'
import { MAX_LIST, centralParts, msOf, sendAtProblem } from './scheduleTime.js'

export * from './scheduleTime.js'

export const PER_RUN = 100
export const STUCK_MS = 15 * 60_000

export const STUCK_ERROR = 'The server stopped while sending it, so it may or may not have gone out. Check info@’s Sent folder before sending it again.'
export const GMAIL_ERROR = 'Gmail didn’t take it. Pick a new time, or send it now from their account.'
const LIMIT_ERROR = `The daily limit (${DAILY_LIMIT} emails a day from the app) was reached. Pick a new time.`

const bad = (msg) => ({ problem: ['invalid-argument', msg] })
const late = (msg) => ({ problem: ['failed-precondition', msg] })

// ---- Scheduling (scheduleStaffEmail) --------------------------------------------

const BATCH_RE = /^[A-Za-z0-9_-]{1,60}$/
const SAFE_KEY = /^[A-Za-z0-9_-]{1,60}$/

// What to note on the record once it's sent: { season, field }, only on
// records staff may already change freely (customers, past requests).
// undefined -> none; false -> refused.
function markRequest(mark, req) {
  if (mark == null) return undefined
  if (typeof mark !== 'object' || !/^\d{4}$/.test(String(mark.season ?? ''))) return false
  if (!['customers', 'pastRequests'].includes(req.target.coll)) return false
  if (mark.field === 'reviewAsked') return { season: String(mark.season), field: 'reviewAsked' }
  if (mark.field === 'emailsSent' && SAFE_KEY.test(req.template)) return { season: String(mark.season), field: 'emailsSent' }
  return false
}

// The record field a sent email fills in (Season "already sent" / review asked).
export const markPath = (mark, template) => (mark?.field === 'reviewAsked' ? `seasons.${mark.season}.reviewAsked` : `seasons.${mark.season}.emailsSent.${template}`)

// Browser request -> { sendAt, batch, emails: [checked like Send, + mark] },
// or { problem: [HttpsError code, message] }.
export function scheduledEmailRequest(data, now = Date.now()) {
  if (!data || typeof data !== 'object') return bad('Nothing to schedule')
  const sendAt = Number(data.sendAt)
  const when = sendAtProblem(sendAt, now)
  if (when) return bad(when)
  const list = Array.isArray(data.emails) ? data.emails : []
  if (!list.length) return bad('Nothing to schedule')
  if (list.length > MAX_LIST) return bad(`At most ${MAX_LIST} emails at once: schedule the list in parts.`)
  const batch = data.batch == null || data.batch === '' ? '' : String(data.batch)
  if (batch && !BATCH_RE.test(batch)) return bad('Bad list id')
  const emails = []
  for (const [i, e] of list.entries()) {
    const req = staffEmailRequest(e)
    const who = list.length > 1 ? `Email ${i + 1}: ` : ''
    if (req.problem) return { problem: [req.problem[0], who + req.problem[1]] }
    const mark = markRequest(e.mark, req)
    if (mark === false) return bad(`${who}Can’t note that on their record`)
    emails.push(mark ? { ...req, mark } : req)
  }
  return { sendAt, batch, emails }
}

const dayLabel = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })

// null, or a problem when that Central day would have more than the daily
// limit waiting. `waiting`: open scheduledEmails docs (others than the one edited).
export function dayRoomProblem(waiting, sendAt, n) {
  const day = centralParts(sendAt).day
  const taken = waiting.filter((w) => w.status === 'scheduled' && centralParts(msOf(w.sendAt)).day === day).length
  if (taken + n <= DAILY_LIMIT) return null
  const left = Math.max(0, DAILY_LIMIT - taken)
  return ['resource-exhausted', `${dayLabel(day)} already has ${taken} email${taken === 1 ? '' : 's'} scheduled (${DAILY_LIMIT} a day from the app): ${left ? `${left} more fit` : 'no more fit'}. Pick another day.`]
}

export const nameOf = (record) => record?.fullName || `${record?.firstName ?? ''} ${record?.lastName ?? ''}`.trim() || 'a customer'

// The scheduledEmails doc for one checked email (the server adds `at` and
// turns sendAt into a Timestamp).
export function scheduledDoc({ req, record, sendAt, staff, batch }) {
  return {
    status: 'scheduled', open: true, sendAt,
    to: req.to, subject: req.subject, text: req.text, template: req.template,
    target: { field: req.target.field, id: req.target.id },
    ...historyTarget(req.target, record),
    name: nameOf(record).slice(0, 200), by: staff,
    ...(batch ? { batch } : {}), ...(req.mark ? { mark: req.mark } : {}),
  }
}

// The stored email as a Send request (checked again before it goes).
export const requestOf = (doc) => staffEmailRequest({ to: doc?.to, subject: doc?.subject, text: doc?.text, template: doc?.template, [doc?.target?.field]: doc?.target?.id })

function changeable(doc) {
  if (!doc) return { problem: ['not-found', 'That scheduled email is gone. Refresh and look again.'] }
  if (doc.status === 'sending') return late('Too late: it’s going out right now.')
  if (doc.status === 'sent') return late('Too late: it already went out.')
  if (doc.status === 'cancelled') return late('It was cancelled already.')
  return null
}

// Edit a waiting (or failed) one: new time, subject and message. -> { update } | { problem }
export function editRequest(doc, data, now = Date.now()) {
  const no = changeable(doc)
  if (no) return no
  const sendAt = Number(data?.sendAt)
  const when = sendAtProblem(sendAt, now)
  if (when) return bad(when)
  const req = staffEmailRequest({ ...requestOfFields(doc), subject: data?.subject, text: data?.text })
  if (req.problem) return req
  return { update: { sendAt, subject: req.subject, text: req.text, status: 'scheduled', open: true } }
}
const requestOfFields = (doc) => ({ to: doc.to, template: doc.template, [doc.target?.field]: doc.target?.id })

// Cancel: 'cancel' (waiting or failed), 'too-late' (going or gone out), 'gone'.
export function cancelOutcome(doc) {
  if (!doc || doc.status === 'cancelled') return 'gone'
  return doc.status === 'scheduled' || doc.status === 'failed' ? 'cancel' : 'too-late'
}

export function cancelIds(data) {
  const ids = Array.isArray(data?.ids) ? [...new Set(data.ids)] : []
  if (!ids.length || ids.length > MAX_LIST || !ids.every((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id))) return bad('Nothing to cancel')
  return { ids }
}

// ---- Sending (sendScheduledEmails) -----------------------------------------------

// Waiting ones whose time has come, oldest first, at most PER_RUN.
export const dueOnes = (docs, now) => docs
  .filter((d) => d.status === 'scheduled' && msOf(d.sendAt) <= now)
  .sort((a, b) => msOf(a.sendAt) - msOf(b.sendAt) || String(a.id).localeCompare(String(b.id)))
  .slice(0, PER_RUN)

// Claimed but not finished for STUCK_MS: the run died mid-send.
export const stuckOnes = (docs, now) => docs.filter((d) => d.status === 'sending' && !(now - msOf(d.claimedAt) <= STUCK_MS))

// The daily count shared with Send (serverState/staffEmail), without the
// one-a-second gap (the sender paces itself).
export function scheduledAllowed(state, day) {
  const today = state?.day === day
  const count = today ? Number(state.count) || 0 : 0
  if (count >= DAILY_LIMIT) return { problem: LIMIT_ERROR }
  return { next: { day, count: count + 1, last: today ? state.last ?? {} : {} } }
}

// Inside the claim transaction, with fresh reads of the scheduled email, its
// record and the daily count:
//   { outcome: 'skip' }            not waiting (cancelled, claimed, sent) or not due yet
//   { outcome: 'fail', error }     can't go; nothing is sent
//   { outcome: 'go', req, gate }   claim it (status sending) and count it
export function claimOutcome({ doc, record, gate, now, day }) {
  if (!doc || doc.status !== 'scheduled' || !(msOf(doc.sendAt) <= now)) return { outcome: 'skip' }
  const req = requestOf(doc)
  if (req.problem) return { outcome: 'fail', error: req.problem[1] }
  if (!record) return { outcome: 'fail', error: 'Their record is gone, so it wasn’t sent.' }
  if (!recipientsOf(record).includes(req.to)) return { outcome: 'fail', error: 'That address isn’t on their record any more, so it wasn’t sent.' }
  const allowed = scheduledAllowed(gate, day)
  if (allowed.problem) return { outcome: 'fail', error: allowed.problem }
  return { outcome: 'go', req, gate: allowed.next }
}

// The collection a target lives in (for reading the record).
export const collOf = (doc) => TARGETS[doc?.target?.field]
