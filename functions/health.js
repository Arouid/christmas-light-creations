// "Tell us when something breaks" (the old site lost requests when its
// emails failed and nobody noticed). Problems are saved as `incidents` (shown
// as a red banner in the staff app, which works even if email is down) and
// emailed to the alert list. A daily check catches silent failures; every
// Monday an "all OK" email proves the alerts themselves still work.
// Pure, so tests can run it.

export const INCIDENT_LABEL = {
  'lead-alert': 'New-request alert email didn’t go out',
  payment: 'A customer payment had a problem',
  paypal: 'PayPal didn’t answer',
  email: 'An email to a customer didn’t go out',
  sync: 'Texts/emails stopped syncing',
  push: 'Phone notifications didn’t go out',
  other: 'Something went wrong',
}

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
export const MAIL_GAP = HOUR // at most one email per kind of problem per hour

const ms = (t) => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : typeof t === 'number' ? t : t ? Date.parse(t) : NaN)

// Website requests from the last day whose staff alert never went out
// (15 minutes' grace for the alert to send).
export function missedLeadAlerts(leads, now) {
  return (leads ?? []).filter((l) => {
    const at = ms(l.createdAt)
    return Number.isFinite(at) && now - at > 15 * MIN && now - at < 26 * HOUR && !l.alertSentAt && l.status !== 'spam'
  })
}

// The texts/emails sync posts every few minutes when there's something new;
// three days with nothing at all means it has probably stopped.
export const syncStale = (lastSyncAt, now, days = 3) => !Number.isFinite(ms(lastSyncAt)) || now - ms(lastSyncAt) > days * DAY

export const shouldMail = (lastAt, now) => !lastAt || now - lastAt >= MAIL_GAP

const STAFF_APP = 'https://christmas-light-creations.com/leads/'
const when = (t) => new Date(ms(t)).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function incidentEmail({ kind, message }) {
  const label = INCIDENT_LABEL[kind] ?? INCIDENT_LABEL.other
  return {
    subject: `⚠ CLC website: ${label}`,
    text: `${label}.\n\n${message}\n\nIt's also shown in the staff app (red banner at the top): ${STAFF_APP}\nForward this to whoever looks after the website if it isn't clear what to do.`,
  }
}

// Daily check → an email only when there are problems, plus the Monday
// all-OK. Returns null when there's nothing to send.
export function dailyReport({ problems, openIncidents = [], monday, stats }) {
  const lines = [
    ...problems,
    ...openIncidents.map((i) => `• ${INCIDENT_LABEL[i.kind] ?? INCIDENT_LABEL.other} (${when(i.at)}): ${i.message}`),
  ]
  if (lines.length) {
    return { subject: `⚠ CLC website daily check: ${lines.length} problem${lines.length === 1 ? '' : 's'}`, text: `${lines.join('\n')}\n\nDetails in the staff app: ${STAFF_APP}` }
  }
  if (!monday) return null
  return {
    subject: 'CLC website weekly check: all OK ✓',
    text: `Everything checked out this week.\n\n• New website requests in the last 7 days: ${stats.leads}\n• Online payments in the last 7 days: ${stats.payments}\n• Last text/email synced: ${stats.lastSync ? when(stats.lastSync) : 'none yet'}\n\nIf this email ever stops coming on Mondays, the alerts themselves aren't working: check the staff app.`,
  }
}
