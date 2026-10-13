// "Yes, put my lights back up" (owner 2026-10-13: returning customers had to
// call or text to come back). One tap on /account/ marks this season
// Confirmed, keeps the week they'd like and a note, tells staff (push + the
// alert email) and shows in Recent activity. The rebookMe callable in
// functions/index.js does the writes; this file is pure and tested.
export const WEEKS = ['Mid-October', 'Late October', 'First week of November', 'Mid-November', 'Late November', 'Whenever works']
export const NOTE_MAX = 300
export const CONFIRMED = 'Confirmed - Needs to be Scheduled'
// Statuses that mean "already on this season's list": the tap changes nothing.
export const ON_THE_LIST = [CONFIRMED, 'Install Scheduled', 'Install Completed']

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Browser request -> { week, note } or { error: [code, message] }.
export function rebookRequest(data) {
  const week = clean(data?.week, 40)
  if (week && !WEEKS.includes(week)) return { error: ['invalid-argument', 'Pick a week from the list'] }
  if (data?.note != null && typeof data.note !== 'string') return { error: ['invalid-argument', 'The note must be text'] }
  const note = clean(data?.note, NOTE_MAX)
  return { week, note }
}

// The season entry as it is -> what to write, or { already: status } when the
// customer is already on the list (or we have marked them off it).
export function rebookPatch(seasonEntry, req, now = new Date()) {
  const st = String(seasonEntry?.installStatus ?? '')
  if (ON_THE_LIST.includes(st)) return { already: st }
  if (st === 'Off Scheduler' || st === 'Not Servicing') return { already: st }
  const patch = { installStatus: CONFIRMED, firstContact: 'Confirmed', rebookedAt: now.toISOString() }
  if (req.week) patch.timeframe = req.week
  if (req.note) patch.customerNote = req.note
  return { patch }
}

// What staff hear about it.
export const describeRebook = (req) => [req.week && `wants ${req.week.toLowerCase()}`, req.note && `“${req.note}”`].filter(Boolean).join(' · ') || 'no preference given'

export function rebookPush(customer, customerId, req) {
  const name = customer?.fullName || 'A customer'
  return { title: `${name} wants their lights back up`, body: describeRebook(req).slice(0, 120), link: `#accounts/customer/${encodeURIComponent(customerId)}`, tag: `rebook:${customerId}` }
}

export function rebookEmail(customer, customerId, req, season) {
  const name = customer?.fullName || 'A customer'
  return {
    subject: `Re-install: ${name} said yes for ${season}`,
    text: `${name} tapped "Yes, put my lights back up" on their account page.

${customer?.address ? `${customer.address}\n` : ''}Preferred week: ${req.week || 'no preference'}
${req.note ? `Note: ${req.note}\n` : ''}
Their ${season} season is now "${CONFIRMED}". Schedule them from Season → Installs (or ✨ Plan with Claude):
https://christmas-light-creations.com/leads/#accounts/customer/${encodeURIComponent(customerId)}`,
  }
}
