// Columns staff can show on the Customers table (desktop). Which ones are
// picked is per person, in localStorage (readColumns parses what's stored).
import { BLANK_LABEL, gateFor } from './customers.js'
import { installedSummary } from './jobRecord.js'

export const CUSTOMER_COLUMNS = [
  ['name', 'Name'], ['address', 'Address'], ['city', 'City'], ['phone', 'Phone'], ['email', 'Email'],
  ['area', 'Area'], ['neighborhood', 'Neighborhood'], ['gate', 'Gate code'], ['type', 'Type'],
  ['status', 'Install status'], ['week', 'Week of'], ['day', 'Day'], ['date', 'Planned date'],
  ['notes', 'Scheduling notes'], ['installed', 'What’s up'], ['takedown', 'Takedown status'], ['since', 'Since'],
]
export const DEFAULT_CUSTOMER_COLUMNS = ['name', 'address', 'city', 'phone', 'area', 'type', 'status']
export const COLUMNS_KEY = 'clcCustomerColumns'

// Sort/display text for one cell.
export function columnValue(c, key, season, gates = []) {
  const s = c.seasons?.[season] ?? {}
  switch (key) {
    case 'name': return c.lastName ? `${c.lastName} ${c.firstName ?? ''}` : c.fullName
    case 'address': return c.address
    case 'city': return c.city
    case 'phone': return c.phone
    case 'email': return c.email
    case 'area': return c.locationBlock
    case 'neighborhood': return c.neighborhood
    case 'gate': return gateFor(c, gates)?.code
    case 'type': return c.installType?.replace(' Install', '')
    case 'status': return s.installStatus || BLANK_LABEL.installStatus
    case 'week': return s.weekOf
    case 'day': return s.day
    case 'date': return s.plannedDate
    case 'notes': return s.schedulingNotes
    case 'installed': return installedSummary(c)
    case 'takedown': return s.takedownStatus || BLANK_LABEL.takedownStatus
    case 'since': return c.since
    default: return ''
  }
}

// What's stored (a JSON list of keys, or junk) -> the keys to show, in table order.
export function readColumns(stored) {
  let keys = []
  try { keys = JSON.parse(stored ?? '') } catch { /* nothing saved yet */ }
  if (!Array.isArray(keys)) keys = []
  const picked = CUSTOMER_COLUMNS.map(([k]) => k).filter((k) => keys.includes(k))
  return picked.length ? picked : DEFAULT_CUSTOMER_COLUMNS
}
