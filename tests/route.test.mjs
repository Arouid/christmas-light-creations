import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installsOn, routeMessage } from '../src/lib/route.js'

const c = (id, plannedDate, extra = {}) => ({ id, fullName: `Name ${id}`, address: `${id} Main St, Pearland, TX`, phone: '281-555-0101', seasons: { 2026: { plannedDate, ...extra } } })

test('finds installs planned for the day, in any date style', () => {
  const list = [c('a', 'Oct 15'), c('b', '10/15'), c('c', 'October 15'), c('d', 'Oct 16'), c('e', '')]
  assert.deepEqual(installsOn(list, '2026', '2026-10-15').map((x) => x.id), ['a', 'b', 'c'])
})

test('installer message lists stops with what they need and the map links', () => {
  const stops = [{ customer: c('a', 'Oct 15', { timeframe: '9-11am', addOn: 'Add 2 trees' }), gate: '#1234' }, { customer: c('b', 'Oct 15') }]
  const msg = routeMessage({ day: '2026-10-15', stops, links: [{ from: 1, to: 2, url: 'https://maps.example/x' }], totalMiles: 18.4, season: '2026', homeAddress: 'Shop, Pearland' })
  assert.match(msg, /^Install route, Thu, Oct 15: 2 stops, about 18 mi/)
  assert.match(msg, /1\. Name a\n {3}a Main St, Pearland, TX\n {3}📞 281-555-0101 · Gate #1234 · ⏰ 9-11am\n {3}Notes: Add 2 trees/)
  assert.match(msg, /2\. Name b/)
  assert.match(msg, /starts and ends at the shop\):\nhttps:\/\/maps\.example\/x/)
})
