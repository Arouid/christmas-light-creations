// Blocked senders (owner 2026-10-13: "we need a spam/report button"). One tap
// on an unmatched text or email in the staff app (🚫 Spam) dismisses it and
// adds the sender to settings/app.blockedSenders; the message sync
// (functions/index.js syncBatch) drops anything from a blocked sender before
// it is stored, and the Apps Script moves blocked emails to Gmail's spam
// folder so Gmail learns too. Keys are an E.164 phone ('+12815550101') or a
// lowercase email address. Staff unblock in ⚙ Settings → Blocked senders.
// Spec: docs/specs/spam-filters.md. Pure; tested in tests/blocklist.test.mjs.
export const MAX_BLOCKED = 500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Anything a person typed or a message carries -> the stored key, or ''.
export function normalizeKey(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return ''
  if (EMAIL_RE.test(s)) return s
  const d = s.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  if (d.length >= 7 && d.length <= 15) return `+${d}`
  return ''
}

// A stored message or a sync event -> its sender's key.
export const senderKey = (m) => normalizeKey(m?.phone || m?.email || (Array.isArray(m?.emails) ? m.emails[0] : ''))

const clean = (list) => (Array.isArray(list) ? list : []).map(normalizeKey).filter(Boolean)

export const isBlocked = (list, key) => Boolean(normalizeKey(key)) && clean(list).includes(normalizeKey(key))

export function withBlocked(list, key) {
  const k = normalizeKey(key)
  const cur = clean(list)
  if (!k || cur.includes(k)) return cur
  return [...cur, k].slice(-MAX_BLOCKED)
}

export function withoutBlocked(list, key) {
  const k = normalizeKey(key)
  return clean(list).filter((x) => x !== k)
}

// A parsed sync event -> 'blocked' when it came in from a blocked sender, else ''.
// Outgoing mail and bounces are never blocked.
export function blockedReason(event, list) {
  if (!event || event.direction !== 'in') return ''
  return isBlocked(list, senderKey(event)) ? 'blocked' : ''
}

// For the Settings list: a US number as people write it, an email as is.
export function describeKey(key) {
  const k = String(key ?? '')
  const d = k.replace(/\D/g, '')
  if (!k.startsWith('+1') || d.length !== 11) return k
  const ten = d.slice(1)
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}
