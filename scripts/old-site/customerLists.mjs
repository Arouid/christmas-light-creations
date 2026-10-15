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
    out.push({ name: `${clean(r[cols.first])} ${clean(r[cols.last])}`, email: '', part: cols.part, amount, via: viaOf(r[cols.type]), date: '', invoice: '', installed: '', since: '' })
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
    const inSeason = (d) => Boolean(d) && seasonOf(d) === season
    const date = inSeason(l.date) ? l.date : ''
    const fallback = l.part === 'takedown' ? `${season + 1}-01-15` : inSeason(l.installed) ? l.installed : `${season}-12-01`
    return {
      id: `sheet-${sha(`${season}|${l.part}|${nameKey(l.name)}|${l.amount}`)}`,
      via: l.via || 'Not noted',
      kind: 'payment',
      amount: l.amount,
      invoice: l.invoice,
      date: date || fallback,
      undated: !date,
      season,
      part: l.part,
      name: l.name,
      email: l.email,
      address: '',
      items: [
        `${season} ${l.part} (customer list)`,
        inSeason(l.installed) && `Installed ${usDate(l.installed)}`,
        l.since && `Customer since ${l.since}`,
        !date && 'Payment date not on the sheet',
      ].filter(Boolean),
    }
  })
}

// Fill phone/address/email from the contact rows (same full name), and drop
// a sheet payment that a PayPal or Square email already shows: same method,
// same season, same person (email or full name).
export function joinSheetPayments(sheetPays, contacts, mailPays) {
  const byName = new Map()
  for (const c of contacts) {
    const k = nameKey(c.name)
    const have = byName.get(k) ?? {}
    byName.set(k, { phone: have.phone || c.phone, address: have.address || c.address, email: have.email || c.email })
  }
  const seen = new Set()
  for (const p of mailPays) {
    if (p.kind !== 'payment' || !p.date) continue
    for (const who of [lower(p.email), nameKey(p.name)].filter(Boolean)) seen.add(`${p.via}|${seasonOf(p.date)}|${who}`)
  }
  const kept = []
  const ids = new Set() // the same line copied into two sheets counts once
  let dropped = 0
  for (const p of sheetPays) {
    if (ids.has(p.id)) continue
    ids.add(p.id)
    const c = byName.get(nameKey(p.name)) ?? {}
    const q = { ...p, email: p.email || c.email || '', phone: c.phone || '', address: c.address || '' }
    const inMail = ['PayPal', 'Square'].includes(q.via) && [lower(q.email), nameKey(q.name)].filter(Boolean).some((who) => seen.has(`${q.via}|${q.season}|${who}`))
    if (inMail) dropped++
    else kept.push(q)
  }
  return { kept, dropped }
}
