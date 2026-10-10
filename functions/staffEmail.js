// Email from the staff app (sendStaffEmail): request checks, the daily limit,
// and the history entry, whose id and keys match what the message sync
// computes from the copy in info@'s Sent folder. Pure: no Firebase.
// Spec: docs/specs/staff-email.md. Tested in tests/staffEmail.test.mjs.
import { customerEmailKeys } from './account.js'
import { cap, emailIdBase, mailPrint } from './messageSync.js'

export const MAX_SUBJECT = 200
export const MAX_BODY = 10_000
export const DAILY_LIMIT = 300
export const MIN_GAP_MS = 1000

// Request field -> collection of the record the email is about.
export const TARGETS = { customerId: 'customers', leadId: 'leads', pastRequestId: 'pastRequests' }
const TO_RE = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/
const ID_RE = /^(?!__)[^/]{1,200}$/

const bad = (msg) => ({ problem: ['invalid-argument', msg] })

// Browser request -> { to, subject, text, template, target: { field, coll, id } },
// or { problem: [HttpsError code, message] }.
export function staffEmailRequest(data) {
  if (!data || typeof data !== 'object') return bad('Nothing to send')
  const to = String(data.to ?? '').trim().toLowerCase()
  if (!TO_RE.test(to) || to.length > 200) return bad('That email address doesn’t look right')
  if (typeof data.subject !== 'string' || /[\r\n]/.test(data.subject)) return bad('The subject must be one line')
  const subject = data.subject.trim()
  if (!subject) return bad('Add a subject')
  if (subject.length > MAX_SUBJECT) return bad(`The subject is too long (${MAX_SUBJECT} characters at most)`)
  const text = typeof data.text === 'string' ? data.text.replace(/\r\n?/g, '\n').trimEnd() : ''
  if (!text.trim()) return bad('Write a message')
  if (text.length > MAX_BODY) return bad(`The message is too long (${MAX_BODY.toLocaleString('en-US')} characters at most)`)
  const fields = Object.keys(TARGETS).filter((f) => data[f] !== undefined && data[f] !== null && data[f] !== '')
  if (fields.length !== 1) return bad('Say who the email is for')
  const [field] = fields
  const id = data[field]
  if (typeof id !== 'string' || !ID_RE.test(id)) return bad('Unknown customer')
  const template = typeof data.template === 'string' ? data.template.slice(0, 60) : ''
  return { to, subject, text, template, target: { field, coll: TARGETS[field], id } }
}

// Addresses on the record (email field, which may hold several, plus "Also:" emails).
export const recipientsOf = (record) => customerEmailKeys(record)

// Where the history entry shows: a lead already made a customer, or a past
// request linked to one, shows on that customer.
export function historyTarget({ field, id }, record) {
  if (field === 'customerId') return { customerId: id }
  if (field === 'leadId') return record?.customerId ? { customerId: record.customerId } : { leadId: id }
  return { pastRequestId: id, ...(record?.customerId ? { customerId: record.customerId } : {}) }
}

// The history entry for a sent email. The id is the one the sync would give
// its Sent copy for the same person, so the sync can't add it twice.
export function historyEntry({ req, record, messageId, staff, at }) {
  const where = historyTarget(req.target, record)
  const mailId = emailIdBase(messageId)
  return {
    id: `${mailId}-${where.customerId ?? where.leadId ?? where.pastRequestId}`,
    data: {
      kind: 'email', direction: 'out', source: 'app', at,
      email: req.to, subject: req.subject, text: cap(req.text), ...where,
      sentBy: staff, ...(req.template ? { template: req.template } : {}),
      mailId, mailPrint: mailPrint(req),
    },
  }
}

// serverState/staffEmail -> { next } to store, or { problem }. Counts emails
// per Central day; one send per second per staff member.
export function sendAllowed(state, staff, now, day) {
  const today = state?.day === day
  const count = today ? Number(state.count) || 0 : 0
  if (count >= DAILY_LIMIT) return { problem: ['resource-exhausted', `Daily limit reached (${DAILY_LIMIT} emails a day from the app). Send the rest tomorrow, or use Open in Gmail.`] }
  const last = today ? state.last ?? {} : {}
  if (now - (Number(last[staff]) || 0) < MIN_GAP_MS) return { problem: ['resource-exhausted', 'Too fast: wait a second, then press Send again.'] }
  return { next: { day, count: count + 1, last: { ...last, [staff]: now } } }
}
