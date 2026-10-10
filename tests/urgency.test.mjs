import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bookLine, bookingSeason, freshStatus, seasonBadge } from '../src/lib/urgency.js'

const d = (s) => new Date(`${s}T12:00:00`)

test('hero badge follows the real calendar', () => {
  assert.equal(seasonBadge(d('2026-08-20')), 'Booking now · Early install discount through Oct 31')
  assert.equal(seasonBadge(d('2026-10-14')), 'Booking now · Early install discount through Oct 31')
  assert.equal(seasonBadge(d('2026-10-15')), 'Early install discount: 17 days left')
  assert.equal(seasonBadge(d('2026-10-30')), 'Early install discount: 2 days left')
  assert.equal(seasonBadge(d('2026-10-31')), 'Early install discount ends today')
  assert.equal(seasonBadge(d('2026-11-01')), 'Booking now for the 2026 season')
  assert.equal(seasonBadge(d('2026-12-15')), 'Booking now for the 2026 season')
  assert.equal(seasonBadge(d('2026-12-16')), 'Booking for the 2027 season')
  assert.equal(seasonBadge(d('2027-03-01')), 'Booking for the 2027 season')
  assert.equal(bookingSeason(d('2026-12-20')), 2027)
})

test('book-early line: October first, then fast, then next season', () => {
  assert.equal(bookLine(d('2026-09-01')), 'October dates fill first. Request yours today.')
  assert.equal(bookLine(d('2026-10-31')), 'October dates fill first. Request yours today.')
  assert.equal(bookLine(d('2026-11-10')), 'Dates fill fast this time of year. Request yours today.')
  assert.equal(bookLine(d('2027-01-10')), 'Get on the list early for next season.')
})

test('staff "how booked" line shows only when updated in the last 14 days', () => {
  const now = Date.parse('2026-10-20T12:00:00Z')
  assert.equal(freshStatus({ text: 'October is 80% booked', updatedAt: '2026-10-15T12:00:00Z' }, now), 'October is 80% booked')
  assert.equal(freshStatus({ text: 'October is 80% booked', updatedAt: '2026-09-30T12:00:00Z' }, now), '')
  assert.equal(freshStatus({ text: '  ', updatedAt: '2026-10-19T12:00:00Z' }, now), '')
  assert.equal(freshStatus({}, now), '')
})
