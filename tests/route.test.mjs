import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installsOn, routeSheet } from '../src/lib/route.js'

const c = (id, plannedDate, extra = {}) => ({ id, fullName: `Name ${id}`, address: `${id} Main St, Pearland, TX`, phone: '281-555-0101', seasons: { 2026: { plannedDate, ...extra } } })

test('finds installs planned for the day, in any date style', () => {
  const list = [c('a', 'Oct 15'), c('b', '10/15'), c('c', 'October 15'), c('d', 'Oct 16'), c('e', '')]
  assert.deepEqual(installsOn(list, '2026', '2026-10-15').map((x) => x.id), ['a', 'b', 'c'])
})

test('route sheet: live stops with arrival times, app link and maps link', () => {
  const route = { day: '2026-10-15', name: 'Crew 1', startTime: '08:00' }
  const rows = [
    { name: 'Pat', address: '1 A St', phone: '555', gate: '#12', minutes: 135, eta: 490, notes: 'dog', status: 'todo' },
    { name: 'Skip Me', address: '2 B St', minutes: 25, eta: null, status: 'skipped' },
  ]
  const clock = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
  const msg = routeSheet({ route, rows, homeAt: 700, links: [{ from: 1, to: 1, url: 'https://maps/x' }], appUrl: 'https://app/#route-r1', clock })
  assert.match(msg, /^Route Thu, Oct 15 \(Crew 1\): 1 stop, leave 8:00, back ≈ 11:40/)
  assert.match(msg, /Open in the CLC app.*https:\/\/app\/#route-r1/)
  assert.match(msg, /1\. Pat · ≈ 8:10\n {3}1 A St\n {3}📞 555 · Gate #12 · 135 min\n {3}Notes: dog/)
  assert.doesNotMatch(msg, /Skip Me/)
})
