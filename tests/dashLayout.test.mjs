import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LAYOUT, PANELS, bands, cycleSize, isWide, nudge, placeBefore, readLayout, sizeOf, toggleWide } from '../src/lib/dashLayout.js'

const all = PANELS.map(([k]) => k)

test('stored layouts: junk falls back, unknown keys drop, new panels land at the end, older shapes still read', () => {
  assert.deepEqual(readLayout(null), DEFAULT_LAYOUT)
  assert.deepEqual(readLayout('nope'), DEFAULT_LAYOUT)
  const r = readLayout(JSON.stringify({ order: ['who', 'bogus', 'who'], size: { bogus: 'wide', who: 'two', season: 'nope' } }))
  assert.equal(r.order[0], 'who')
  assert.deepEqual([...r.order].sort(), [...all].sort())
  assert.deepEqual(r.size, { who: 'two' })
  assert.deepEqual(readLayout(JSON.stringify({ left: ['activity', 'season'], right: ['status'] })).order.slice(0, 3), ['activity', 'season', 'status'])
  assert.deepEqual(readLayout(JSON.stringify({ order: ['who'], wide: ['who'] })).size, { who: 'wide' })
})

test('sizes: the button cycles Half → 2/3 → 1/3 → Wide → Half; toggleWide still works', () => {
  let l = { order: ['who'], size: {} }
  assert.equal(sizeOf(l, 'who'), 'half')
  l = cycleSize(l, 'who'); assert.equal(sizeOf(l, 'who'), 'two')
  l = cycleSize(l, 'who'); assert.equal(sizeOf(l, 'who'), 'one')
  l = cycleSize(l, 'who'); assert.equal(sizeOf(l, 'who'), 'wide'); assert.ok(isWide(l, 'who'))
  l = cycleSize(l, 'who'); assert.equal(sizeOf(l, 'who'), 'half'); assert.deepEqual(l.size, {})
  assert.ok(isWide(toggleWide(l, 'who'), 'who'))
})

test('drag and arrows reorder', () => {
  assert.deepEqual(placeBefore(DEFAULT_LAYOUT, 'status', 'season').order.slice(0, 2), ['status', 'season'])
  assert.equal(placeBefore(DEFAULT_LAYOUT, 'season', null).order.at(-1), 'season')
  assert.deepEqual(nudge(DEFAULT_LAYOUT, 'who', 'up').order.slice(0, 2), ['who', 'season'])
  assert.equal(nudge(DEFAULT_LAYOUT, 'season', 'up'), DEFAULT_LAYOUT)
})

test('bands: widths fill a row of six units (1/3+1/3+1/3, 2/3+1/3, 1/3+2/3); wide takes a row; no heights = one panel per cell', () => {
  const rows = bands({ order: ['season', 'who', 'activity', 'scheduled', 'signins', 'routes', 'status', 'spent', 'ads'],
    size: { activity: 'wide', scheduled: 'two', signins: 'one', routes: 'one', status: 'one', spent: 'one', ads: 'two' } })
  assert.deepEqual(rows.map((r) => r.cells.map((c) => `${c.units}:${c.keys.join('+')}`)), [
    ['3:season', '3:who'],
    ['6:activity'],
    ['4:scheduled', '2:signins'],
    ['2:routes', '2:status', '2:spent'],
    ['4:ads'],
  ])
})

test('bands with heights: same-width panels stack beside a tall lead panel, then a new row starts level', () => {
  const heights = { activity: 650, status: 270, season: 240, scheduled: 120, who: 160, spent: 320 }
  const rows = bands({ order: ['activity', 'status', 'season', 'scheduled', 'who', 'spent'], size: {} }, heights)
  assert.deepEqual(rows.map((r) => r.cells.map((c) => c.keys.join('+'))), [['activity', 'status+season+scheduled'], ['who', 'spent']])
  // A 2/3 lead with two 1/3 panels stacked beside it.
  const thirds = bands({ order: ['activity', 'who', 'scheduled'], size: { activity: 'two', who: 'one', scheduled: 'one' } }, heights)
  assert.deepEqual(thirds.map((r) => r.cells.map((c) => `${c.units}:${c.keys.join('+')}`)), [['4:activity', '2:who+scheduled']])
})
