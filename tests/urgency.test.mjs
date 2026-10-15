import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bookLine, bookingSeason, freshStatus, statusSentence, topBar } from '../src/lib/urgency.js'

const d = (s) => new Date(`${s}T12:00:00`)

test('the season being booked rolls over after Dec 15', () => {
  assert.equal(bookingSeason(d('2026-08-20')), 2026)
  assert.equal(bookingSeason(d('2026-12-15')), 2026)
  assert.equal(bookingSeason(d('2026-12-20')), 2027)
  assert.equal(bookingSeason(d('2027-03-01')), 2027)
})

test('the staff line ends in exactly one stop (design review: “booked!.”)', () => {
  assert.equal(statusSentence('October is 80% booked!'), 'October is 80% booked!')
  assert.equal(statusSentence('Only weekends left in November'), 'Only weekends left in November.')
  assert.equal(statusSentence('Full until Nov 3.'), 'Full until Nov 3.')
  assert.equal(statusSentence('Any dates left?'), 'Any dates left?')
  assert.equal(statusSentence('  Almost full…  '), 'Almost full…')
  assert.equal(statusSentence(''), '')
  assert.equal(statusSentence(undefined), '')
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

test('the bar above the header follows the calendar (owner 2026-10-12)', () => {
  assert.deepEqual(topBar(d('2026-10-12')), { text: 'Install by Oct 31 and save 10% · Lifetime warranty on every light', href: '#warranty' })
  assert.deepEqual(topBar(d('2026-10-20')), { text: '12 days left to save 10% on an early install · Pay in 3 at the same price', href: '#estimate' })
  assert.equal(topBar(d('2026-10-31')).text, 'Last day: the 10% early-install discount ends tonight')
  assert.deepEqual(topBar(d('2026-11-20')), { text: 'Installing now · Pay in 3 at the same price · Lifetime warranty', href: '#options' })
  assert.equal(topBar(d('2026-12-20')).text, 'Takedowns Jan 3–13 · Booking the 2027 season now')
  assert.equal(topBar(d('2027-01-10')).text, 'Takedowns Jan 3–13 · Booking the 2027 season now')
  assert.equal(topBar(d('2027-03-10')).text, 'Booking the 2027 season · Buy, lease or pay in 3 · Lifetime warranty')
  for (const day of ['2026-08-01', '2026-10-15', '2026-12-01', '2027-02-01']) assert.ok(topBar(d(day)).text.length < 90, 'one line on a phone')
})
