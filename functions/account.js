// Customer accounts (/account/): pure helpers for the server functions
// sendAccountLink, myAccount and accountPreview. No Firebase here, so tests
// can import it.
//
// A customer's account = every proposal, invoice and customer record whose
// emailKeys hold their verified sign-in email (any letter case) or whose
// phoneKeys hold their phone (phone sign-in, docs/specs/phone-sign-in.md).
import { PARTS, partCents, paymentOf } from './proposalMath.js'
import { centralDayOf, payIn3Due } from './payIn3.js'
import { phonesIn } from './phone.js'

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
// payment functions: deposit once signed, balance/takedown once staff ask or,
// on a Pay-in-3 plan, from the day they fall due (`today` = the Central day).
export function accountSummary(token, p, today = '') {
  const signed = p.status === 'signed' || p.status === 'countersigned'
  const dues = p.plan === 'payin3' ? payIn3Due(centralDayOf(p.signedAt), p.payDay) : null
  const parts = PARTS.map((part) => {
    const amount = partCents(p, part)
    const pay = paymentOf(p, part)
    const due = part === 'deposit' ? null : (dues?.[part] ?? null)
    let state = 'later'
    if (pay?.status === 'paid') state = 'paid'
    else if (amount <= 0) state = part === 'takedown' ? 'free' : 'none'
    else if (signed && (part === 'deposit' || p.requests?.[part] === true || (due && today && today >= due))) state = 'due'
    return { part, amount, state, due, paid: pay?.status === 'paid' ? pay.amount : 0, paidAt: iso(pay?.paidAt), sandbox: pay?.env === 'sandbox' }
  })
  return {
    token, status: p.status, title: p.title ?? 'Christmas lighting', season: p.season ?? '',
    kind: p.kind ?? null, plan: p.plan ?? null, payDay: p.payDay ?? null, // the page names the three payments by the plan (Pay in 3)
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
    originalRate: c.originalRate ?? '', since: c.since ?? '', reinstallBase: c.reinstallBase ?? null,
    addOns: (c.addOns ?? []).map(({ season, what, price, adds, kind }) => ({ season, what, price: price ?? null, adds: adds ?? null, kind: kind ?? 'addon' })),
    history: paymentHistory(c.seasons, current),
  }
}

// Staff see when a customer last signed in (customerLogins/{key}: the email,
// or the E.164 phone for phone sign-ins; written only by the server).
// authTime = when that sign-in happened (token auth_time), so reopening the
// page later doesn't count as a new sign-in.
export function loginRecord(prev, { email, phone, authTime, provider }) {
  const first = prev?.firstAt && prev.firstAt < authTime ? prev.firstAt : authTime
  const last = prev?.lastAt && prev.lastAt > authTime ? prev.lastAt : authTime
  return { email, ...(phone ? { phone } : {}), firstAt: first, lastAt: last, provider: last === authTime ? provider : prev?.provider ?? provider }
}
const PROVIDER = { 'google.com': 'Google', password: 'email link', emailLink: 'email link', phone: 'phone' }
export const providerName = (p) => PROVIDER[p] ?? p ?? ''

// Who is signed in to the account (docs/specs/phone-sign-in.md): the verified
// email (Google, the email link) and/or the phone (Firebase phone auth puts
// it in the token as E.164). `key` names them in records (updatedBy, chat,
// the login record): the email, else the phone. null = not signed in.
export function accountIdentity(token) {
  const email = token?.email_verified === true ? normEmail(token.email) : ''
  const phone = typeof token?.phone_number === 'string' && /^\+\d{8,15}$/.test(token.phone_number) ? token.phone_number : ''
  if (!email && !phone) return null
  return { email, phone, key: email || phone }
}
// The index queries for an identity: [field, value] pairs, one per key it has
// (a staff preview's identity has lists: previewIdentity below).
const keyList = (one, many) => [...new Set([one, ...(many ?? [])].filter(Boolean))]
export const accountQueries = (who) => [
  ...keyList(who?.email, who?.emails).map((e) => ['emailKeys', e]),
  ...keyList(who?.phone, who?.phones).map((p) => ['phoneKeys', p]),
]

// Staff seeing a customer's account as them (accountPreview,
// docs/specs/account-preview.md): every email and phone on their customer
// record, so the preview holds what any of their sign-ins would show. "Signed
// in as" shows the first email, else the first phone. key '' = nothing they
// could sign in with yet.
export function previewIdentity(c) {
  const emails = customerEmailKeys(c)
  const phones = customerPhoneKeys(c)
  return { email: emails[0] ?? '', phone: phones[0] ?? '', key: emails[0] || phones[0] || '', emails, phones }
}
// Browser request → { id } of the customer record, or { error }.
export function previewRequest(data) {
  const id = typeof data?.id === 'string' ? data.id.trim() : ''
  if (!id || id.length > 200 || id.includes('/')) return { error: ['invalid-argument', 'Which customer? Open the preview from their account in the staff app.'] }
  return { id }
}

// Staff callables (functions/index.js isStaffToken): only a verified Google
// sign-in counts, and its email must then be on the `staff` list. The email
// to look up, or '' (an email link or phone sign-in is never staff).
export function staffTokenEmail(token) {
  if (token?.email_verified !== true || token.firebase?.sign_in_provider !== 'google.com' || !token.email) return ''
  return normEmail(token.email)
}

// Newest first (signed or sent date).
export const byNewest = (a, b) => String(b.signedAt ?? b.sentAt ?? '').localeCompare(String(a.signedAt ?? a.sentAt ?? ''))

// Lowercase emails stored on each proposal and customer (emailKeys), kept up
// to date by the server, so sign-in looks people up instead of reading every
// record (security review risk 2).
export const proposalEmailKeys = (p) => [normEmail(p?.customer?.email)].filter((e) => EMAIL_RE.test(e))
export const customerEmailKeys = (c) => [...new Set([...emailsOf(c?.email), ...(c?.otherEmails ?? []).flatMap(emailsOf)])].filter((e) => EMAIL_RE.test(e))
// The same for phones (phoneKeys, E.164): a proposal's or invoice's
// customer.phone; a customer's phone plus the ones linked from old records.
export const proposalPhoneKeys = (p) => phonesIn(p?.customer?.phone)
export const customerPhoneKeys = (c) => [...new Set([...phonesIn(c?.phone), ...(c?.otherPhones ?? []).flatMap(phonesIn)])]
export const sameKeys = (a, b) => (a ?? []).length === (b ?? []).length && (a ?? []).every((x, i) => x === b[i])
