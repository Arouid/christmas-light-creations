// Turns emails collected by the Apps Script in info@ (Google Voice
// notifications and customer emails) into customer history entries, and
// matches them to customers/leads. Pure: no Firebase. Spec:
// docs/specs/message-sync.md. Tested in tests/messageSync.test.mjs.
import { createHash } from 'node:crypto'

export const OUR_EMAILS = ['info@christmas-light-creations.com', 'clc.voicemail.01@gmail.com']
export const OUR_PHONES = ['+12818190163']
export const MAX_ITEMS = 50
export const MAX_TEXT = 4000
// Emails we send automatically that must not land in history (one-time links).
const SKIP_SUBJECTS = [/^Your Christmas Light Creations sign-in link$/i]

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20)
const lower = (s) => String(s ?? '').trim().toLowerCase()

// "(281) 555-0101" / "+1 281.555.0101" / "12815550101" -> "+12815550101"; else ''.
export function e164(raw) {
  const d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return ''
}

// Every US phone number in a free-text field ("281-555-0101 / 832 555 0102").
export function phonesOf(field) {
  const found = String(field ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []
  return [...new Set(found.map(e164).filter(Boolean))]
}

// Addresses in a header like `"Pat" <Pat@Example.com>, b@x.com` -> lowercase list.
export function addressesOf(header) {
  return [...new Set((String(header ?? '').match(/[^\s<>,;"']+@[^\s<>,;"']+\.[a-z]{2,}/gi) ?? []).map(lower))]
}

const ours = (addr) => OUR_EMAILS.includes(addr)
const theirPhones = (s) => phonesOf(s).filter((p) => !OUR_PHONES.includes(p))
const isoOf = (date) => {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
const cap = (s) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1)}…` : s)

// ---- Google Voice notifications ---------------------------------------------

const VOICE_FOOTER = /^(YOUR ACCOUNT|HELP CENTER|HELP FORUM|To respond to this text message|To respond, reply to this email|Google LLC|This email was sent to you because|You received this email because|Manage notification settings)/i
const VOICE_NOISE = /^(<?https?:\/\/\S+>?|play message|listen to message|voicemail from:?.*|new voicemail from.*|missed call from.*|transcript:?|google voice)$/i

function voiceText(body) {
  const lines = []
  for (const raw of String(body ?? '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    if (VOICE_FOOTER.test(line)) break
    if (VOICE_NOISE.test(line) || VOICE_NOISE.test(line.replace(/\s*<https?:\/\/\S+>$/, ''))) continue
    lines.push(line)
  }
  return lines.join('\n').replace(/^Transcript:\s*/i, '').replace(/\n{3,}/g, '\n\n').trim()
}

// Voice sender for texts: "<our number>.<their number>.<id>@txt.voice.google.com".
// Takes whichever of the two isn't ours, in case the order ever flips.
function phoneFromTxtAddress(from) {
  const m = String(from ?? '').match(/(\d{10,11})\.(\d{10,11})\.[^@\s]*@txt\.voice\.google\.com/i)
  return m ? [e164(m[1]), e164(m[2])].find((p) => p && !OUR_PHONES.includes(p)) ?? '' : ''
}

export const isVoice = (from) => /@txt\.voice\.google\.com|voice-noreply@google\.com/i.test(String(from ?? ''))

function parseVoice(item) {
  const subject = String(item.subject ?? '')
  const txt = /@txt\.voice\.google\.com/i.test(item.from)
  let kind
  if (/group (text|message|conversation)/i.test(subject)) return { skip: 'group-text' }
  if (/voicemail/i.test(subject)) kind = 'voicemail'
  else if (/missed call/i.test(subject)) kind = 'missed'
  else if (/text message|new message/i.test(subject) || txt) kind = 'text'
  else return { skip: 'voice-other' }

  const phone = (txt && phoneFromTxtAddress(item.from)) || theirPhones(subject)[0] || theirPhones(item.body)[0] || ''
  const name = phone ? '' : (subject.match(/from\s+(.+?)(?:\s+at\s+\d{1,2}:\d{2}.*)?$/i)?.[1] ?? '').trim()
  const text = kind === 'missed' ? '' : cap(voiceText(item.body))
  if (kind === 'text' && !text) return { skip: 'empty' }
  const at = isoOf(item.date)
  return {
    source: 'voice-email', kind, direction: 'in', at, text, phone, name,
    id: voiceId({ kind, phone: phone || name, at, text }),
  }
}

// Same event -> same id, whether it came by email or a later Takeout import.
export function voiceId({ kind, phone, at, text = '' }) {
  return `gv-${sha(`${kind}|${phone}|${String(at).slice(0, 16)}|${text}`)}`
}

// ---- Customer emails ----------------------------------------------------------

export function emailText(body) {
  let t = String(body ?? '').replace(/\r/g, '')
  // Cut the quoted thread: Gmail's "On <date> <name> wrote:" (may wrap), Outlook's
  // "-----Original Message-----" / "From: … Sent: …" block, or ">" lines.
  const cuts = [
    /\n[^\n]*\bOn [^\n]{0,200}(?:\n[^\n]{0,200})?wrote:\s*\n/,
    /\n-{2,}\s*Original Message\s*-{2,}/i,
    /\n_{5,}\s*\nFrom:/,
    /\nFrom: [^\n]+\n(?:Sent|Date): /,
    /\n>/,
  ]
  for (const re of cuts) {
    const m = t.match(re)
    if (m) t = t.slice(0, m.index)
  }
  return cap(t.replace(/\n{3,}/g, '\n\n').trim())
}

function parseEmail(item) {
  const subject = String(item.subject ?? '').trim()
  if (SKIP_SUBJECTS.some((re) => re.test(subject))) return { skip: 'automatic' }
  const from = addressesOf(item.from)[0] ?? ''
  if (!from) return { skip: 'no-sender' }
  const out = ours(from)
  const counterparts = out
    ? addressesOf([item.to, item.cc, item.bcc].join(',')).filter((a) => !ours(a))
    : [from]
  if (!counterparts.length) return { skip: 'internal' }
  const messageId = lower(item.messageId) || lower(item.gmailId)
  if (!messageId) return { skip: 'no-id' }
  return {
    source: 'gmail', kind: 'email', direction: out ? 'out' : 'in', at: isoOf(item.date),
    text: emailText(item.body), subject: subject.slice(0, 300), emails: counterparts,
    idBase: `em-${sha(messageId)}`,
  }
}

// One collected email -> an event, or { skip: reason }.
export function parseItem(item) {
  if (!item || typeof item !== 'object') return { skip: 'bad-item' }
  if (!isoOf(item.date)) return { skip: 'no-date' }
  return isVoice(item.from) ? parseVoice(item) : parseEmail(item)
}

// ---- Matching -------------------------------------------------------------------

// Customers and leads -> lookup maps by E.164 phone and lowercase email.
// Leads already made customers point at that customer.
export function buildDirectory(customers = [], leads = []) {
  const phone = new Map()
  const email = new Map()
  const add = (map, key, target) => {
    if (!key) return
    const list = map.get(key) ?? []
    if (!list.some((t) => t.type === target.type && t.id === target.id)) list.push(target)
    map.set(key, list)
  }
  for (const c of customers) {
    const t = { type: 'customer', id: c.id }
    phonesOf(c.phone).forEach((p) => add(phone, p, t))
    addressesOf(c.email).forEach((e) => add(email, e, t))
  }
  for (const l of leads) {
    const t = l.customerId ? { type: 'customer', id: l.customerId } : { type: 'lead', id: l.id }
    phonesOf(l.phone).forEach((p) => add(phone, p, t))
    addressesOf(l.email).forEach((e) => add(email, e, t))
  }
  const firstCustomersThenLeads = (list) => [...list.filter((t) => t.type === 'customer'), ...list.filter((t) => t.type === 'lead')]
  for (const map of [phone, email]) for (const [k, v] of map) map.set(k, firstCustomersThenLeads(v))
  return { phone, email }
}

const targetFields = (t) => (t.type === 'customer' ? { customerId: t.id } : { leadId: t.id })

// An event -> the Firestore docs to create: [{ id, data }]. Voice: one doc
// (unmatched if nobody has the number). Email: one per matched person; none
// if nobody matches.
export function docsFor(event, dir) {
  const { id, idBase, emails, ...rest } = event
  const base = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== '' && v !== undefined))
  if (event.source === 'voice-email') {
    const [first, ...others] = dir.phone.get(event.phone) ?? []
    if (!first) return [{ id, data: { ...base, unmatched: true } }]
    const also = others.filter((t) => t.type === 'customer').map((t) => t.id)
    return [{ id, data: { ...base, ...targetFields(first), ...(also.length ? { alsoMatches: also } : {}) } }]
  }
  const docs = []
  const seen = new Set()
  for (const addr of emails) {
    const t = (dir.email.get(addr) ?? [])[0]
    if (!t || seen.has(`${t.type}:${t.id}`)) continue
    seen.add(`${t.type}:${t.id}`)
    docs.push({ id: `${idBase}-${t.id}`, data: { ...base, email: addr, ...targetFields(t) } })
  }
  return docs
}

// Request body check. Returns an error string or ''.
export function badBatch(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) return 'items must be a list'
  if (body.items.length > MAX_ITEMS) return `at most ${MAX_ITEMS} items per call`
  return ''
}

// Dry-run view of one item: what it would become, without any message text.
export function dryRunSummary(event, docs) {
  if (event.skip) return { status: 'skipped', reason: event.skip }
  const d = docs[0]?.data
  return {
    status: docs.length ? 'would-save' : 'would-drop', kind: event.kind, direction: event.direction,
    match: !d ? 'none' : d.customerId ? 'customer' : d.leadId ? 'lead' : 'unmatched',
    chars: event.text.length, last4: (event.phone ?? '').slice(-4),
  }
}
