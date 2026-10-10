import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bookedByDay, bookingSeason, capacity, monthDay, openDays } from '../functions/availability.js'

test('planned dates in any style the team types', () => {
  assert.equal(monthDay('Oct 16'), '10-16')
  assert.equal(monthDay('October 16th'), '10-16')
  assert.equal(monthDay('10/16/2026'), '10-16')
  assert.equal(monthDay('next week'), null)
  assert.equal(bookingSeason('2026-10-09'), 2026)
  assert.equal(bookingSeason('2026-12-20'), 2027)
})

test('booked installs per day: Season dates + route install stops, each customer once', () => {
  const customers = [
    { id: 'a', seasons: { 2026: { plannedDate: 'Oct 16' } } },
    { id: 'b', seasons: { 2026: { plannedDate: '10/16' } } },
    { id: 'c', seasons: { 2025: { plannedDate: 'Oct 16' } } }, // last season: ignored
  ]
  const routes = [{ id: 'r1', day: '2026-10-16', stops: [{ customerId: 'a', kind: 'install' }, { customerId: 'd', kind: 'install' }, { customerId: 'e', kind: 'takedown' }] }]
  const booked = bookedByDay({ customers, routes, season: 2026 })
  assert.equal(booked.get('2026-10-16'), 3) // a (both places), b, d
})

test('capacity: normal days, Sundays off, helper days and closed days', () => {
  const s = { perDay: 2, workDays: [1, 2, 3, 4, 5, 6], overrides: { '2026-10-17': 6, '2026-10-20': 0 } }
  assert.equal(capacity('2026-10-16', s), 2) // Friday
  assert.equal(capacity('2026-10-18', s), 0) // Sunday
  assert.equal(capacity('2026-10-17', s), 6) // helper day
  assert.equal(capacity('2026-10-20', s), 0) // rain / day off
})

test('open days: from tomorrow, inside the season, skipping full and closed days', () => {
  const settings = { perDay: 2, overrides: { '2026-10-20': 0 }, show: 3 }
  const booked = new Map([['2026-10-15', 2], ['2026-10-16', 1]])
  // Before the season: starts Oct 15 (full), Oct 16 has room, 17 Sat, 18 Sun closed, 19 Mon.
  assert.deepEqual(openDays({ today: '2026-10-09', booked, settings }), ['2026-10-16', '2026-10-17', '2026-10-19'])
  // Never today; the season ends Dec 15.
  assert.deepEqual(openDays({ today: '2026-12-14', booked, settings }), ['2026-12-15'])
  // After the season: next year's first dates.
  assert.deepEqual(openDays({ today: '2026-12-20', booked: new Map(), settings: { show: 1 } }), ['2027-10-15'])
  // Fully booked: nothing to show (the page then says to call).
  const full = new Map(Array.from({ length: 70 }, (_, i) => { const d = new Date(Date.UTC(2026, 9, 15 + i)); return [d.toISOString().slice(0, 10), 99] }))
  assert.deepEqual(openDays({ today: '2026-10-09', booked: full, settings }), [])
})
