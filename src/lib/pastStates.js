// Where each old-site person stands, shared by Leads → Old-site requests
// (src/leads/PastRequestsView.jsx) and Reports → Win-back (docs/specs/reports.md),
// so both count by the same rules. Pure.
import { FILED_STATUSES, findCustomer, lastEmailed, pastArea, pastGroup } from './oldEstimates.js'
import { winbackTemplate } from './emailTemplates.js'

// Never contacted again: no text, email or "Email these".
export const DO_NOT_CONTACT = ['customer', 'Not interested', 'Moved / bad info', ...FILED_STATUSES]

// Became a customer, a status staff set, or emailed from the list (any
// template this season). Filed-away statuses win over all.
export function pastState(r, customer, season) {
  if (FILED_STATUSES.includes(r.status)) return r.status
  if (customer) return 'customer'
  if (r.status) return r.status
  return r.seasons?.[season]?.emailsSent ? 'Emailed' : ''
}

export const customerOf = (r, customers = []) => (r.customerId && customers.find((c) => c.id === r.customerId)) || findCustomer(r, customers)

// The win-back's groups, the way its first email splits them (winbackTemplate):
// former customers, requests from the last few seasons, older requests; plus
// "Texted us", who are never emailed.
export const WINBACK_GROUPS = [
  ['comeback', 'Former customers', 'Paid or were invoiced before, not customers now'],
  ['winback', 'Recent requests', 'Asked in the last few seasons, never booked'],
  ['winback-older', 'Older requests', 'Asked longer ago, never booked'],
  ['voice', 'Texted us', 'Only texted or called; texts by hand, never emailed'],
]
const groupKey = (r, season) => (pastGroup(r) === 'voice' ? 'voice' : winbackTemplate(r, season))

// Per group: people; ready to email (To contact, has an email, not outside our
// area: what ✉ Email these would send); emailed this season; interested,
// estimate booked, no thanks; became customers.
export function winbackStats(requests = [], customers = [], season) {
  const blank = () => ({ people: 0, ready: 0, emailed: 0, interested: 0, booked: 0, noThanks: 0, customers: 0 })
  const by = Object.fromEntries(WINBACK_GROUPS.map(([k]) => [k, blank()]))
  const total = blank()
  for (const r of requests) {
    const state = pastState(r, customerOf(r, customers), season)
    const g = by[groupKey(r, season)]
    for (const t of [g, total]) {
      t.people++
      if (state === '' && r.email && pastArea(r) !== 'out') t.ready++
      if (lastEmailed(r, season)) t.emailed++
      if (r.status === 'Interested') t.interested++
      if (r.status === 'Estimate booked') t.booked++
      if (r.status === 'Not interested') t.noThanks++
      if (state === 'customer') t.customers++
    }
  }
  return { by, total }
}
