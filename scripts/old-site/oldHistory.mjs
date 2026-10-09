// Old mail (Gmail Takeout) -> customer history entries and win-back rows:
// emails with people, PayPal/Square payments and invoices, estimate requests.
// Pure: takes decoded emails from mbox.mjs. Matching to customers happens in
// the staff app's Import tab (src/lib/messageImport.js).
// Spec: docs/specs/old-history.md. Tested in tests/oldHistory.test.mjs.
import { createHash } from 'node:crypto'
import { MAX_TEXT, addressesOf, emailText, phonesOf } from '../../functions/messageSync.js'

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20)
const cap = (s) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1)}…` : s)
const isoOf = (date) => {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
const lower = (s) => String(s ?? '').trim().toLowerCase()
const money = (s) => Number(String(s ?? '').match(/\d[\d,]*(?:\.\d+)?/)?.[0].replace(/,/g, '').replace(/\.$/, '')) || 0
const usd = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Every mailbox that was the business (or the owners' Gmail it forwarded to).
const OUR_ADDRESSES = ['changeadams3@gmail.com', 'changeadams@gmail.com', 'change.adams@gmail.com', 'lacie.jaye.mccloud@gmail.com', 'clc.voicemail.01@gmail.com']
export const isOurAddress = (a) => /@christmas-light-creations\.com$/i.test(a) || /^info\+/i.test(a) || OUR_ADDRESSES.includes(lower(a))

const SERVICE_FROM = /no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|newsletter|marketing|news@|info@(?!christmas)|support@|service@|billing@|alerts?@|updates?@|@(e|em|email|emails|mail|messaging|txt\.voice)\./i
const PLATFORM = /paypal|squareup|google\.com|facebook|twitter|reddit|amazon|manta|yelp|thumbtack|nextdoor|homeadvisor|angi|godaddy|wix|wordpress|apple\.com|microsoft/i

// ---- Emails with people --------------------------------------------------------

// A person-to-person email -> { idBase, data, match: { emails } }, or null.
// Ids match the live sync's (em- + Message-ID hash), so nothing is doubled.
export function personEmail(e) {
  const labels = e.h['x-gmail-labels'] ?? ''
  if (/\b(Spam|Trash)\b/.test(labels)) return null
  if (e.h['list-unsubscribe'] || /bulk|list/i.test(e.h.precedence ?? '')) return null
  const from = addressesOf(e.h.from)[0] ?? ''
  if (!from || SERVICE_FROM.test(from) || PLATFORM.test(from.split('@')[1] ?? '')) return null
  const out = isOurAddress(from)
  const counterparts = (out ? addressesOf([e.h.to, e.h.cc, e.h.bcc].join(',')) : [from])
    .filter((a) => !isOurAddress(a) && !SERVICE_FROM.test(a) && !PLATFORM.test(a.split('@')[1] ?? ''))
  if (!counterparts.length) return null
  const messageId = lower(e.h['message-id'])
  const at = isoOf(e.date)
  if (!messageId || !at) return null
  const data = { source: 'old-mail', kind: 'email', direction: out ? 'out' : 'in', at, subject: e.subject.slice(0, 300) }
  const text = emailText(e.text)
  if (text) data.text = text
  return { idBase: `em-${sha(messageId)}`, data, match: { emails: counterparts } }
}

// ---- Estimate request notifications (website forms) ------------------------------

const FORM_SUBJECT = /^(New estimate from Get An Estimate|New Estimate - [A-Z]+\d+|Contact Form submission from|Estimate Submission)/i

// Label/value pairs in the shapes the forms used:
// "*Name*\n  Pat Sample", "Name : *Pat Sample*", "Sender's name: Pat Sample".
function formField(text, labels) {
  for (const label of labels) {
    const l = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = text.match(new RegExp(`^\\s*\\*?${l}\\*?\\s*:\\s*\\*?([^*\\n]*)\\*?\\s*$`, 'im'))
      ?? text.match(new RegExp(`^\\s*\\*${l}\\*\\s*\\n\\s*([^\\n*]+)`, 'im'))
    const v = m?.[1]?.replace(/<[^>]*>/g, '').trim()
    if (v) return v
  }
  return ''
}

// A form notification -> { date, name, email, phone, address, message, source }, or null.
export function formRequest(e) {
  if (!FORM_SUBJECT.test(e.subject)) return null
  const text = e.text.replace(/\r/g, '')
  const email = addressesOf(formField(text, ['Email', 'E-mail', 'your-email']))[0] ?? ''
  const phone = phonesOf(formField(text, ['Phone', 'tel-858']))[0] ?? ''
  if (!email && !phone) return null
  const date = isoOf(e.date)
  if (!date) return null
  return {
    date,
    name: formField(text, ['Name', "Sender's name", 'your-name']).replace(/\S+@\S+/, '').trim(),
    email, phone,
    address: formField(text, ['Address', 'Street Address']),
    city: formField(text, ['City']),
    message: formField(text, ['Message', 'your-message', 'Comments']).replace(/\s+/g, ' ').trim(),
    source: 'Estimate email',
  }
}

// ---- PayPal / Square --------------------------------------------------------------

function itemsOf(text) {
  const items = []
  // New layout: "Reinstall Christmas Lights 2020 $500.00 1 $500.00"
  for (const m of text.matchAll(/^(.+?) \$[\d,]+\.\d\d (\d+(?:\.\d+)?) \$([\d,]+\.\d\d)$/gm)) items.push(`${m[1].trim()} ${usd(money(m[3]))}`)
  // Old layout: "1.0 x New Install 2022", "$750.00 USD" (twice), then a description line.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  lines.forEach((l, i) => {
    const m = l.match(/^\d+(?:\.\d+)? x (.+)$/)
    if (!m) return
    const amounts = lines.slice(i + 1, i + 4).filter((x) => /^\$[\d,]+\.\d\d USD$/.test(x))
    const after = lines[i + 1 + amounts.length + (lines[i + 1 + amounts.length] === '-->' ? 1 : 0)]
    const desc = after && !/^(\d+(?:\.\d+)? x |\$|Total|Subtotal|Discount|-->)/.test(after) ? ` (${after})` : ''
    items.push(`${m[1].trim()}${amounts[0] ? ` ${usd(money(amounts[0]))}` : ''}${desc}`)
  })
  return items
}

// Customer block: name (if not an email), email, address lines.
function customerOf(text) {
  const block = text.match(/\nCustomer\n+([\s\S]{0,400}?)(?:\n\n(?:Note from customer|1\.0 x|Description)|\nNote from customer|\n\d+(?:\.\d+)? x )/)?.[1] ?? ''
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  const email = lines.map((l) => addressesOf(l)[0]).find((a) => a && !isOurAddress(a) && !/paypal/i.test(a)) ?? ''
  const name = lines.find((l) => !l.includes('@') && /[a-z]/i.test(l) && !/^\d/.test(l)) ?? ''
  const after = lines.slice(lines.findIndex((l) => l.includes('@')) + 1).filter((l) => !/^US\b|^United States$/.test(l))
  const ship = text.match(/Shipping address[^\n]*\n([^\n]+)\n([^\n]+)\n([^\n]+)/)
  const address = ship ? `${ship[2].trim()}, ${ship[3].trim()}` : after.length && email ? after.join(' ').replace(/,\s*,/g, ',') : ''
  return { name, email, address }
}

// A PayPal or Square email about money from a customer -> a payment/invoice, or null.
export function paymentOf(e) {
  const from = lower(addressesOf(e.h.from)[0])
  const s = e.subject
  const t = e.text.replace(/\r/g, '')
  const date = isoOf(e.date)
  if (!date) return null
  const invoice = (s.match(/invoice \(?#?(\d{4}-\d{3,})\)?/i) ?? t.match(/Invoice (?:ID|#|number)\s*:?\s*\n*\s*(\d{4}-\d{3,}|INV[\w-]+)/i) ?? t.match(/invoice (\d{4}-\d{3,})/i))?.[1] ?? ''
  const id = lower(e.h['message-id']) || `${from}|${s}|${date}`

  if (/paypal\.com$/.test(from)) {
    if (/just paid|just made a partial payment|received a (partial )?payment for invoice|Notification of payment received/i.test(s)) {
      const amount = money((t.match(/received an? \$([\d,.]+) USD payment/i) ?? t.match(/received \$([\d,.]+) USD/i) ?? t.match(/payment for \$([\d,.]+) USD/i) ?? t.match(/Total amount:\s*\$([\d,.]+)/i))?.[1])
      if (!amount) return null
      const c = customerOf(t)
      const raw = [s.match(/^(.+?) just (paid|made)/)?.[1], t.match(/payment for \$[\d,.]+ USD from (.+?)\.\s*$/m)?.[1], t.match(/^Buyer:[ \t]*(\S.*)$/m)?.[1], c.name]
        .map((x) => String(x ?? '').trim()).filter((x) => /[a-z]/i.test(x))
      // "TONY E DIAL (tony.dial@att.net)", or just an email where a name would be.
      const name = raw.map((x) => x.replace(/\s*\([^)]*@[^)]*\)?\s*/, '').trim()).find((x) => x && !x.includes('@')) ?? ''
      const email = c.email || raw.map((x) => addressesOf(x.replace(/[()]/g, ' '))[0]).find(Boolean) || ''
      return {
        id: `pay-${sha(id)}`, kind: 'payment', via: 'PayPal', date, amount, invoice,
        total: money(t.match(/(?:Invoice total|^Total)\s*\n*\s*\$([\d,.]+) USD/im)?.[1]),
        due: money(t.match(/Amount due\s*\n*\s*\$([\d,.]+)/i)?.[1]),
        name, email, address: c.address, items: itemsOf(t),
      }
    }
    const sent = s.match(/^We sent your invoice/i) ? t.match(/sent your invoice to (.+?) for \$([\d,.]+) USD/i)
      : s.match(/^You sent an invoice \([^)]+\) to (.+?) for \$([\d,.]+)/i)
    if (sent) {
      const to = t.match(/Sent to (.+)\n([^\n]+@[^\n]+)/)
      const to1 = sent[1].trim()
      const email = addressesOf(to?.[2])[0] ?? addressesOf(to1)[0] ?? ''
      return { id: `inv-${sha(id)}`, kind: 'invoice', via: 'PayPal', date, amount: money(sent[2]), invoice, name: to1.includes('@') ? '' : to1, email, address: '', items: itemsOf(t) }
    }
    return null
  }
  if (/squareup\.com$/.test(from)) {
    const m = t.match(/(?:resent|sent) an invoice of \$([\d,.]+) to (.+?)\.\s*$/m)
    if (m) return { id: `inv-${sha(`square|${s.match(/#(\d+)/)?.[1] ?? id}`)}`, kind: 'invoice', via: 'Square', date, amount: money(m[1]), invoice: s.match(/#(\d+)/)?.[1] ?? '', name: m[2].trim(), email: '', address: '', items: [] }
    const paid = t.match(/^(.+?) (?:has )?paid (?:invoice|your invoice)[^$]*\$([\d,.]+)/im)
    if (paid) {
      const name = s.match(/paid by (.+?)!/)?.[1] ?? paid[1].replace(/^Hello .*$/m, '').trim()
      return { id: `pay-${sha(id)}`, kind: 'payment', via: 'Square', date, amount: money(paid[2]), invoice: s.match(/#(\d+)/)?.[1] ?? '', name, email: '', address: '', items: [] }
    }
  }
  return null
}

// ---- History entries ------------------------------------------------------------

const matchOf = ({ email, phone, name }) => ({
  emails: email ? [lower(email)] : [], phones: phone ? phonesOf(phone) : [],
  names: /\S+\s+\S+/.test(name ?? '') ? [lower(name).replace(/\s+/g, ' ')] : [],
})

export function paymentEntry(p) {
  const head = p.kind === 'payment'
    ? `Paid ${usd(p.amount)} by ${p.via}${p.invoice ? ` · invoice ${p.invoice}` : ''}${p.total && p.total !== p.amount ? ` · invoice total ${usd(p.total)}` : ''}${p.due ? ` · still due ${usd(p.due)}` : ''}`
    : `${p.via} invoice${p.invoice ? ` ${p.invoice}` : ''} sent: ${usd(p.amount)}`
  const text = cap([head, ...p.items, p.address && `Address: ${p.address}`].filter(Boolean).join('\n'))
  return {
    id: p.id,
    data: { source: p.via.toLowerCase(), kind: p.kind, direction: p.kind === 'payment' ? 'in' : 'out', at: p.date, text, amount: p.amount, ...(p.invoice ? { invoice: p.invoice } : {}) },
    match: matchOf(p),
  }
}

// One estimate request (form email or old website row) -> history entry. Same
// person + same day = same id, so the notification email and the website's
// own record of that request are one entry.
export function requestEntry(r) {
  const who = lower(r.email) || phonesOf(r.phone)[0] || lower(r.name)
  const text = cap([r.message || '(no message)', [r.address, r.city].filter(Boolean).join(', ') && `Address: ${[r.address, r.city].filter(Boolean).join(', ')}`].filter(Boolean).join('\n'))
  return {
    id: `req-${sha(`${who}|${r.date.slice(0, 10)}`)}`,
    data: { source: 'website-form', kind: 'request', direction: 'in', at: r.date, text },
    match: matchOf(r),
  }
}
