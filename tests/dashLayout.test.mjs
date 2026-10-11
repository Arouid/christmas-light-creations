import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LAYOUT, PANELS, asList, normalize, nudge, placeBefore, readLayout } from '../src/lib/dashLayout.js'

const all = PANELS.map(([k]) => k)

test('stored layouts: junk falls back, unknown keys drop, new panels land at the end of the right column', () => {
  assert.deepEqual(readLayout(null), DEFAULT_LAYOUT)
  assert.deepEqual(readLayout('nope'), DEFAULT_LAYOUT)
  const r = readLayout(JSON.stringify({ left: ['who', 'bogus', 'who'], right: ['season'] }))
  assert.deepEqual(r.left, ['who'])
  assert.equal(r.right[0], 'season')
  assert.deepEqual([...asList(r)].sort(), [...all].sort())
})

test('drag: place before another panel, or at the end of a column', () => {
  const r = placeBefore(DEFAULT_LAYOUT, 'status', 'left', 'activity')
  assert.deepEqual(r.left, ['season', 'status', 'activity'])
  assert.ok(!r.right.includes('status'))
  const end = placeBefore(DEFAULT_LAYOUT, 'season', 'right', null)
  assert.deepEqual(end.left, ['activity'])
  assert.equal(end.right.at(-1), 'season')
  assert.equal(placeBefore(DEFAULT_LAYOUT, 'season', 'left', 'season'), DEFAULT_LAYOUT)
})

test('arrows: up/down inside the column, left/right across; no move at the edges', () => {
  assert.deepEqual(nudge(DEFAULT_LAYOUT, 'activity', 'up').left, ['activity', 'season'])
  assert.equal(nudge(DEFAULT_LAYOUT, 'season', 'up'), DEFAULT_LAYOUT)
  assert.deepEqual(nudge(DEFAULT_LAYOUT, 'who', 'down').right.slice(0, 2), ['scheduled', 'who'])
  const across = nudge(DEFAULT_LAYOUT, 'signins', 'left') // row 3 of the right column -> end of the left one
  assert.deepEqual(across.left, ['season', 'activity', 'signins'])
  assert.equal(nudge(DEFAULT_LAYOUT, 'season', 'left'), DEFAULT_LAYOUT)
  assert.deepEqual(normalize(nudge(DEFAULT_LAYOUT, 'season', 'right')).right[0], 'season')
})
