// Home → System status → "Outgoing email": did the emails the app sent (now
// or scheduled) really leave info@? The server stamps each app-sent history
// entry with gmailSeenAt when the sync finds its copy in Gmail's Sent folder
// (functions/index.js messageSync). Pure; the hook is src/leads/useOutgoingMail.js.
import { customerEmailKeys } from '../../functions/account.js'
import { toMs } from './activity.js'

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
// The sync runs every few minutes; give a send this long before expecting Gmail to show it.
export const GRACE_MS = 15 * 60 * 1000
// When the sync started stamping Sent copies (messageSync deploy): emails sent
// before this had already been passed over, so they can never be confirmed.
export const CONFIRM_SINCE = Date.parse('2026-10-11T04:20:00Z')

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// History entries the server marked bounced (docs/specs/email-bounces.md)
// that still need someone: bounced in the last 7 days, and the address is
// still on the customer / lead it was sent to (not fixed yet). Entries whose
// record isn't in the lists (a past request) count for the 7 days.
export function openBounces(entries = [], { customers = [], leads = [] } = {}, now = Date.now()) {
  const records = new Map([...customers.map((c) => [`customer:${c.id}`, c]), ...leads.map((l) => [`lead:${l.id}`, l])])
  return entries.filter((m) => {
    if (!m.bounced || now - toMs(m.bouncedAt) > WEEK_MS) return false
    const rec = records.get(m.customerId ? `customer:${m.customerId}` : m.leadId ? `lead:${m.leadId}` : '')
    return !rec || customerEmailKeys(rec).includes(m.email)
  })
}

// sent: history entries with source 'app' (at ISO, gmailSeenAt?); scheduled:
// scheduledEmails docs; lastSync: ms of the last sync that filed something;
// bounced: openBounces().
export function outgoingLight({ sent = [], scheduled = [], bounced = [], lastSync = 0, now = Date.now() }) {
  const week = sent.filter((m) => now - toMs(m.at) <= WEEK_MS && toMs(m.at) >= CONFIRM_SINCE)
  const failed = scheduled.filter((s) => s.status === 'failed' && s.open !== false)
  const unconfirmed = week.filter((m) => !m.gmailSeenAt)
  // The sync ran after this went out (something else got filed later) and still didn't see it.
  const missing = unconfirmed.filter((m) => lastSync - toMs(m.at) > GRACE_MS)
  const waiting = unconfirmed.length - missing.length

  const reds = [
    failed.length && `${plural(failed.length, 'email')} didn’t go (see Scheduled emails)`,
    bounced.length && `${plural(bounced.length, 'email')} bounced (fix the address)`,
  ].filter(Boolean)
  if (reds.length) return { color: 'red', note: reds.join(' · '), ...(failed.length ? { failed: failed.length } : {}), ...(bounced.length ? { bounced: bounced.length } : {}) }
  if (missing.length) return { color: 'red', note: `${plural(missing.length, 'email')} not in Gmail’s Sent folder`, missing: missing.length }
  if (!week.length) return { color: 'green', note: 'nothing sent this week' }
  if (waiting) return { color: 'amber', note: `${plural(waiting, 'email')} waiting for Gmail to confirm`, waiting }
  return { color: 'green', note: `${plural(week.length, 'email')} this week, all in Gmail’s Sent` }
}
