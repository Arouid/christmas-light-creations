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
    else if (amount <= 0) state = 'none'
    else if (signed && (part === 'deposit' || p.requests?.[part] === true)) state = 'due'
    return { part, amount, state, paid: pay?.status === 'paid' ? pay.amount : 0, paidAt: iso(pay?.paidAt), sandbox: pay?.env === 'sandbox' }
  })
  return {
    token, status: p.status, title: p.title ?? 'Christmas lighting', season: p.season ?? '',
    customer: { name: p.customer?.name ?? '', address: p.customer?.address ?? '', phone: p.customer?.phone ?? '' },
    sentAt: iso(p.sentAt), signedAt: iso(p.signedAt), parts,
  }
}

// Newest first (signed or sent date).
export const byNewest = (a, b) => String(b.signedAt ?? b.sentAt ?? '').localeCompare(String(a.signedAt ?? a.sentAt ?? ''))
