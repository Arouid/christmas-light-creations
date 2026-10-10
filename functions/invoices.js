// Invoices (docs/specs/invoices.md): our own invoices, paid through the same
// PayPal Orders flow as proposals. Pure rules shared by the server
// (functions/index.js) and the pages (src/lib/invoices.js re-exports this
// file), so the amount charged, the staff list and the customer's page can't
// disagree. No Firebase and no Node-only APIs here: browsers and tests import it.
//
// Money is in cents (integers). Dates are 'YYYY-MM-DD' strings in Central time.

export const KINDS = ['install', 'takedown', 'addon', 'service', 'other']
export const KIND_LABEL = { install: 'Lights up (install / re-install)', takedown: 'Takedown', addon: 'Add-on', service: 'Service call', other: 'Other' }
export const KIND_SHORT = { install: 'Lights up', takedown: 'Takedown', addon: 'Add-on', service: 'Service', other: 'Other' }
// Money taken outside the site, recorded by staff with "Mark paid".
export const OFFLINE_METHODS = ['Cash', 'Check', 'Zelle', 'Venmo', 'CashApp', 'Square', 'PayPal', 'Other']
// Due terms (owner 2026-10-09: on receipt by default). 'date' = staff picked one.
export const TERMS_DAYS = { receipt: 0, net7: 7, net14: 14 }
export const TERMS_LABEL = { receipt: 'On receipt', net7: 'In 7 days', net14: 'In 14 days', date: 'On a date' }
// Reminder emails, days after the due date (owner 2026-10-09), then stop.
export const REMINDER_DAYS = [7, 14]
// Never two emails to the customer within this gap (a reminder the morning
// after "Email again" would be nagging).
export const REMINDER_GAP_MS = 20 * 60 * 60 * 1000
export const MAX_ITEMS = 30
export const MAX_CENTS = 5_000_000 // $50,000: a typo guard, not a business rule
export const STATE_LABEL = { draft: 'Draft', open: 'Due', overdue: 'Overdue', paid: 'Paid', void: 'Cancelled' }
// What a sent install/takedown invoice writes in the season's Invoice box.
export const INVOICE_SENT_BOX = 'CLC Invoice Sent'

const DAY = 24 * 60 * 60 * 1000
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const dayNum = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) / DAY
export const addDays = (s, n) => new Date((dayNum(s) + n) * DAY).toISOString().slice(0, 10)
export const daysBetween = (from, to) => dayNum(to) - dayNum(from)
export const centralDay = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export const usDate = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${m}/${d}/${y}` }
export const longDate = (iso) => (isDate(iso) ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '')

// Firestore Timestamp (server or browser), {seconds}, Date, ms or ISO → ms.
export const toMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds != null ? t.seconds * 1000 : t instanceof Date ? t.getTime() : typeof t === 'number' ? t : t ? Date.parse(t) : NaN)
const dayOf = (t) => { const ms = toMs(t); return Number.isFinite(ms) ? centralDay(new Date(ms)) : '' }

export const money = (c) => `${c < 0 ? '−' : ''}$${(Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const dollars = (c) => (c / 100).toFixed(2)
// Typed dollars ("1,250", "$45.5", "-20") → cents, or null.
export const toCents = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export const invoiceCents = (inv) => (inv?.items ?? []).reduce((t, i) => t + (Number.isInteger(i?.cents) ? i.cents : 0), 0)

// What's wrong with the line items, or null. A negative line (a discount) is
// fine as long as the total is more than $0.
export function itemsProblem(items) {
  if (!Array.isArray(items) || !items.length) return 'Add at least one line'
  if (items.length > MAX_ITEMS) return `At most ${MAX_ITEMS} lines`
  if (items.some((i) => !String(i?.description ?? '').trim())) return 'Every line needs a description'
  if (items.some((i) => !Number.isInteger(i?.cents) || i.cents === 0)) return 'Every line needs an amount'
  const total = invoiceCents({ items })
  if (total <= 0) return 'The total must be more than $0'
  if (total > MAX_CENTS) return 'The total looks too big. Check the amounts.'
  return null
}

// What's missing before staff can send it.
export function sendProblems(inv) {
  return [
    !inv?.customerId && 'Pick a customer',
    !String(inv?.customer?.name ?? '').trim() && 'Add the customer’s name',
    !/^\d{4}$/.test(String(inv?.season ?? '')) && 'Pick a season',
    !KINDS.includes(inv?.kind) && 'Pick what it’s for',
    inv?.terms === 'date' && !isDate(inv?.dueDate) && 'Pick a due date',
    itemsProblem(inv?.items),
  ].filter(Boolean)
}

// The due date set when staff press Send (relative terms count from that day).
export const dueDateFor = (inv, today) => (inv?.terms === 'date' && isDate(inv.dueDate) ? inv.dueDate : addDays(today, TERMS_DAYS[inv?.terms] ?? 0))

// draft · open · overdue · paid · void. Overdue isn't stored: open and past due.
export function invoiceState(inv, today) {
  if (['draft', 'paid', 'void'].includes(inv?.status)) return inv.status
  return isDate(inv?.dueDate) && today > inv.dueDate ? 'overdue' : 'open'
}

// CLC-2026-0001: year it was sent + a count that restarts each January 1 (owner 2026-10-09).
export const invoiceNumber = (year, n) => `CLC-${year}-${String(n).padStart(4, '0')}`

// Link tokens (the document id) are long random strings.
export const validToken = (t) => typeof t === 'string' && t.length >= 16 && t.length <= 64 && /^[A-Za-z0-9]+$/.test(t)
// PayPal custom_id: ties the payment to this one invoice.
export const invoiceCustomId = (token) => `inv:${token}`

// Can the customer pay it online right now? null, or [HttpsError code, message].
export function payableInvoiceProblem(inv) {
  if (!inv) return ['not-found', 'Invoice not found']
  if (inv.status === 'draft') return ['failed-precondition', 'This invoice isn’t ready yet']
  if (inv.status === 'void') return ['failed-precondition', 'This invoice was cancelled. Please call us.']
  if (inv.status === 'paid' || inv.payment?.status === 'paid') return ['already-exists', 'This invoice is already paid']
  if (inv.status !== 'open') return ['failed-precondition', 'This invoice can’t be paid online']
  if (itemsProblem(inv.items)) return ['failed-precondition', 'Nothing due on this invoice']
  return null
}

// How and when it was paid: online (recorded by the server) or marked paid by
// staff. `id` keys the one-time steps (season fill, emails) for this payment.
const SOURCE = { paypal: 'PayPal', venmo: 'Venmo', card: 'Card' }
export function paidInfo(inv) {
  if (inv?.payment?.status === 'paid') {
    const p = inv.payment
    return { id: String(p.captureId || p.orderId || 'online'), online: true, method: SOURCE[p.source] ?? 'PayPal', date: dayOf(p.paidAt), cents: p.cents, sandbox: p.env === 'sandbox' }
  }
  if (inv?.status === 'paid' && inv.offline) {
    const o = inv.offline
    return { id: `off${Number(o.at) || 0}`, online: false, method: o.method || 'Other', date: isDate(o.date) ? o.date : '', cents: invoiceCents(inv), note: o.note ?? '', sandbox: false }
  }
  return null
}

// ---- The customer's season billing (customers/{id}.seasons.<season>) -------
// Only Lights up and Takedown invoices touch it: the season's install total
// is the whole season's bill, so an add-on or service invoice doesn't belong there.
// Same boxes and formats as src/lib/oldPayments.js; only EMPTY boxes are
// filled, except Paid "No", which becomes "Yes".
const PART = { install: 'install', takedown: 'takedown' }
const AMOUNT_FIELD = { install: 'total', takedown: 'rate' }
const empty = (v) => v == null || String(v).trim() === ''
const dollarsText = (c) => `$${(c / 100).toFixed(2)}`
const seasonPart = (inv) => (PART[inv?.kind] && /^\d{4}$/.test(String(inv?.season ?? '')) ? PART[inv.kind] : null)
// Payment type box: card payments go through PayPal.
const seasonMethod = (paid) => (paid.online ? (paid.method === 'Venmo' ? 'Venmo' : 'PayPal') : paid.method)

export function seasonFillsOnPaid(inv, customer, paid) {
  const part = seasonPart(inv)
  if (!part || !paid) return []
  const have = customer?.seasons?.[inv.season]?.[part] ?? {}
  const base = `seasons.${inv.season}.${part}`
  return [
    empty(have[AMOUNT_FIELD[part]]) && { path: `${base}.${AMOUNT_FIELD[part]}`, value: dollarsText(paid.cents ?? invoiceCents(inv)) },
    (empty(have.paid) || /^no$/i.test(String(have.paid).trim())) && { path: `${base}.paid`, value: 'Yes' },
    empty(have.paymentType) && { path: `${base}.paymentType`, value: seasonMethod(paid) },
    empty(have.paymentDate) && paid.date && { path: `${base}.paymentDate`, value: usDate(paid.date) },
  ].filter(Boolean)
}

// When sent: the season's Invoice box says so (if it's empty or "Not Yet Invoiced").
export function seasonFillsOnSend(inv, customer) {
  const part = seasonPart(inv)
  if (!part) return []
  const box = customer?.seasons?.[inv.season]?.[part]?.invoice
  return empty(box) || box === 'Not Yet Invoiced' ? [{ path: `seasons.${inv.season}.${part}.invoice`, value: INVOICE_SENT_BOX }] : []
}

// ---- Reminders -------------------------------------------------------------
// customer emails sent so far: inv.sent = { invoice, again_<ms>, reminder_<day>, receipt_<id> }
const lastEmailMs = (inv) => Math.max(0, ...Object.values(inv?.sent ?? {}).map((x) => Number(x?.at) || 0))
export const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e ?? '').trim())

// The reminder due today (7 or 14), or null. A missed day catches up with
// the latest one only, never several at once.
export function reminderDue(inv, today, nowMs) {
  if (inv?.status !== 'open' || inv.remindersOff || !emailOk(inv.customer?.email) || !isDate(inv.dueDate) || !inv.sent?.invoice) return null
  const late = daysBetween(inv.dueDate, today)
  const day = REMINDER_DAYS.filter((d) => late >= d).at(-1)
  if (!day) return null
  const sentDays = Object.keys(inv.sent).filter((k) => k.startsWith('reminder_')).map((k) => Number(k.slice(9)))
  if (sentDays.some((d) => d >= day)) return null
  if (nowMs - lastEmailMs(inv) < REMINDER_GAP_MS) return null
  return day
}

// ---- Staff list ------------------------------------------------------------
// Open includes overdue (overdue is the part of open that's past due).
export function listTotals(invoices, today) {
  const t = { draft: { n: 0, cents: 0 }, open: { n: 0, cents: 0 }, overdue: { n: 0, cents: 0 }, paid: { n: 0, cents: 0 }, void: { n: 0, cents: 0 } }
  for (const inv of invoices ?? []) {
    const s = invoiceState(inv, today)
    const c = s === 'paid' ? (paidInfo(inv)?.cents ?? invoiceCents(inv)) : invoiceCents(inv)
    const add = (k) => { t[k].n++; t[k].cents += c }
    if (s === 'overdue') { add('overdue'); add('open') } else add(s)
  }
  return t
}

// ---- Customer's account (/account/) ----------------------------------------
export const shownInvoice = (inv) => inv?.status === 'open' || inv?.status === 'paid'
export function invoiceSummary(token, inv, today) {
  const paid = paidInfo(inv)
  return {
    token, number: inv.number ?? '', state: invoiceState(inv, today), kind: inv.kind ?? 'other', season: inv.season ?? '',
    customer: { name: inv.customer?.name ?? '', address: inv.customer?.address ?? '' },
    cents: invoiceCents(inv), dueDate: inv.dueDate ?? '', sentDay: dayOf(inv.sentAt),
    paid: paid && { method: paid.method, date: paid.date, cents: paid.cents, sandbox: paid.sandbox },
  }
}

// ---- Emails (from info@) ---------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
const firstName = (inv) => String(inv?.customer?.name ?? '').trim().split(/\s+/)[0] || 'there'
const PHONE = '281-819-0163'
const BIZ = 'Christmas Light Creations'

// Branded HTML (dark blue header, gold button) with a plain-text twin.
function branded({ heading, paragraphs, button, rows, footer }) {
  const p = (t) => `<p style="margin:0 0 14px">${t}</p>`
  const table = rows?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:15px">${rows.map(([a, b, strong]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb${strong ? ';font-weight:700' : ''}">${esc(a)}</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap${strong ? ';font-weight:700' : ''}">${esc(b)}</td></tr>`).join('')}</table>`
    : ''
  const btn = button ? `<p style="margin:22px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#ffcf4d;color:#050b1a;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px">${esc(button.label)}</a></p>` : ''
  return `<div style="background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
<div style="background:#050b1a;padding:20px 24px;color:#ffcf4d;font-family:Georgia,serif;font-size:22px;font-weight:700">${BIZ}</div>
<div style="padding:24px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;color:#050b1a">${esc(heading)}</h1>
${paragraphs.map((x) => p(x)).join('\n')}
${table}${btn}
<p style="margin:18px 0 0;color:#4b5563;font-size:14px">${footer}</p>
</div></div></div>`
}

const itemRows = (inv) => [...(inv.items ?? []).map((i) => [i.description, money(i.cents)]), ['Total', money(invoiceCents(inv)), true]]
const itemText = (inv) => [...(inv.items ?? []).map((i) => `  ${i.description}: ${money(i.cents)}`), `  Total: ${money(invoiceCents(inv))}`].join('\n')
const dueText = (inv, today) => (inv.dueDate && inv.dueDate > today ? `due ${longDate(inv.dueDate)}` : 'due now')

// type: 'invoice' (first time), 'again' (staff pressed Email again), 'reminder'.
export function invoiceEmail({ inv, link, today, type = 'invoice', day = 0 }) {
  const first = firstName(inv)
  const total = money(invoiceCents(inv))
  const what = `${KIND_SHORT[inv.kind] ?? 'Invoice'}${inv.season ? `, ${inv.season} season` : ''}`
  const late = type === 'reminder'
  const subject = late
    ? `Reminder: invoice ${inv.number} (${total}) is past due`
    : `Invoice ${inv.number} from ${BIZ}: ${total} ${dueText(inv, today)}`
  const opening = late
    ? `Hi ${first}, just a friendly reminder: invoice ${inv.number} for ${total} was due ${longDate(inv.dueDate)}${day ? ` (${day} days ago)` : ''}. If you’ve already paid, thank you, and please ignore this.`
    : `Hi ${first}, here’s your invoice from ${BIZ}. Thank you for letting us light up your home!`
  const payLine = 'Pay online with PayPal, Venmo or a card. You can also save or print it from the same page.'
  const note = inv.note ? `\n\n${inv.note}` : ''
  const text = `${opening}\n\nInvoice ${inv.number} · ${what}\n${itemText(inv)}\n${late ? '' : `Due: ${inv.dueDate && inv.dueDate > today ? longDate(inv.dueDate) : 'on receipt'}\n`}${note}\n\nView and pay: ${link}\n${payLine}\n\nQuestions? Call or text ${PHONE}.\n\nThank you,\n${BIZ}`
  const html = branded({
    heading: late ? 'A friendly reminder' : `Invoice ${inv.number}`,
    paragraphs: [esc(opening), `<strong>${esc(what)}</strong>${late ? '' : ` · ${inv.dueDate && inv.dueDate > today ? `due ${esc(longDate(inv.dueDate))}` : 'due on receipt'}`}`, ...(inv.note ? [esc(inv.note).replace(/\n/g, '<br>')] : [])],
    rows: itemRows(inv),
    button: { href: link, label: `Pay ${total}` },
    footer: `${esc(payLine)} Questions? Call or text <a href="tel:+12818190163" style="color:#050b1a">${PHONE}</a>.`,
  })
  return { subject, text, html }
}

export function receiptEmail({ inv, link, paid }) {
  const first = firstName(inv)
  const total = money(paid.cents ?? invoiceCents(inv))
  const how = paid.online ? `by ${paid.method}` : `by ${paid.method.toLowerCase() === 'other' ? 'your payment' : paid.method}`
  const line = `We received your payment of ${total} ${how}${paid.date ? ` on ${longDate(paid.date)}` : ''} for invoice ${inv.number}. Thank you!`
  return {
    subject: `Paid: invoice ${inv.number} (${total}). Thank you!`,
    text: `Hi ${first},\n\n${line}${paid.sandbox ? '\n(TEST payment: no real money moved.)' : ''}\n\nYour receipt is here any time (save or print it as a PDF):\n${link}\n\nThank you,\n${BIZ}\n${PHONE}`,
    html: branded({
      heading: 'Thank you! Payment received',
      paragraphs: [`Hi ${esc(first)},`, esc(line), ...(paid.sandbox ? ['<strong>TEST payment: no real money moved.</strong>'] : [])],
      rows: itemRows(inv),
      button: { href: link, label: 'View your receipt' },
      footer: `Questions? Call or text <a href="tel:+12818190163" style="color:#050b1a">${PHONE}</a>.`,
    }),
  }
}

export function staffPaidEmail({ inv, link, paid }) {
  const name = inv.customer?.name || 'A customer'
  const total = money(paid.cents ?? invoiceCents(inv))
  const how = paid.online
    ? `paid ${total} online by ${paid.method}${paid.sandbox ? ' (TEST payment, sandbox)' : ''}.\nPayPal order ${inv.payment?.orderId ?? ''}.`
    : `was marked paid: ${total} by ${paid.method}${paid.date ? ` on ${usDate(paid.date)}` : ''}${inv.offline?.by ? ` (recorded by ${inv.offline.by})` : ''}.${paid.note ? `\nNote: ${paid.note}` : ''}`
  const season = seasonPart(inv) ? `\nTheir ${inv.season} season billing (${KIND_SHORT[inv.kind].toLowerCase()}) was filled in where it was empty.` : ''
  return {
    subject: `Invoice ${inv.number} paid: ${name} (${total})`,
    text: `${name} ${how}\nInvoice ${inv.number} · ${KIND_SHORT[inv.kind] ?? ''} ${inv.season ?? ''}${season}\n\nCustomer view: ${link}\nStaff app: https://christmas-light-creations.com/leads/#invoices`,
  }
}
