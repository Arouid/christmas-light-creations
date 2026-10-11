// Bounced addresses on a customer / lead / past-request record
// (docs/specs/email-bounces.md). The server notes each address an email
// bounced from in bouncedEmails; a note only counts while that address is
// still on the record, so fixing a typo clears the warning. Pure.
import { customerEmailKeys } from '../../functions/account.js'

// record -> [{ email, at, reason }] for addresses still on it, newest first.
export function bouncesOnRecord(record) {
  const on = new Set(customerEmailKeys(record))
  return Object.entries(record?.bouncedEmails ?? {})
    .filter(([email]) => on.has(email))
    .map(([email, b]) => ({ email, at: String(b?.at ?? ''), reason: String(b?.reason ?? '') }))
    .sort((a, b) => b.at.localeCompare(a.at))
}

// The note for one address on the record, or null.
export const bounceOf = (record, email) => bouncesOnRecord(record).find((b) => b.email === String(email ?? '').trim().toLowerCase()) ?? null

// A website request's email can't be edited (it's what they typed).
export const LEAD_HINT = 'Call or text them for the right address; make them a customer to fix it there.'

const dayOf = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// "Email to pat@example.com bounced Oct 10: the address doesn’t exist (check it for a typo)."
export const bounceLine = (b) => `Email to ${b.email} bounced${dayOf(b.at) ? ` ${dayOf(b.at)}` : ''}${b.reason ? `: ${b.reason}` : ''}.`
