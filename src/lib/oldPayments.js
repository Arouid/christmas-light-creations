import { matchMessages } from './messageImport.js'

// Old PayPal/Square payments (messages of kind 'payment', from the old-history
// import, docs/specs/old-history.md) → the customer's season billing, so the
// Seasons table and the customer's "What you've paid" show them.
// Pure; only EMPTY season fields are ever filled, so nothing typed by staff
// is overwritten.

// July–December is that year's season; January–June the previous one
// (same rule as seasonYear() in customers.js, read from the ISO date itself).
export function seasonOfDate(iso) {
  const y = Number(String(iso).slice(0, 4))
  const m = Number(String(iso).slice(5, 7))
  return String(m >= 7 ? y : y - 1)
}

// Install or takedown: the payment's own words first, else the month
// (takedown is early January; installs are October–December).
export function paymentPart(p) {
  const t = String(p.text ?? '')
  if (/take\s*-?\s*down|removal/i.test(t)) return 'takedown'
  if (/install/i.test(t)) return 'install'
  const m = Number(String(p.at).slice(5, 7))
  return m >= 1 && m <= 4 ? 'takedown' : 'install'
}

const usDate = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${m}/${d}/${y}` }
const dollars = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`
const VIA = { paypal: 'PayPal', square: 'Square' }
const empty = (v) => v == null || String(v).trim() === ''
// Where the amount goes: install "Total due" (what they paid, after any
// discount); takedown "Rate" (takedown has no total field).
const AMOUNT_FIELD = { install: 'total', takedown: 'rate' }

// → [{ season, parts: { install?, takedown? }, fills: [{ path, value }] }],
// newest first, only seasons with something to fill.
export function seasonFills(payments, customer) {
  const groups = new Map()
  for (const p of payments ?? []) {
    if (p?.kind !== 'payment' || !p.at || !(Number(p.amount) > 0)) continue
    const season = seasonOfDate(p.at)
    const part = paymentPart(p)
    const key = `${season}|${part}`
    const g = groups.get(key) ?? { season, part, amount: 0, count: 0, via: new Set(), last: '' }
    g.amount += Number(p.amount)
    g.count += 1
    g.via.add(VIA[String(p.source ?? '').toLowerCase()] ?? p.source ?? '')
    if (String(p.at) > g.last) g.last = String(p.at)
    groups.set(key, g)
  }
  const bySeason = new Map()
  for (const g of groups.values()) {
    const have = customer?.seasons?.[g.season]?.[g.part] ?? {}
    const base = `seasons.${g.season}.${g.part}`
    const via = [...g.via].filter(Boolean)
    const fills = [
      empty(have[AMOUNT_FIELD[g.part]]) && { path: `${base}.${AMOUNT_FIELD[g.part]}`, value: dollars(g.amount) },
      empty(have.paid) && { path: `${base}.paid`, value: 'Yes' },
      empty(have.paymentType) && via.length === 1 && { path: `${base}.paymentType`, value: via[0] },
      empty(have.paymentDate) && { path: `${base}.paymentDate`, value: usDate(g.last) },
    ].filter(Boolean)
    const s = bySeason.get(g.season) ?? { season: g.season, parts: {}, fills: [] }
    s.parts[g.part] = { amount: Math.round(g.amount * 100) / 100, count: g.count, via: via.join(' + '), date: usDate(g.last) }
    s.fills.push(...fills)
    bySeason.set(g.season, s)
  }
  return [...bySeason.values()].filter((s) => s.fills.length).sort((a, b) => b.season.localeCompare(a.season))
}

// Payments on Past requests cards (past-requests-plus.csv) → the same shape as
// payment messages, tagged with the customer they belong to.
export const paymentsFromPast = (r, customerId) => (r?.payments ?? [])
  .filter((x) => x.kind === 'payment')
  .map((x) => ({ kind: 'payment', at: x.date, amount: x.amount, source: x.via, text: x.items ?? '', customerId }))

// The same payment can come from both places: keep one per day and amount.
export function uniquePayments(list) {
  const seen = new Set()
  return (list ?? []).filter((p) => {
    const k = `${String(p.at).slice(0, 10)}|${Number(p.amount).toFixed(2)}|${p.customerId ?? ''}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// Phones and emails on old records (Past requests cards) that this customer
// doesn't have yet. Added as otherPhones / otherEmails so a re-import of the
// customer history brings over the texts, calls and emails from them.
const phoneKey = (s) => { const d = String(s ?? '').replace(/\D/g, ''); return d.length === 11 && d.startsWith('1') ? d.slice(1) : d }
const phonesIn = (s) => (String(s ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []).map(phoneKey).filter((d) => d.length === 10)
const emailsIn = (s) => String(s ?? '').toLowerCase().match(/[^\s<>,;"']+@[^\s<>,;"']+\.[a-z]{2,}/g) ?? []
export function contactLinks(pastList, c) {
  const havePhones = new Set([...phonesIn(c.phone), ...(c.otherPhones ?? []).flatMap(phonesIn)])
  const haveEmails = new Set([...emailsIn(c.email), ...(c.otherEmails ?? []).flatMap(emailsIn)])
  const phones = new Map()
  const emails = new Set()
  for (const r of pastList ?? []) {
    for (const d of phonesIn(r.phone)) if (!havePhones.has(d)) phones.set(d, r.phone)
    for (const e of [r.email, ...(r.otherEmails ?? [])].flatMap(emailsIn)) if (!haveEmails.has(e)) emails.add(e)
  }
  const fmt = (d) => `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return { phones: [...phones.keys()].map(fmt), emails: [...emails] }
}

// How a Past requests card matched a customer: 'email', 'phone' or 'name'
// (name-only can be a different person with the same name).
export function matchedBy(r, c) {
  const ce = new Set([...emailsIn(c.email), ...(c.otherEmails ?? []).flatMap(emailsIn)])
  if ([r.email, ...(r.otherEmails ?? [])].flatMap(emailsIn).some((e) => ce.has(e))) return 'email'
  const cp = new Set([...phonesIn(c.phone), ...(c.otherPhones ?? []).flatMap(phonesIn)])
  if (phonesIn(r.phone).some((d) => cp.has(d))) return 'phone'
  return 'name'
}

// History entries (customer-history.json) that reach a customer only through
// the phones/emails linked from old records (otherPhones / otherEmails): the
// ones a normal import skipped. Same ids as the Import tab, so bringing them
// over twice changes nothing.
// `only`: limit to these customer ids (default: every linked customer).
export const needsOldTexts = (c) => Boolean((c.otherPhones?.length || c.otherEmails?.length) && !c.oldTextsAt)
export function newFromLinks(list, customers, only) {
  const linked = (customers ?? []).filter((c) => (c.otherPhones?.length || c.otherEmails?.length) && (!only || only.includes(c.id)))
  if (!linked.length) return { records: [], customers: 0, byKind: {} }
  const ids = new Set(linked.map((c) => c.id))
  const before = new Set(matchMessages(list, (customers ?? []).map(({ otherPhones: _p, otherEmails: _e, ...c }) => c)).records.map((r) => r.id))
  const records = matchMessages(list, customers).records.filter((r) => ids.has(r.data.customerId) && !before.has(r.id))
  const byKind = {}
  for (const r of records) byKind[r.data.kind] = (byKind[r.data.kind] ?? 0) + 1
  return { records, customers: new Set(records.map((r) => r.data.customerId)).size, byKind }
}
