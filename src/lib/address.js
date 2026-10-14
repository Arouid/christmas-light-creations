// A customer's address as Street, City, State and ZIP (owner 2026-10-14:
// "we need to be able to have their full address in Property, not just street
// and city"). The record keeps one line, `address` ("1138 Rymers Switch Lane,
// Friendswood, TX 77546"), which everything else reads (routes, Map, Street
// View, proposals, the customer's account); the four boxes on the staff card
// are read from that line and write it back whole. `city` stays its own field
// for grouping and is kept equal to the line's city. Pure, tested
// (tests/address.test.mjs).

const ZIP = String.raw`\d{5}(?:-\d{4})?`
// "…, TX 77546", "… Texas 77546", "…, OK 74101" (another state only after a
// comma, so "Oak Ct 77581" isn't read as Connecticut).
const STATE_ZIP = new RegExp(String.raw`(?:,\s*|\s+)(TX|Texas)\.?,?\s+(${ZIP})$|,\s*([A-Z]{2})\.?\s+(${ZIP})$`, 'i')
const ZIP_ONLY = new RegExp(String.raw`(?:,\s*|\s+)(${ZIP})$`)
const STATE_ONLY = /(?:,\s*|\s+)(TX|Texas)\.?$/i
const UNIT = /^(apt|apartment|unit|suite|ste|bldg|lot|#)\b|^#/i

const tidy = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const stateCode = (s) => (/^texas$/i.test(s) ? 'TX' : String(s ?? '').toUpperCase())

// One address line → { street, city, state, zip }, best effort. `cityHint`
// (the record's City) splits a line that has no commas and fills a missing city.
export function splitAddress(line, cityHint = '') {
  let s = tidy(line).replace(/,?\s*(USA|United States)\.?$/i, '').replace(/[\s,]+$/, '')
  const hint = tidy(cityHint)
  let state = ''
  let zip = ''
  let m = s.match(STATE_ZIP)
  if (m) {
    state = stateCode(m[1] ?? m[3])
    zip = m[2] ?? m[4]
  } else if ((m = s.match(ZIP_ONLY))) {
    zip = m[1]
    s = s.slice(0, m.index)
    m = s.match(STATE_ONLY)
    if (m) state = 'TX'
  } else if ((m = s.match(STATE_ONLY))) {
    state = 'TX'
  }
  if (m) s = s.slice(0, m.index)
  s = s.replace(/[\s,]+$/, '')

  const parts = s.split(/\s*,\s*/).filter(Boolean)
  let street = s
  let city = ''
  if (parts.length >= 2 && !UNIT.test(parts.at(-1))) {
    city = parts.at(-1)
    street = parts.slice(0, -1).join(', ')
  } else if (hint && s.toLowerCase() === hint.toLowerCase()) {
    street = '' // only the town is on file
  } else if (hint && s.toLowerCase().endsWith(` ${hint.toLowerCase()}`)) {
    city = hint
    street = s.slice(0, -hint.length).replace(/[\s,]+$/, '')
  }
  return { street, city: city || hint, state, zip }
}

// { street, city, state, zip } → "1138 Rymers Switch Lane, Friendswood, TX 77546".
export function joinAddress({ street = '', city = '', state = '', zip = '' } = {}) {
  const [st, c, z] = [tidy(street), tidy(city), tidy(zip)]
  if (!st && !c && !z) return ''
  return [st, c, [tidy(state), z].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

// The four boxes for a customer record. We only work in Texas, so State
// shows TX until someone types another.
export function addressParts(customer) {
  const p = splitAddress(customer?.address, customer?.city)
  return { ...p, state: p.state || (p.street || p.city ? 'TX' : '') }
}

// Comparing two lines: same words in the same order, commas and case aside.
const plain = (s) => tidy(String(s ?? '').replace(/,/g, ' ')).toLowerCase()
export const sameAddress = (a, b) => plain(a) === plain(b)

// One box changed (key: street | city | state | zip) → the fields to save:
// the whole line, and the City field when it changes.
export function addressEdit(customer, key, value) {
  const parts = { ...addressParts(customer), [key]: tidy(value) }
  if (key === 'state') parts.state = stateCode(parts.state)
  return addressSave(customer, parts)
}

// The parts as one line, plus City if it differs (for "Save full address" too).
export function addressSave(customer, parts = addressParts(customer)) {
  const out = { address: joinAddress(parts) }
  if (tidy(parts.city) !== tidy(customer?.city)) out.city = tidy(parts.city)
  return out
}
