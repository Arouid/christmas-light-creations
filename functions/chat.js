// Account chat (docs/specs/account-chat.md): customers write to us from
// /account/, staff answer from the customer's account in the staff app. One
// document per customer, conversations/{customerId}, written only by the
// server (sendAccountMessage, replyToCustomer). Pure helpers shared with the
// account page and the staff app; no Firebase here, so tests can import it.
import { customerEmailKeys } from './account.js'
import { ACCOUNT_URL, BIZ, PHONE, brandText, esc, textFooter } from './brand.js'
import { PREVIEW_CHARS, pushFor } from './staffPush.js'

export const TEXT_MAX = 1000
export const THREAD_MAX = 200 // messages kept per customer; older ones drop off the front
// Per person and Central day (serverState/chat).
export const LIMITS = { customer: { daily: 30, gapMs: 5000 }, staff: { daily: 300, gapMs: 1000 } }
const STAFF_APP = 'https://christmas-light-creations.com/leads/'

// Request body -> { text } or { error: [HttpsError code, message] }. Spaces
// at the ends go, blank lines stay (it's a chat, not a form).
export function chatRequest(data) {
  const raw = data?.text
  if (raw != null && typeof raw !== 'string') return { error: ['invalid-argument', 'The message must be text.'] }
  const text = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim()
  if (!text) return { error: ['invalid-argument', 'Write a message first.'] }
  if (text.length > TEXT_MAX) return { error: ['invalid-argument', `Please keep it under ${TEXT_MAX.toLocaleString('en-US')} characters.`] }
  return { text }
}

// The conversation after one more message. prev: the stored document (or
// null); msg: { from: 'customer' | 'staff', by: email, text }; customer: the
// record; now: a Date. Stamps (updatedAt, updatedBy) are the caller's.
export function appendMessage(prev, { from, by, text }, customer, now = new Date()) {
  const messages = [...(prev?.messages ?? []), { from, by, text, at: now.toISOString() }].slice(-THREAD_MAX)
  return {
    customerId: prev?.customerId ?? customer.id,
    customerName: customer.fullName ?? prev?.customerName ?? '',
    messages,
    count: (Number(prev?.count) || prev?.messages?.length || 0) + 1,
    lastAt: now,
    lastFrom: from,
    // The first customer message nobody has answered yet; a staff reply ends the wait.
    waitingSince: from === 'staff' ? null : prev?.waitingSince ?? now,
  }
}

// serverState/chat -> { next } to store, or { problem }. Counts per person
// (customer email or staff email) per Central day, with a gap between sends.
export function chatAllowed(state, who, limits, now, day) {
  const today = state?.day === day
  const counts = today ? state.count ?? {} : {}
  const lasts = today ? state.last ?? {} : {}
  const count = Number(counts[who]) || 0
  if (count >= limits.daily) return { problem: ['resource-exhausted', `That’s the limit for today (${limits.daily} messages). Call or text us at ${PHONE} instead.`] }
  if (now - (Number(lasts[who]) || 0) < limits.gapMs) return { problem: ['resource-exhausted', 'Too fast: wait a moment, then press Send again.'] }
  return { next: { day, count: { ...counts, [who]: count + 1 }, last: { ...lasts, [who]: now } } }
}

// What the customer may see: the thread without staff emails, and whether
// they're waiting on us.
export function customerView(doc) {
  const messages = (doc?.messages ?? []).map((m) => ({ from: m.from === 'staff' ? 'staff' : 'customer', text: String(m.text ?? ''), at: String(m.at ?? '') }))
  return { messages, waiting: Boolean(doc?.waitingSince), dropped: Math.max(0, (Number(doc?.count) || 0) - messages.length) }
}

// Who gets the "new message" email: the address they wrote from (a phone
// sign-in writes from a phone number, which can't take email), else the
// first email on their record; '' when there is none.
export function recipientFor(doc, record) {
  const last = [...(doc?.messages ?? [])].reverse().find((m) => m.from === 'customer' && String(m.by ?? '').includes('@'))
  return String(last?.by ?? customerEmailKeys(record ?? {})[0] ?? '').toLowerCase()
}

// The staff phone notification, worded like a new text (staffPush.js).
export function chatPush(customerId, name, text, now = Date.now()) {
  const m = { kind: 'chat', direction: 'in', at: new Date(now).toISOString(), customerId, text }
  return pushFor([m], { [`customer:${customerId}`]: name }, now)
}

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
export const previewText = (text) => clip(oneLine(text), PREVIEW_CHARS)

// The alert-list email when a customer starts a new unanswered thread (like
// a new estimate request); follow-ups only buzz phones.
export function chatAlertEmail({ customer, text, email }) {
  const name = oneLine(customer.fullName) || 'A customer'
  const where = oneLine(customer.city)
  const link = `${STAFF_APP}#accounts/customer/${encodeURIComponent(customer.id)}`
  const subject = `Account message: ${name}${where ? `, ${where}` : ''}: ${clip(oneLine(text), 80)}`.slice(0, 180)
  const plain = [
    `${name} wrote to you from their account:`,
    '',
    text,
    '',
    `Reply in the Chat box on their account: ${link}`,
    `(They get an email with your reply; tap I’ve got it in 💬 if you’re on it but need a minute.)`,
  ].join('\n')
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="margin:0 0 12px"><strong>${esc(name)} wrote to you from their account:</strong></p>
<blockquote style="margin:0 0 16px;padding:10px 14px;border-left:4px solid #ffcf4d;background:#f9fafb;white-space:pre-wrap">${esc(text)}</blockquote>
<p style="margin:0 0 16px;color:#444">They get an email with your reply. On it but need a minute? Tap I’ve got it in 💬.</p>
<p style="margin:0"><a href="${esc(link)}" style="background:#ffcf4d;color:#050b1a;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Reply on their account</a></p>
</div>`
  return { subject, text: plain, html, replyTo: email || undefined }
}

// The customer's email when staff reply. Critical mail: no opt-out line.
export const REPLY_SUBJECT = `New message from ${BIZ}`
export function replyEmail({ text }) {
  const link = `${ACCOUNT_URL}#chat`
  const plain = `${text}

Reply from your account: ${link}
Or just call or text us at ${PHONE}.

${BIZ}${textFooter()}`
  return {
    subject: REPLY_SUBJECT,
    text: plain,
    html: brandText({ heading: 'New message', text: plain, button: { href: link, label: 'Open your account' } }),
  }
}
