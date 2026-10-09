// Customer accounts (/account/): pure helpers for the server functions
// sendAccountLink and myAccount. No Firebase here, so tests can import it.
//
// A customer's account = every proposal whose customer.email matches their
// verified sign-in email (any letter case). Later, PayPal subscriptions can
// hang off the same email key.
import { PARTS, partCents, paymentOf } from './proposalMath.js'

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const normEmail = (e) => String(e ?? '').trim().toLowerCase()

// Where the sign-in link may send people back to (never taken from the
// browser as-is).
export const ACCOUNT_ORIGINS = ['https://christmas-light-creations.com', 'http://localhost:5173']
export const accountUrl = (origin) => `${ACCOUNT_ORIGINS.includes(origin) ? origin : ACCOUNT_ORIGINS[0]}/account/`

// Drafts are never shown; voided/declined ones only if money was paid on them.
export function shownInAccount(p) {
  if (!p || p.status === 'draft') return false
  if (p.status === 'void' || p.status === 'declined') return PARTS.some((part) => paymentOf(p, part)?.status === 'paid')
  return true
}

const iso = (t) => (t?.toDate ? t.toDate().toISOString() : typeof t === 'string' ? t : null)

// What the account page needs about one proposal. Same payable rule as the
// payment functions: deposit once signed, balance/takedown once staff ask.
export function accountSummary(token, p) {
  const signed = p.status === 'signed' || p.status === 'countersigned'
  const parts = PARTS.map((part) => {
    const amount = partCents(p, part)
    const pay = paymentOf(p, part)
    let state = 'later'
    if (pay?.status === 'paid') state = 'paid'
    else if (amount <= 0) state = part === 'takedown' ? 'free' : 'none'
    else if (signed && (part === 'deposit' || p.requests?.[part] === true)) state = 'due'
    return { part, amount, state, paid: pay?.status === 'paid' ? pay.amount : 0, paidAt: iso(pay?.paidAt), sandbox: pay?.env === 'sandbox' }
  })
  return {
    token, status: p.status, title: p.title ?? 'Christmas lighting', season: p.season ?? '',
    customer: { name: p.customer?.name ?? '', address: p.customer?.address ?? '', phone: p.customer?.phone ?? '' },
    sentAt: iso(p.sentAt), signedAt: iso(p.signedAt), parts,
  }
}

// A signed add-on proposal → the add-on entry recorded on the customer:
// undiscounted install items (the yearly price is based on list prices).
export function addOnFromProposal(token, p) {
  const install = (p.items ?? []).filter((i) => i.due !== 'removal')
  const sub = install.reduce((t, i) => t + Math.round((Number(i.qty) || 0) * Math.round((Number(i.rate) || 0) * 100)), 0)
  const what = install.map((i) => i.label).filter(Boolean).join(', ') || p.title || 'Add-on'
  return { id: `p-${token.slice(0, 8)}`, season: String(p.season ?? ''), what, price: sub / 100, source: 'proposal', token }
}

// Customer records whose email field (may hold several) includes this email.
export const emailsOf = (field) => String(field ?? '').toLowerCase().split(/[\s,;/]+/).filter((e) => e.includes('@'))

// Season billing (text from the sheet/staff app) → what the customer paid,
// per season, newest first. No totals across years (owner's request). Past
// seasons always; the current one only once something is marked paid.
const moneyCents = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : null }
function billLine(b, amountKeys) {
  if (!b) return null
  const amount = amountKeys.map((k) => moneyCents(b[k])).find((x) => x != null) ?? null
  const paid = String(b.paid ?? '').trim()
  const free = /^no takedown cost$/i.test(paid) || /no takedown cost/i.test(b.invoice ?? '') || amount === 0
  const state = /^yes$/i.test(paid) ? 'paid' : free ? 'free' : /^no$/i.test(paid) ? 'unpaid' : ''
  if (amount == null && !state) return null
  return { amount, state, by: state === 'paid' ? String(b.paymentType ?? '') : '', date: state === 'paid' ? String(b.paymentDate ?? '') : '' }
}
export function paymentHistory(seasons, current) {
  return Object.entries(seasons ?? {})
    .map(([season, s]) => ({ season, install: billLine(s?.install, ['total', 'rate']), takedown: billLine(s?.takedown, ['total', 'rate']) }))
    .filter((h) => (h.install || h.takedown) && (h.season < String(current) || (h.season === String(current) && [h.install, h.takedown].some((x) => x?.state === 'paid'))))
    .sort((a, b) => b.season.localeCompare(a.season))
}

// What a customer may see of their own customer record: the yearly-price
// inputs and what they paid each season, only once staff ticked
// "Customer can see this".
export function customerForAccount(c, current) {
  if (!c?.priceShown) return null
  return {
    originalRate: c.originalRate ?? '', since: c.since ?? '',
    addOns: (c.addOns ?? []).map(({ season, what, price }) => ({ season, what, price })),
    history: paymentHistory(c.seasons, current),
  }
}

// Staff see when a customer last signed in (customerLogins/{email}, written
// only by the server). authTime = when that sign-in happened (token
// auth_time), so reopening the page later doesn't count as a new sign-in.
export function loginRecord(prev, { email, authTime, provider }) {
  const first = prev?.firstAt && prev.firstAt < authTime ? prev.firstAt : authTime
  const last = prev?.lastAt && prev.lastAt > authTime ? prev.lastAt : authTime
  return { email, firstAt: first, lastAt: last, provider: last === authTime ? provider : prev?.provider ?? provider }
}
const PROVIDER = { 'google.com': 'Google', password: 'email link', emailLink: 'email link' }
export const providerName = (p) => PROVIDER[p] ?? p ?? ''

// Newest first (signed or sent date).
export const byNewest = (a, b) => String(b.signedAt ?? b.sentAt ?? '').localeCompare(String(a.signedAt ?? a.sentAt ?? ''))
