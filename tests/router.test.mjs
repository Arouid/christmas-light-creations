import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carryOver, clock, estimateMatrix, optimizeLoop, schedule, stopFromCustomer } from '../src/lib/router.js'

// Home in the middle, 30 stops on a ring: the best loop walks around the ring.
const home = { lat: 29.55, lng: -95.30 }
const ring = Array.from({ length: 30 }, (_, i) => {
  const a = (i * 7 % 30) / 30 * 2 * Math.PI // shuffled around the ring
  return { lat: home.lat + 0.05 * Math.sin(a), lng: home.lng + 0.05 * Math.cos(a), k: i * 7 % 30 }
})

test('30 stops: loop goes around the ring, not back and forth', () => {
  const m = estimateMatrix([home, ...ring])
  const order = optimizeLoop(m.minutes)
  assert.equal(order.length, 30)
  assert.equal(new Set(order).size, 30)
  const ks = order.map((i) => ring[i - 1].k)
  // Neighbours on the route are neighbours on the ring (allowing the wrap).
  const jumps = ks.slice(1).filter((k, i) => Math.min(Math.abs(k - ks[i]), 30 - Math.abs(k - ks[i])) > 1).length
  assert.equal(jumps, 0, `route: ${ks.join(',')}`)
})

test('fixed first stops stay first', () => {
  const m = estimateMatrix([home, ...ring.slice(0, 8)])
  assert.deepEqual(optimizeLoop(m.minutes, [5]).slice(0, 1), [5])
})

test('schedule gives arrival times, skips skipped stops, returns home', () => {
  const matrix = { minutes: [[0, 10, 20], [10, 0, 15], [20, 15, 0]], miles: [[0, 5, 10], [5, 0, 7], [10, 7, 0]] }
  const s = schedule([{ at: 1, minutes: 60 }, { at: 2, minutes: 45 }], matrix, '08:00')
  assert.deepEqual(s.rows.map((r) => clock(r.eta)), ['8:10 AM', '9:25 AM'])
  assert.equal(clock(s.homeAt), '10:30 AM')
  assert.equal(s.miles, 22)
  const skipped = schedule([{ at: 1, minutes: 60, status: 'skipped' }, { at: 2, minutes: 45 }], matrix, '08:00')
  assert.equal(skipped.rows[0].eta, null)
  assert.equal(clock(skipped.rows[1].eta), '8:20 AM')
})

test('carry-over lists skipped stops not yet moved', () => {
  const routes = [{ id: 'r1', day: '2026-10-15', stops: [{ id: 'a', status: 'skipped' }, { id: 'b', status: 'done' }, { id: 'c', status: 'skipped', carriedTo: 'r2' }] }]
  assert.deepEqual(carryOver(routes).map((s) => [s.id, s.fromDay]), [['a', '2026-10-15']])
})

test('stops from customer cards carry contact, gate and default time', () => {
  const s = stopFromCustomer({ id: 'pat', fullName: 'Pat', address: '1 A St', phone: '555', geo: { lat: 1, lng: 2 }, gateCode: '' }, 'takedown', '#99')
  assert.equal(s.customerId, 'pat')
  assert.equal(s.gate, '#99')
  assert.equal(s.minutes, 25)
  assert.equal(s.status, 'todo')
})

import { timeline, withLegs } from '../src/lib/router.js'

test('stored legs give arrival times; skipped stops take no time on site', () => {
  const matrix = { minutes: [[0, 10, 20], [10, 0, 15], [20, 15, 0]], miles: [[0, 5, 10], [5, 0, 7], [10, 7, 0]] }
  const { stops, backMin } = withLegs([{ id: 'a', minutes: 135 }, { id: 'b', minutes: 25 }], matrix)
  assert.deepEqual(stops.map((s) => s.driveMin), [10, 15])
  assert.equal(backMin, 20)
  const t = timeline(stops, '08:00', backMin)
  assert.deepEqual(t.rows.map((r) => clock(r.eta)), ['8:10 AM', '10:40 AM'])
  assert.equal(clock(t.homeAt), '11:25 AM')
  const skip = timeline([{ ...stops[0], status: 'skipped' }, stops[1]], '08:00', backMin)
  assert.equal(clock(skip.rows[1].eta), '8:25 AM')
})
