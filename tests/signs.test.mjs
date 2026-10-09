import { test } from 'node:test'
import assert from 'node:assert/strict'
import { attribute, cornerCode, dailySeries, dropWindow, roiByCorner } from '../src/lib/signs.js'

const at = (s) => new Date(s)
// Two corners about 2.5 miles apart in Pearland.
const broadway = { lat: 29.5560, lng: -95.3880 }
const dixie = { lat: 29.5830, lng: -95.3520 }
const drops = [
  { id: 'd1', code: 'broadway-288', corner: 'Broadway & 288', ...broadway, placedAt: '2026-10-10T09:00:00', cost: 10 },
  { id: 'd2', code: 'dixie-farm-35', corner: 'Dixie Farm & 35', ...dixie, placedAt: '2026-10-10T10:00:00', cost: 10 },
  { id: 'd3', code: 'broadway-288', corner: 'Broadway & 288', ...broadway, placedAt: '2026-10-17T09:00:00', cost: 10 },
]
const home = (p, dLat) => ({ lat: p.lat + dLat, lng: p.lng })

test('corner codes match the QR codes', () => {
  assert.equal(cornerCode('Broadway & 288'), 'broadway-288')
  assert.equal(cornerCode('Dixie Farm and 35'), 'dixie-farm-and-35')
})

test('a drop counts from placing until its life + lag (pulled early ends sooner)', () => {
  const [a, b] = dropWindow(drops[0])
  assert.equal((b - a) / 86400000, 4)
  const [, b2] = dropWindow({ ...drops[0], removedAt: '2026-10-10T18:00:00' })
  assert.equal(new Date(b2).toISOString(), new Date('2026-10-12T18:00:00').toISOString())
})

test('confirmed: QR source credits the latest drop at that corner', () => {
  const c = attribute([{ id: 'l1', createdAt: at('2026-10-18T12:00:00'), source: 'Road sign (Broadway 288)' }], drops)
  assert.deepEqual(c.get('l1'), { level: 'confirmed', corner: 'broadway 288', credits: [{ dropId: 'd3', code: 'broadway-288', weight: 1 }] })
})

test('likely: "Road sign" splits over drops up at the time, nearest first', () => {
  const far = attribute([{ id: 'l2', createdAt: at('2026-10-11T12:00:00'), source: 'Road sign' }], drops)
  assert.equal(far.get('l2').credits.length, 2, 'no home location: split across both active drops')
  const near = attribute([{ id: 'l3', createdAt: at('2026-10-11T12:00:00'), source: 'Road sign', geo: home(dixie, 0.005) }], drops)
  assert.deepEqual(near.get('l3').credits.map((x) => x.dropId), ['d2'], 'lives by Dixie Farm: credited there only')
})

test('nearby: no source, home within the radius while a drop was up; otherwise nothing', () => {
  const c = attribute([
    { id: 'n1', createdAt: at('2026-10-11T12:00:00'), source: '', geo: home(broadway, 0.005) },
    { id: 'n2', createdAt: at('2026-10-30T12:00:00'), source: '', geo: home(broadway, 0.005) },
    { id: 'n3', createdAt: at('2026-10-11T12:00:00'), source: 'Google search', geo: home(broadway, 0.005) },
  ], drops)
  assert.equal(c.get('n1').level, 'nearby')
  assert.equal(c.has('n2'), false, 'after the sign was gone')
  assert.equal(c.has('n3'), false, 'said Google')
})

test('ROI per corner adds drops, cost, credit and booked revenue', () => {
  const leads = [
    { id: 'l1', createdAt: at('2026-10-18T12:00:00'), source: 'Road sign (Broadway 288)', booked: 500 },
    { id: 'l2', createdAt: at('2026-10-11T12:00:00'), source: 'Road sign' },
  ]
  const credit = attribute(leads, drops)
  const rows = roiByCorner(drops, leads, credit, (l) => l?.booked)
  const b = rows.find((r) => r.code === 'broadway-288')
  assert.equal(b.drops, 2)
  assert.equal(b.cost, 20)
  assert.equal(b.confirmed, 1)
  assert.equal(b.likely, 0.5)
  assert.equal(b.revenue, 500)
  assert.equal(b.returnRatio, 25)
  assert.equal(rows[0].code, 'broadway-288', 'best corner first')
})

test('daily series counts sign vs other requests and drops per day', () => {
  const leads = [{ id: 'l1', createdAt: at('2026-10-10T15:00:00'), source: 'Road sign (Broadway 288)' }, { id: 'x', createdAt: at('2026-10-10T16:00:00'), source: 'Google search' }]
  const s = dailySeries(leads, drops, attribute(leads, drops), 3, at('2026-10-11T12:00:00'))
  assert.deepEqual(s.map((d) => d.day), ['2026-10-09', '2026-10-10', '2026-10-11'])
  assert.deepEqual(s[1], { day: '2026-10-10', sign: 1, other: 1, drops: 2 })
})
