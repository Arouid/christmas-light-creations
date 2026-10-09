import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hitStrand, length, sampleAlong } from '../src/designer/geometry.js'
import { newDesign, newStrand, normalize, pxPerFoot } from '../src/designer/model.js'
import { bulbColor, designStats, scaleFrom } from '../src/designer/stats.js'

test('bulbs are spaced evenly along a bent line, across corners', () => {
  const pts = [[0, 0], [10, 0], [10, 10]]
  assert.equal(length(pts), 20)
  const s = sampleAlong(pts, 5)
  assert.deepEqual(s.map((p) => [p.x, p.y]), [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]])
  assert.deepEqual(sampleAlong([[0, 0], [7, 0], [7, 7]], 5).map((p) => [p.x, p.y]), [[0, 0], [5, 0], [7, 3]])
})

test('color patterns repeat in groups (2x2 candy cane)', () => {
  const s = { ...newStrand('c9', ['red', 'cool']), groupSize: 2 }
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => bulbColor(s, i)), ['red', 'red', 'cool', 'cool', 'red'])
})

test('measuring sets feet; stats add up feet, bulbs, colors and price', () => {
  const d = newDesign({ width: 1200, height: 800 })
  assert.equal(pxPerFoot(d), 20, 'unmeasured: assume ~60 ft across the photo')
  d.scale = scaleFrom([0, 0], [160, 0], 16) // garage door = 16 ft -> 10 px/ft
  d.pricePerFoot = 5
  d.strands.push({ ...newStrand('c9', ['red', 'green']), points: [[0, 0], [300, 0], [300, 100]] }) // 40 ft
  const st = designStats(d)
  assert.equal(st.measured, true)
  assert.equal(Math.round(st.feet), 40)
  assert.equal(st.bulbs, 41, '12" spacing over 40 ft, both ends')
  assert.deepEqual(st.byColor.map((c) => [c.key, c.n]), [['red', 21], ['green', 20]])
  assert.equal(st.price, 200)
})

test('tapping near a strand selects it (handle first, then the line)', () => {
  const strands = [{ id: 'a', points: [[0, 0], [100, 0]] }, { id: 'b', points: [[0, 50], [100, 50]] }]
  assert.deepEqual(hitStrand(strands, [98, 3], 8), { id: 'a', pointIndex: 1, d: Math.hypot(2, 3) })
  assert.equal(hitStrand(strands, [50, 46], 8).id, 'b')
  assert.equal(hitStrand(strands, [50, 25], 8), null)
})

test('old or partial designs are filled in', () => {
  const d = normalize({ photo: { width: 10, height: 10 }, strands: [{ id: 's1', points: [[0, 0], [1, 1]] }] })
  assert.equal(d.strands[0].style, 'c9')
  assert.equal(d.strands[0].spacingIn, 12)
  assert.deepEqual(d.decorations, [])
})

test('broken points are dropped when a design is loaded', () => {
  const d = normalize({ photo: { width: 10, height: 10 }, strands: [{ id: 's', points: [[null, null], [1, 2], [NaN, 3], [4, 5]] }] })
  assert.deepEqual(d.strands[0].points, [[1, 2], [4, 5]])
})

import { boxFrom, shapePoints } from '../src/designer/geometry.js'

test('rectangles and ovals: closed outlines with no doubled bulb', () => {
  const rect = { type: 'rect', x: 0, y: 0, w: 40, h: 20 }
  const pts = shapePoints(rect)
  assert.equal(length(pts), 120)
  const bulbs = sampleAlong(pts, 10, true)
  assert.equal(bulbs.length, 12, 'perimeter 120 at 10 apart: 12 bulbs, not 13')
  const oval = shapePoints({ type: 'oval', x: 0, y: 0, w: 100, h: 100 })
  assert.ok(Math.abs(length(oval) - Math.PI * 100) < 1, 'circle outline ≈ π·d')
  assert.deepEqual(oval[0].map(Math.round), [50, 0], 'starts at the top')
})

test('boxes from a drag in any direction; locked = square', () => {
  assert.deepEqual(boxFrom([50, 50], [10, 30]), { x: 10, y: 30, w: 40, h: 20 })
  assert.deepEqual(boxFrom([0, 0], [40, -10], true), { x: 0, y: -40, w: 40, h: 40 })
})

test('shape strands: feet from the outline, bulbs without the closing duplicate', () => {
  const d = newDesign({ width: 1200, height: 800 })
  d.scale = { pxPerFt: 10 }
  const shape = { type: 'rect', x: 0, y: 0, w: 40, h: 20 } // 12 ft around
  d.strands.push({ ...newStrand('c9'), shape, points: shapePoints(shape) })
  const st = designStats(d)
  assert.equal(Math.round(st.feet), 12)
  assert.equal(st.bulbs, 12)
  assert.equal(normalize(d).strands[0].points.length, 5, 'outline rebuilt from the box on load')
})
