// Email bounces: emails from info@ that Gmail accepted, then couldn't
// deliver (bad address, closed account, full mailbox). Reads the bounce
// notice the Apps Script collected, picks the history entry it is about, and
// words what staff are told. Pure: no Firebase. Spec:
// docs/specs/email-bounces.md. Tested in tests/bounces.test.mjs.
import { OUR_EMAILS, addressesOf, emailIdBase, parseItem } from './messageSync.js'
import { messageLink, targetKey, whoOf } from './staffPush.js'

export const MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const SKEW_MS = 2 * 60 * 1000
const MAX_CANDIDATES = 3
// A catch-up of old bounces (sync down for a while) doesn't buzz phones.
const PUSH_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000

// Mail servers that send bounce notices (Gmail: mailer-daemon@googlemail.com;
// Microsoft: MicrosoftExchange<32 hex>@…). Only these are read as bounces.
const BOUNCE_SENDER = /^(mailer-daemon|mail-daemon|postmaster|microsoftexchange[0-9a-f]{32})@/i
export const isBounceMail = (item) => BOUNCE_SENDER.test(addressesOf(item?.from)[0] ?? '')

// One collected email -> a bounce, a history event, or { skip: reason }.
export const parseSyncItem = (item) => (isBounceMail(item) ? parseBounce(item) : parseItem(item))

const isoOf = (date) => {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
const squash = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

// Where the copy of our original email starts (its headers and text could
// contain any words, so wording checks stop there).
const ORIGINAL = /\n[ \t>]*(-{3,}\s*(?:original|forwarded) message\s*-{3,}|-{5}\s*original message\s*-{5}|content-type:\s*(?:message\/rfc822|text\/rfc822-headers))/i

// Enhanced status code (RFC 3463) like 5.1.1, not part of an IP address.
const CODE = /(?<![\d.])([245]\.\d{1,3}\.\d{1,3})(?!\.?\d)/
const field = (text, name) => text.match(new RegExp(`^[ \\t>]*${name}:[ \\t]*(.+)$`, 'im'))?.[1].trim() ?? ''

const DELAY_WORDS = /\(delay\)|delivery (incomplete|delayed|has been delayed)|delayed mail|not (been )?delivered yet|will (retry|keep trying|continue (trying|to try))|still trying/i
const FAIL_SUBJECT = /\(failure\)|undeliver(able|ed)|returned (mail|to sender)|delivery (has )?failed|delivery failure|failure notice|mail delivery failed|could ?n[o'’]t be delivered|not delivered/i
const FAIL_WORDS = /address not found|domain not found|message (not delivered|blocked|rejected)|was ?n[o'’]t delivered|could ?n[o'’]t be delivered|could not be delivered|permanent(ly)? (error|fail)|delivery to the following recipients? failed|following address(es)? failed/i

// Final failure, delay, or can't tell. Delivery-status fields first, then
// the code's class, then the subject and wording.
function finality({ action, code, subject, notice }) {
  if (/^failed/i.test(action)) return 'failed'
  if (/^delayed/i.test(action)) return 'delayed'
  if (code.startsWith('5')) return 'failed'
  if (code.startsWith('4')) return 'delayed'
  if (DELAY_WORDS.test(subject) || DELAY_WORDS.test(notice)) return 'delayed'
  if (FAIL_SUBJECT.test(subject) || FAIL_WORDS.test(notice)) return 'failed'
  return ''
}

// Plain reason for staff, first match wins (status code or the server's words).
const REASONS = [
  [/^[45]\.2\.2$/, /mailbox (is )?full|inbox is full|over ?quota|quota exceeded|out of storage|insufficient (storage|space)/i, 'their mailbox is full'],
  [/^5\.(1\.2|4\.4)$/, /domain not found|domain name not found|domain \S+ (could ?n[o'’]t|could not) be found|dns error|host (or domain name )?not found|unrouteable|no mx|domain (does ?n[o'’]t|does not) exist/i, 'the domain after @ doesn’t exist (check it for a typo)'],
  [/^5\.2\.1$/, /disabled|deactivated|suspended|inactive|account (has been |is )?closed|no longer (active|in use|available)/i, 'that email account is closed or disabled'],
  [/^5\.1\.(0|1|10)$/, /address not found|does ?n[o'’]t exist|does not exist|no such (user|mailbox|recipient|address)|user unknown|unknown (user|recipient|address)|recipient (address )?(rejected|not found|unknown)|invalid (recipient|address|mailbox)|mailbox (unavailable|not found)|address (could ?n[o'’]t|could not) be found/i, 'the address doesn’t exist (check it for a typo)'],
  [/^5\.7\.\d+$/, /blocked|spam|policy|blacklist|blocklist|denied|refused|rejected/i, 'their mail server refused it (it may look like spam to them)'],
]
export function bounceReason(code, text) {
  const hit = REASONS.find(([c, t]) => c.test(code) || t.test(text))
  return hit ? hit[2] : `it couldn’t be delivered${code ? ` (code ${code})` : ''}`
}

const notOurs = (addr) => !OUR_EMAILS.includes(addr) && !BOUNCE_SENDER.test(addr)

// The address that failed: X-Failed-Recipients, the delivery-status fields,
// the sentence naming it ("wasn't delivered to …"); only if none of those,
// any other address in the notice.
function failedAddresses(item, notice) {
  const strong = [
    ...addressesOf(item.failedTo),
    ...[...notice.matchAll(/^[ \t>]*(?:final|original)-recipient:[ \t]*(?:rfc822;)?[ \t]*(\S+)/gim)].flatMap((m) => addressesOf(m[1])),
    ...[...notice.matchAll(/(?:delivered to|recipients? failed:?|address(?:\(es\))? failed:?|your message to)\s*/gi)].flatMap((m) => addressesOf(notice.slice(m.index + m[0].length, m.index + m[0].length + 120)).slice(0, 1)),
  ].filter(notOurs)
  const list = strong.length ? strong : addressesOf(notice).filter(notOurs)
  return [...new Set(list)].slice(0, MAX_CANDIDATES)
}

// "=?UTF-8?Q?Your_2026_install?=" -> "Your 2026 install" (RFC 2047 encoded words).
function decodeWords(s) {
  return s.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=\s*/gi, (_, charset, enc, text) => {
    const bytes = /b/i.test(enc) ? Buffer.from(text, 'base64')
      : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1')
    return bytes.toString(/utf-?8/i.test(charset) ? 'utf8' : 'latin1')
  })
}

// The original email's Message-ID(s) -> history id bases ("em-…"). From the
// bounce's own In-Reply-To / References headers (new script), and the
// original's headers when the notice includes them.
function originalRefs(item, notice, original) {
  const ids = [
    ...String(item.inReplyTo ?? '').match(/<[^<>\s]+>/g) ?? [],
    ...String(item.references ?? '').match(/<[^<>\s]+>/g) ?? [],
    ...[...notice.matchAll(/^[ \t>]*x-original-message-id:[ \t]*(<[^<>\s]+>)/gim)].map((m) => m[1]),
    ...[...original.matchAll(/^[ \t>]*message-id:[ \t]*(<[^<>\s]+>)/gim)].map((m) => m[1]),
  ].map((s) => s.toLowerCase()).filter((s) => s !== String(item.messageId ?? '').trim().toLowerCase())
  return [...new Set(ids)].slice(0, 5).map(emailIdBase)
}

// A bounce notice -> { bounce: true, at, emails, refs, subject, reason, code },
// or { skip: 'bounce-delay' | 'bounce-unclear' | 'no-date' }.
export function parseBounce(item) {
  const at = isoOf(item?.date)
  if (!at) return { skip: 'no-date' }
  const body = String(item.body ?? '').replace(/\r/g, '')
  const cut = body.match(ORIGINAL)
  const notice = cut ? body.slice(0, cut.index) : body
  const original = cut ? body.slice(cut.index).replace(/\n[ \t]+/g, ' ') : ''
  const subject = String(item.subject ?? '')
  const code = field(notice, 'Status').match(CODE)?.[1] ?? notice.match(CODE)?.[1] ?? ''
  const final = finality({ action: field(notice, 'Action'), code, subject, notice })
  if (final === 'delayed') return { skip: 'bounce-delay' }
  if (final !== 'failed') return { skip: 'bounce-unclear' }
  return {
    bounce: true, at, code,
    reason: bounceReason(code, notice),
    emails: failedAddresses(item, notice),
    refs: originalRefs(item, notice, original),
    subject: decodeWords(original.match(/^[ \t>]*subject:[ \t]*(.+)$/im)?.[1] ?? '').trim(),
  }
}

// Which history entries a bounce is about. byRef: entries whose id starts
// with one of the bounce's refs; byEmail: entries with one of its failed
// addresses. Message-ID match first (only the failed address's entry when
// one email went to several people); else the latest email to the failed
// address sent in the week before the bounce, same subject preferred.
const isOut = (m) => m?.kind === 'email' && m.direction === 'out'
const msOf = (iso) => Date.parse(iso) || 0
export function pickBounced(bounce, { byRef = [], byEmail = [] } = {}) {
  const at = msOf(bounce.at)
  const sentBefore = (m) => msOf(m.at) <= at + SKEW_MS
  const refs = byRef.filter((m) => isOut(m) && sentBefore(m))
  const toFailed = refs.filter((m) => bounce.emails.includes(m.email))
  if (toFailed.length) return toFailed
  if (refs.length === 1) return refs
  const recent = byEmail.filter((m) => isOut(m) && bounce.emails.includes(m.email) && sentBefore(m) && at - msOf(m.at) <= MATCH_WINDOW_MS)
  if (!recent.length) return []
  const same = bounce.subject ? recent.filter((m) => squash(m.subject) === squash(bounce.subject)) : []
  const pool = same.length ? same : recent
  return [pool.reduce((a, b) => (msOf(b.at) > msOf(a.at) ? b : a))]
}

// Fields the server adds to a bounced history entry.
export const bounceFields = (b) => ({ bounced: true, bouncedAt: b.at, bounceReason: b.reason, bounceCode: b.code })

// Records whose address gets the ⚠ flag (bouncedEmails.<address>).
export const recordsOf = (m) => [
  m.customerId && `customers/${m.customerId}`, m.leadId && `leads/${m.leadId}`, m.pastRequestId && `pastRequests/${m.pastRequestId}`,
].filter((p) => p && !p.slice(p.indexOf('/') + 1).includes('/'))

const dayOf = (iso) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })

// Red banner / alert email text. Names the customer, never the address or
// subject (it also goes to the server log).
export function bounceIncident(m, names = {}) {
  const who = names[targetKey(m)] || 'a customer'
  return `An email to ${who} (sent ${dayOf(m.at)}) bounced: ${m.bounceReason}. Open their record and fix the email address, then send it again.`
}

const first = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Entries just marked bounced by one sync call -> one phone notification, or null.
export function bouncePush(list, names = {}, now = Date.now()) {
  const fresh = list.filter((m) => now - msOf(m.bouncedAt) < PUSH_MAX_AGE_MS)
  if (!fresh.length) return null
  const [m] = fresh
  if (fresh.length === 1) return { title: `Email to ${whoOf(m, names)} bounced`, body: first(m.bounceReason), link: messageLink(m), tag: `bounce:${m.id}` }
  const people = [...new Set(fresh.map((x) => whoOf(x, names)))]
  const more = people.length > 3 ? `, +${people.length - 3} more` : ''
  return { title: `${fresh.length} emails bounced`, body: `${people.slice(0, 3).join(', ')}${more}`, link: '#home', tag: 'bounces' }
}

// Dry run (Apps Script testBounces): what the bounce would do, no addresses.
export const bounceSummary = (b, matches = 0) => ({ status: 'bounce', permanent: true, reason: b.reason, code: b.code, refs: b.refs.length, address: b.emails.length > 0, matches })
