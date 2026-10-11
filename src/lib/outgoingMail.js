// Home → System status → "Outgoing email": did the emails the app sent (now
// or scheduled) really leave info@? The server stamps each app-sent history
// entry with gmailSeenAt when the sync finds its copy in Gmail's Sent folder
// (functions/index.js messageSync). Pure; the hook is src/leads/useOutgoingMail.js.
import { toMs } from './activity.js'

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
// The sync runs every few minutes; give a send this long before expecting Gmail to show it.
export const GRACE_MS = 15 * 60 * 1000

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// sent: history entries with source 'app' (at ISO, gmailSeenAt?); scheduled:
// scheduledEmails docs; lastSync: ms of the last sync that filed something.
export function outgoingLight({ sent = [], scheduled = [], lastSync = 0, now = Date.now() }) {
  const week = sent.filter((m) => now - toMs(m.at) <= WEEK_MS)
  const failed = scheduled.filter((s) => s.status === 'failed' && s.open !== false)
  const unconfirmed = week.filter((m) => !m.gmailSeenAt)
  // The sync ran after this went out (something else got filed later) and still didn't see it.
  const missing = unconfirmed.filter((m) => lastSync - toMs(m.at) > GRACE_MS)
  const waiting = unconfirmed.length - missing.length

  if (failed.length) return { color: 'red', note: `${plural(failed.length, 'email')} didn’t go (see Scheduled emails)`, failed: failed.length }
  if (missing.length) return { color: 'red', note: `${plural(missing.length, 'email')} not in Gmail’s Sent folder`, missing: missing.length }
  if (!week.length) return { color: 'green', note: 'nothing sent this week' }
  if (waiting) return { color: 'amber', note: `${plural(waiting, 'email')} waiting for Gmail to confirm`, waiting }
  return { color: 'green', note: `${plural(week.length, 'email')} this week, all in Gmail’s Sent` }
}
