import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LAYOUT, PANELS, bands, isWide, normalize, nudge, placeBefore, readLayout, toggleWide } from '../src/lib/dashLayout.js'

const all = PANELS.map(([k]) => k)

test('stored layouts: junk falls back, unknown keys drop, new panels land at the end, old two-column saves still read', () => {
  assert.deepEqual(readLayout(null), DEFAULT_LAYOUT)
  assert.deepEqual(readLayout('nope'), DEFAULT_LAYOUT)
  const r = readLayout(JSON.stringify({ order: ['who', 'bogus', 'who'], wide: ['bogus', 'who'] }))
  assert.equal(r.order[0], 'who')
  assert.deepEqual([...r.order].sort(), [...all].sort())
  assert.deepEqual(r.wide, ['who'])
  const old = readLayout(JSON.stringify({ left: ['activity', 'season'], right: ['status'] }))
  assert.deepEqual(old.order.slice(0, 3), ['activity', 'season', 'status'])
  assert.deepEqual(old.wide, [])
})

test('drag: place before another panel, or at the end', () => {
  const r = placeBefore(DEFAULT_LAYOUT, 'status', 'season')
  assert.deepEqual(r.order.slice(0, 2), ['status', 'season'])
  assert.equal(placeBefore(DEFAULT_LAYOUT, 'season', null).order.at(-1), 'season')
  assert.equal(placeBefore(DEFAULT_LAYOUT, 'season', 'season'), DEFAULT_LAYOUT)
})

test('arrows move one step; wide toggles and survives normalize', () => {
  assert.deepEqual(nudge(DEFAULT_LAYOUT, 'who', 'up').order.slice(0, 2), ['who', 'season'])
  assert.equal(nudge(DEFAULT_LAYOUT, 'season', 'up'), DEFAULT_LAYOUT)
  assert.equal(nudge(DEFAULT_LAYOUT, 'ads', 'down'), DEFAULT_LAYOUT)
  assert.ok(isWide(DEFAULT_LAYOUT, 'activity'))
  const t = toggleWide(DEFAULT_LAYOUT, 'activity')
  assert.ok(!isWide(t, 'activity'))
  assert.ok(isWide(toggleWide(t, 'season'), 'season'))
  assert.deepEqual(normalize(toggleWide(t, 'season')).wide, ['season'])
})

test('bands: half panels pair into two flush columns; a wide panel breaks the flow', () => {
  const b = bands({ order: ['season', 'who', 'activity', 'scheduled', 'signins', 'routes'], wide: ['activity'] })
  assert.deepEqual(b, [
    { type: 'pair', left: ['season'], right: ['who'] },
    { type: 'wide', key: 'activity' },
    { type: 'pair', left: ['scheduled', 'routes'], right: ['signins'] },
  ])
  assert.deepEqual(bands({ order: ['a'], wide: [] }), [{ type: 'pair', left: ['a'], right: [] }])
})
