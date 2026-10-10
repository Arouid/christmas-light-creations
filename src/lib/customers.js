// Customer records and season vocabulary. Status words match the team's
// Google Sheet so nobody has to relearn them.

export const INSTALL_STATUSES = [
  '', 'Not Confirmed', 'Confirmed - Needs to be Scheduled', 'Install Scheduled',
  'Install Completed', 'Off Scheduler', 'Not Servicing',
]
export const TAKEDOWN_STATUSES = ['', 'Takedown Scheduled', 'Takedown Completed', 'No Takedown']
export const FIRST_CONTACT = ['', 'Confirmed', 'Undecided', 'Declined']
export const INSTALL_TYPES = ['', 'Early Install', 'Regular Install']
export const INVOICE_STATUSES = [
  '', 'Not Yet Invoiced', 'PP Invoice Sent', 'PayPal Invoice Sent', 'CLC Payment Confirmation Sent',
  'Needs CLC Payment Confirmation', 'Alt. Process', 'No Takedown Cost',
]
export const PAID = ['', 'Yes', 'No', 'No Takedown Cost']
export const PAYMENT_TYPES = ['', 'PayPal', 'Square', 'Zelle', 'Check', 'Venmo', 'Cash', 'CashApp']

export const BLANK_LABEL = {
  installStatus: 'Not contacted',
  takedownStatus: 'Not scheduled',
}

// July–December is that year's season; January–June belongs to the previous
// one (January takedowns finish the previous season).
export function seasonYear(date = new Date()) {
  return String(date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1)
}

// Stable id from the name, so re-importing the sheet updates instead of duplicating.
export function customerId(fullName) {
  return String(fullName).toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'customer'
}

// Keep a value the list doesn't know about (from an import) selectable.
export function withOption(options, value) {
  return value && !options.includes(value) ? [...options, value] : options
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

export function setPath(obj, path, value) {
  const keys = path.split('.')
  const copy = { ...obj }
  let cur = copy
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] ?? {}) }; cur = cur[k] })
  cur[keys.at(-1)] = value
  return copy
}

export const byName = (a, b) =>
  (a.lastName || a.fullName || '').localeCompare(b.lastName || b.fullName || '')
  || (a.fullName || '').localeCompare(b.fullName || '')

export const SERVICE_STATUSES = ['Open', 'Scheduled', 'Done', 'Cancelled']
export const SERVICE_ISSUES = ['Burned-out bulbs', 'Timer', 'Tripped GFCI', 'Unglued bulbs', 'Lights down / damaged', 'Other']

// Local date as YYYY-MM-DD (sorts correctly as text).
export function todayISO(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''))

// A website estimate request becomes a customer record, ready to schedule.
export function leadToCustomer(lead, season) {
  const fullName = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim()
  const cityLine = [lead.city, 'TX', lead.zip].filter(Boolean).join(' ')
  return clean({
    fullName,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: [lead.address, cityLine].filter(Boolean).join(', '),
    city: lead.city,
    since: season,
    leadId: lead.id,
    notes: lead.message ? `Website estimate request (prefers ${lead.contactMethod || 'phone'}): ${lead.message}` : undefined,
    seasons: { [season]: { installStatus: 'Confirmed - Needs to be Scheduled', firstContact: 'Confirmed' } },
  })
}

// Gate code for a customer: their own, else their neighborhood's.
export function gateFor(customer, gateCodes = []) {
  if (customer.gateCode) return { code: customer.gateCode, source: 'customer' }
  const n = customer.neighborhood?.trim().toLowerCase()
  const g = n && gateCodes.find((x) => x.neighborhood?.trim().toLowerCase() === n)
  return g ? { code: [g.code, g.alternative].filter(Boolean).join(' or '), notes: g.notes, source: g.neighborhood } : null
}
