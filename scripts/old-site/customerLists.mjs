// The old yearly customer sheets from info@'s Google Drive (Takeout, saved
// 2026-10-15): who installed each season, the price, and how they paid. Many
// paid by Zelle, check, Venmo or cash, which no email shows. Each paid line
// becomes a payment in the same shape as paymentOf() (oldHistory.mjs), so it
// joins the customer history, the season billing fill (src/lib/oldPayments.js)
// and the win-back list like a PayPal or Square payment.
// Pure: sheets come in as rows of cell text (scripts/old-site/xlsx.mjs reads
// the files). Spec: docs/specs/old-history.md.
import { createHash } from 'node:crypto'

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20)
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const lower = (v) => clean(v).toLowerCase()
export const nameKey = (v) => lower(v).replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

// The sheets' own words for how someone paid -> the app's payment types
// (PAYMENT_TYPES in src/lib/customers.js). Cards went through Square.
const VIA = { pp: 'PayPal', paypal: 'PayPal', cc: 'Square', card: 'Square', square: 'Square', zelle: 'Zelle', check: 'Check', cheque: 'Check', venmo: 'Venmo', cash: 'Cash', cashapp: 'CashApp', 'cash app': 'CashApp' }
export const viaOf = (v) => VIA[lower(v)] ?? ''

// July–December is that year's season, January–June the one before
// (seasonOfDate in src/lib/oldPayments.js).
export const seasonOf = (iso) => {
  const y = Number(String(iso).slice(0, 4))
  return Number(String(iso).slice(5, 7)) >= 7 ? y : y - 1
}

// An Excel day number or the first US date in the text -> 'YYYY-MM-DD', else ''.
export function sheetDate(v) {
  const s = clean(v)
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Math.round((Number(s) - 25569) * 86400e3)).toISOString().slice(0, 10)
  const m = s.match(/(?:^|[^\d/])(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?![\d/])/)
  if (!m) return ''
  const [mo, d] = [Number(m[1]), Number(m[2])]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return ''
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// "$1,234.50" or "414" -> 1234.5; anything else -> 0.
export const money = (v) => {
  const m = clean(v).replace(/[$,]/g, '').match(/^\d+(\.\d+)?/)
  return m ? Math.round(Number(m[0]) * 100) / 100 : 0
}

// "Yes" / "Paid" -> the whole amount; "Partial Payment" or "1/2 payment ($200)"
// -> the dollar figure in the text when there is one. Anything else: not paid.
function paidAmount(paid, amount) {
  const s = clean(paid)
  if (/^(yes|paid|y)\b/i.test(s)) return amount
  if (/partial|1\/2/i.test(s)) return money(s.match(/\$\s*([\d,.]+)/)?.[1])
  return 0
}

const firstEmail = (v) => lower(v).split(/[\s,;]+/).find((x) => /^[^@\s]+@[^@\s]+\.[a-z]+$/.test(x)) ?? ''
const usDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${m}/${d}/${y}` }

// ---- Layout 1: one row per customer ("Accounts" tab, the 2024 list) --------
// Full Name … Install Rate | Total Due | Invoice | Paid | Payment Type |
// Payment Date … TD: Rate | TD: Invoice | TD: Paid | Payment Type | TD: Payment Date
function accountRows(rows) {
  const at = rows.findIndex((r) => r.some((c) => lower(c) === 'full name') && r.some((c) => lower(c) === 'paid'))
  if (at < 0) return []
  const h = rows[at].map(lower)
  const col = (name, from = 0) => (from < 0 ? -1 : h.indexOf(name, from))
  const iPaid = col('paid')
  const iTdPaid = col('td: paid')
  const parts = [
    { part: 'install', paid: iPaid, type: col('payment type', iPaid), date: col('payment date', iPaid), amount: [col('total due'), col('install rate')], invoice: col('invoice') },
    { part: 'takedown', paid: iTdPaid, type: col('payment type', iTdPaid), date: col('td: payment date'), amount: [col('td: rate')], invoice: col('td: invoice') },
  ].filter((p) => p.paid >= 0)
  const [iName, iEmail, iStatus, iSince] = [col('full name'), col('email address'), col('scheduling status'), col('since')]
  const out = []
  for (const r of rows.slice(at + 1)) {
    const name = clean(r[iName])
    if (!name) continue
    const installed = sheetDate(String(r[iStatus] ?? '').match(/installed\D*([\d/]+)/i)?.[1])
    for (const p of parts) {
      const due = p.amount.map((i) => money(r[i])).find((n) => n > 0) ?? 0
      const amount = paidAmount(r[p.paid], due)
      if (!amount) continue
      out.push({
        name, email: firstEmail(r[iEmail]), part: p.part, amount, via: viaOf(r[p.type]), date: sheetDate(r[p.date]),
        invoice: clean(r[p.invoice]).replace(/\.0$/, ''), installed: p.part === 'install' ? installed : '',
        since: /^(19|20)\d\d$/.test(clean(r[iSince])) ? clean(r[iSince]) : '',
      })
    }
  }
  return out
}

// ---- Layout 2: the 2022 revenue workbook ------------------------------------
// Blocks under a title row ("CLC Customer Install Info" / "CLC Client Take
// Down Info"), each with FIRST NAME | LAST NAME | (OWES) | PAID | PAYMENT TYPE.
// A row without a first and last name ends a block (the totals under it are
// not people).
function revenueRows(rows) {
  const out = []
  let cols = null
  let title = ''
  const lone = (cells) => (cells.filter(Boolean).length === 1 ? cells.find(Boolean) : '')
  for (const r of rows) {
    const cells = r.map(lower)
    if (cells.includes('first name') && cells.includes('last name')) {
      cols = { first: cells.indexOf('first name'), last: cells.indexOf('last name'), paid: cells.indexOf('paid'), type: cells.indexOf('payment type'), part: /take ?down/.test(title) ? 'takedown' : 'install' }
      continue
    }
    if (!cols || !clean(r[cols.first]) || !clean(r[cols.last])) {
      cols = null
      title = lone(cells) || title
      continue
    }
    const amount = money(r[cols.paid])
    if (!amount) continue
    out.push({ name: `${clean(r[cols.first])} ${clean(r[cols.last])}`, email: '', part: cols.part, amount, via: viaOf(r[cols.type]), date: '', invoice: '', installed: '', since: '', book: true })
  }
  return out
}

// ---- Contact details from any sheet: name -> phone, address, email --------
export function contactsOf(rows) {
  const at = rows.findIndex((r) => r.some((c) => ['full name', 'first name'].includes(lower(c))) && r.some((c) => /phone|address|email|recipient/.test(lower(c))))
  if (at < 0) return []
  const h = rows[at].map(lower)
  const find = (re) => h.findIndex((c) => re.test(c))
  const [iFull, iFirst, iLast, iPhone, iAddr, iCity, iEmail] = [h.indexOf('full name'), h.indexOf('first name'), h.indexOf('last name'), find(/^phone/), find(/^address$/), find(/^city$/), find(/^email address$|^recipient$/)]
  const out = []
  for (const r of rows.slice(at + 1)) {
    const name = clean(iFull >= 0 ? r[iFull] : `${clean(r[iFirst])} ${clean(r[iLast])}`)
    if (!/\S+\s+\S+/.test(name)) continue
    const street = iAddr >= 0 ? clean(r[iAddr]) : ''
    const city = iCity >= 0 ? clean(r[iCity]) : ''
    const address = street && city && !lower(street).includes(lower(city)) ? `${street}, ${city}` : street
    const c = { name, phone: iPhone >= 0 ? clean(r[iPhone]).replace(/[^\d()+\- .]/g, '') : '', address, email: iEmail >= 0 ? firstEmail(r[iEmail]) : '' }
    if (c.phone || c.address || c.email) out.push(c)
  }
  return out
}

// The season a sheet is about: most of its dates, else a year in its title
// (the 2022 workbook has no dates; its own heading says "2022 CLC REVENUE").
export function sheetSeason(lines, title = '') {
  const count = new Map()
  for (const l of lines) for (const d of [l.date, l.installed]) if (d) count.set(seasonOf(d), (count.get(seasonOf(d)) ?? 0) + 1)
  const best = [...count].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (best) return best
  const y = String(title).match(/\b(20\d\d)\b/)?.[1]
  return y ? Number(y) : 0
}

// One sheet (rows) -> its paid lines as payments. `title` is the file name,
// used for the season only when no date and no heading says it.
export function sheetPayments(rows, title = '') {
  const lines = accountRows(rows)
  const all = lines.length ? lines : revenueRows(rows)
  if (!all.length) return []
  const heading = rows.map((r) => r.join(' ')).join(' ').match(/\b(20\d\d) clc revenue/i)?.[1]
  const season = sheetSeason(all, heading ?? title)
  if (!season) return []
  return all.map((l) => {
    // The 2022 workbook is a calendar year of money in: its installs are the 2022
    // season, its takedowns were paid in January 2022 for the 2021 install
    // (owner: "2022 takedown would be for a 2021 install"; "if they paid in 2022
    // its important that theyre listed under 2022"). The season lists (2023,
    // 2024) hold one season: its takedown is paid the January after.
    const s = l.book && l.part === 'takedown' ? season - 1 : season
    const paidYear = l.book ? season : 0
    const inSeason = (d) => Boolean(d) && seasonOf(d) === s
    const date = inSeason(l.date) ? l.date : ''
    // Stand-in dates: takedowns the January after their season, installs the
    // install day or Dec 1. A 2022-book line's stand-in is always in 2022.
    const fallback = l.part === 'takedown' ? `${s + 1}-01-15` : inSeason(l.installed) ? l.installed : `${s}-12-01`
    return {
      id: `sheet-${sha(`${s}|${l.part}|${nameKey(l.name)}|${l.amount}`)}`,
      via: l.via || 'Not noted',
      kind: 'payment',
      amount: l.amount,
      invoice: l.invoice,
      date: date || fallback,
      undated: !date,
      season: s,
      paidYear,
      part: l.part,
      name: l.name,
      email: l.email,
      address: '',
      items: [
        l.book ? `${s} ${l.part} (customer list: ${season} revenue sheet)` : `${s} ${l.part} (customer list)`,
        inSeason(l.installed) && `Installed ${usDate(l.installed)}`,
        l.since && `Customer since ${l.since}`,
        !date && (paidYear ? `Paid in ${paidYear} (payment date not on the sheet)` : 'Payment date not on the sheet'),
      ].filter(Boolean),
    }
  })
}

// Install or takedown for a PayPal/Square email: its own words first, else the
// month (paymentPart in src/lib/oldPayments.js).
export function mailPart(m) {
  const t = [m.items ?? []].flat().join(' ')
  if (/take\s*-?\s*down|removal/i.test(t)) return 'takedown'
  if (/install/i.test(t)) return 'install'
  const month = Number(String(m.date).slice(5, 7))
  return month >= 1 && month <= 4 ? 'takedown' : 'install'
}

const digitsOf = (v) => String(v ?? '').replace(/\D/g, '')

// Fill phone/address/email from the contact rows (same full name), then hold
// each sheet line against the PayPal/Square emails (owner: "cross reference for
// timestamps on invoices and payments received"):
// - the money is already in the mail (same person, season and part; the same
//   method, or the same amount within $1 whatever the sheet says) -> the
//   line is dropped, the email (with its real date) is the record;
// - a line with no date takes the date of the matching invoice (same person or
//   invoice number, season, part and amount) as "Invoice sent …"; the payment
//   day stays unknown. A line whose sheet names the year the money came in
//   only takes a date from that year.
// The same line on two sheets counts once.
export function joinSheetPayments(sheetPays, contacts, mailPays) {
  const byName = new Map()
  for (const c of contacts) {
    const k = nameKey(c.name)
    const have = byName.get(k) ?? {}
    byName.set(k, { phone: have.phone || c.phone, address: have.address || c.address, email: have.email || c.email })
  }
  const mail = mailPays.filter((m) => m.date).map((m) => ({ ...m, day: String(m.date).slice(0, 10), season: seasonOf(m.date), part: mailPart(m), who: [lower(m.email), nameKey(m.name)].filter(Boolean) }))
  const near = (m, amount) => [m.amount, m.total].some((a) => Number(a) > 0 && Math.abs(Number(a) - amount) <= 1)
  const kept = []
  const ids = new Set()
  const counts = { inMail: 0, invoiceDate: 0 }
  for (const p of sheetPays) {
    if (ids.has(p.id)) continue
    ids.add(p.id)
    const c = byName.get(nameKey(p.name)) ?? {}
    const q = { ...p, email: p.email || c.email || '', phone: c.phone || '', address: c.address || '' }
    const who = new Set([lower(q.email), nameKey(q.name)].filter(Boolean))
    const same = (m) => m.season === q.season && m.part === q.part && m.who.some((k) => who.has(k))
    const inMail = mail.some((m) => m.kind === 'payment' && same(m) && (m.via === q.via || near(m, q.amount)))
    if (inMail) { counts.inMail++; continue }
    if (q.undated) {
      const inYear = (m) => !q.paidYear || m.day.startsWith(String(q.paidYear))
      const byNumber = (m) => digitsOf(q.invoice) && digitsOf(m.invoice) === digitsOf(q.invoice) && m.season === q.season && m.part === q.part
      const inv = mail
        .filter((m) => m.kind === 'invoice' && inYear(m) && (same(m) || byNumber(m)) && near(m, q.amount))
        .sort((a, b) => a.day.localeCompare(b.day))[0]
      if (inv) {
        counts.invoiceDate++
        const at = q.items.findIndex((t) => /payment date not on the sheet/i.test(t))
        const items = [...q.items]
        items.splice(at, 0, `${inv.via} invoice sent ${usDate(inv.day)}${inv.invoice ? ` (#${inv.invoice})` : ''}`)
        kept.push({ ...q, date: inv.day, items })
        continue
      }
    }
    kept.push(q)
  }
  return { kept, dropped: counts.inMail, invoiceDated: counts.invoiceDate }
}

// ---- Dates checked against texts and emails ---------------------------------
// Owner: "any payment that has a fingerprint in email or text or anywhere for
// that matter should have its date checked and tagged", "and filed under that
// date/year"; "If jane doe says she paid, cross reference for payments from
// her from any of our accepted methods"; "we send out payment confirmation
// emails for the last few years too".
// A message counts when WE say the money arrived (outgoing: "got your check",
// "thank you for your payment", "payment received") or THEY say they sent it
// (incoming: "I sent the Zelle", "check is in the mailbox", "just paid").
// Questions don't count. Any of our methods: the sheet's method isn't required.
// Questions, plans and memories don't date a payment: "will", "once", "if",
// "I think", "last year"…
const OURS = [
  /\b(received|recieved|got|have)\b.{0,20}\b(your|the|ur)\s+(payment|check|cheque|zelle|venmo|cash ?app|paypal|money|deposit|funds)\b/i,
  /\bthanks?( you)?\b.{0,15}\bfor (the |your |ur )?(prompt |quick )?(payment|check|cheque|zelle|venmo|cash ?app|paypal|money|deposit)\b/i,
  /\b(payment|deposit|check)\b.{0,25}\b(has been |was |is )?(received|processed|deposited|went through)\b/i,
  /\bpaid in full\b/i,
]
const THEIRS = [
  /(?<!\byou )(?<!\byou've )\b(sent|sending|mailed|dropped off|left|zelled|venmoed)\b.{0,30}\b(payment|check|cheque|zelle|venmo|cash ?app|paypal|money|deposit|funds)\b/i,
  /(?<!\byou )\b(sent|sending|mailed|zelled|venmoed)\b.{0,30}\$\s?\d/i,
  /\b(i|we|just|already)\s+(have\s+|just\s+)?(paid|zelled|venmoed|venmo'd)\b/i,
  /\bcheck\b.{0,25}\b(in the mail|mailbox|on (its|it's) way|under the (mat|door)|in (the|your) door)\b/i,
  /\bpayment\b.{0,20}\b(sent|made|submitted|went through|completed)\b/i,
]
const HEDGE = /\b(will|i'?ll|we'?ll|going to|gonna|once|if|when|until|after|before|think|thought|remember|last (year|time|season)|next (year|time)|back in)\b/i
const sentencesOf = (s) => String(s ?? '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
const amountsIn = (s) => [...String(s).matchAll(/\$\s?([\d,]+(?:\.\d\d)?)/g)].map((m) => Number(m[1].replace(/,/g, '')))

// One text or email -> { quote, amounts } when WE say the money arrived
// (outgoing) or THEY say they sent it (incoming), else null.
export function paymentSignal(direction, subject, text) {
  const rules = direction === 'out' ? OURS : THEIRS
  // Only the new part of an email: stop at a quoted earlier message.
  const own = String(text ?? '').split(/\n\s*On .{5,80} wrote:|\n-{2,} ?Original Message|\nBegin forwarded message|\n>/i)[0]
  for (const s of [String(subject ?? ''), ...sentencesOf(own)]) {
    if (!s || /\?\s*$/.test(s) || HEDGE.test(s)) continue
    if (rules.some((re) => re.test(s))) return { quote: s.trim().slice(0, 90), amounts: amountsIn(s) }
  }
  return null
}

const ten = (p) => String(p ?? '').replace(/\D/g, '').slice(-10)
const phonesIn = (s) => (String(s ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []).map(ten)

// When a sheet line's money could have moved: installs July–December of their
// season, takedowns January–April after it; a line whose sheet names the year
// the money came in stays inside that year.
function windowOf(p) {
  const y = p.part === 'takedown' ? p.season + 1 : p.season
  const [lo, hi] = p.part === 'takedown' ? [`${y}-01-01`, `${y}-04-30`] : [`${y}-07-01`, `${y}-12-31`]
  return [lo, `${hi}T23:59:59`]
}
const DAY = 86400e3
const NEAR_DAYS = 14

// Check every sheet line's date against the person's texts and emails
// (history entries: text, voicemail, email) and tag where the date comes from:
// - no date on the sheet + a message about paying -> that message's day is
//   the payment day ("Date from their text of 1/3/2022: “I paid the invoice
//   with Zelle.”"); our "received" beats their "sent", then the earliest;
// - a sheet date + a message within two weeks -> "Date checked: …";
// - a sheet date and no such message -> "Date from the sheet (no text or email
//   about it found)".
// A message naming a dollar amount only counts when it is this line's amount.
// People are matched by the line's email and phone, and by every phone and email
// found for the same full name anywhere (`nameContacts`: nameKey -> [phones and emails]).
export function checkSheetDates(pays, messages, nameContacts = new Map()) {
  const byKey = new Map()
  for (const e of messages) {
    const d = e.data ?? {}
    if (!['text', 'email', 'voicemail'].includes(d.kind) || !d.at) continue
    const sig = paymentSignal(d.direction, d.subject, d.text)
    if (!sig) continue
    const ev = { at: String(d.at), day: String(d.at).slice(0, 10), ours: d.direction === 'out', kind: d.kind, ...sig }
    const keys = d.kind === 'email' ? (e.match?.emails ?? []).map((x) => `e:${lower(x)}`) : [`p:${ten(d.phone)}`]
    for (const k of keys) if (k.length > 4) byKey.set(k, [...(byKey.get(k) ?? []), ev])
  }
  const counts = { 'sheet payment dated by a text or email': 0, 'sheet payment date checked by a text or email': 0, 'sheet payment date from the sheet only': 0 }
  const tag = (ev) => `${ev.ours ? 'our' : 'their'} ${ev.kind} of ${usDate(ev.day)}: “${ev.quote}”`
  const out = pays.map((p) => {
    const keys = new Set([
      p.email && `e:${lower(p.email)}`,
      ...phonesIn(p.phone).map((x) => `p:${x}`),
      ...(nameContacts.get(nameKey(p.name)) ?? []).flatMap((v) => (v.includes('@') ? [`e:${lower(v)}`] : phonesIn(v).map((x) => `p:${x}`))),
    ].filter(Boolean))
    const seen = new Set()
    const evs = [...keys].flatMap((k) => byKey.get(k) ?? [])
      .filter((ev) => !ev.amounts.length || ev.amounts.some((a) => Math.abs(a - p.amount) <= 1))
      .filter((ev) => !seen.has(ev.at + ev.quote) && seen.add(ev.at + ev.quote))
      .sort((a, b) => (b.ours - a.ours) || a.at.localeCompare(b.at))
    if (p.undated) {
      const [lo, hi] = windowOf(p)
      const ev = evs.find((x) => x.at >= lo && x.at <= hi)
      if (!ev) return p
      counts['sheet payment dated by a text or email']++
      const items = p.items.filter((t) => !/payment date not on the sheet/i.test(t))
      return { ...p, date: ev.day, undated: false, items: [...items, `Date from ${tag(ev)}`] }
    }
    const near = evs.filter((ev) => Math.abs(Date.parse(ev.day) - Date.parse(p.date)) <= NEAR_DAYS * DAY)
      .sort((a, b) => Math.abs(Date.parse(a.day) - Date.parse(p.date)) - Math.abs(Date.parse(b.day) - Date.parse(p.date)))[0]
    if (near) {
      counts['sheet payment date checked by a text or email']++
      return { ...p, items: [...p.items, `Date checked: ${tag(near)}`] }
    }
    counts['sheet payment date from the sheet only']++
    return { ...p, items: [...p.items, 'Date from the sheet (no text or email about it found)'] }
  })
  return { pays: out, counts }
}
