import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COLOR_KEYS, DECORATION_KEYS, KEEP_DAYS, STYLE_KEYS, cleanDesign, cutoff, expired, jpegBytes } from '../functions/leadDesigns.js'
import { COLORS, DECORATIONS, STYLES } from '../src/designer/model.js'

const good = {
  version: 1, name: 'My home', photo: { width: 1280, height: 853 }, scale: { pxPerFt: 30 }, night: 0.6, pricePerFoot: 9,
  strands: [
    { id: 's1', style: 'c9', colors: ['warm'], groupSize: 1, spacingIn: 12, size: 1, points: [[10, 20], [300, 20]], extra: 'x' },
    { id: 's2', style: 'mini', colors: ['red', 'cool'], groupSize: 2, spacingIn: 4, size: 1.2, closed: true, points: [[1, 1], [50, 1], [50, 50], [1, 50]], gaps: [[0.1, 0.2]] },
    { id: 's3', style: 'c7', colors: ['blue'], groupSize: 1, spacingIn: 12, size: 1, shape: { type: 'oval', x: 100, y: 100, w: 60, h: 60, lock: true }, points: [[100, 100], [160, 160]] },
  ],
  decorations: [{ id: 'd1', type: 'wreath', x: 600, y: 540, size: 1, rotation: 5, onclick: 'alert(1)' }],
  hacker: '<script>',
}

test('the designer’s own lists match what the server accepts', () => {
  assert.deepEqual([...STYLE_KEYS].sort(), Object.keys(STYLES).sort())
  assert.deepEqual([...COLOR_KEYS].sort(), Object.keys(COLORS).sort())
  assert.deepEqual([...DECORATION_KEYS].sort(), Object.keys(DECORATIONS).sort())
})

test('a real design comes back with known fields only; scale and price always empty', () => {
  const d = JSON.parse(cleanDesign(JSON.stringify(good)))
  assert.deepEqual(Object.keys(d).sort(), ['decorations', 'name', 'night', 'photo', 'pricePerFoot', 'scale', 'strands', 'version'])
  assert.equal(d.scale, null)
  assert.equal(d.pricePerFoot, null)
  assert.equal(d.strands.length, 3)
  assert.equal('extra' in d.strands[0], false)
  assert.deepEqual(d.strands[1].gaps, [[0.1, 0.2]])
  assert.equal(d.strands[1].closed, true)
  assert.deepEqual(d.strands[2].shape, { type: 'oval', x: 100, y: 100, w: 60, h: 60, lock: true })
  assert.deepEqual(d.decorations, [{ id: 'd1', type: 'wreath', x: 600, y: 540, size: 1, rotation: 5 }])
})

test('nonsense is refused or dropped, numbers are clamped to sane ranges', () => {
  assert.equal(cleanDesign('not json'), null)
  assert.equal(cleanDesign('[]'), null)
  assert.equal(cleanDesign(JSON.stringify({ ...good, photo: { width: 99999, height: 800 } })), null)
  assert.equal(cleanDesign(JSON.stringify({ ...good, photo: { width: 'x', height: 800 } })), null)
  const d = JSON.parse(cleanDesign(JSON.stringify({
    ...good, name: '<b>Hi</b>\u0000 there', night: 7,
    strands: [
      { style: 'laser', points: [[1, 1], [2, 2]] }, // unknown style
      { style: 'c9', points: [[1, 1]] }, // one point
      { style: 'c9', points: [[1, 1], [1e9, 2]] }, // way off the photo
      { style: 'c9', colors: ['red', 'neon'], spacingIn: 0.01, groupSize: 99, size: 50, points: [[1, 1], [2, 2]] },
      ...Array.from({ length: 200 }, () => ({ style: 'c9', points: [[1, 1], [2, 2]] })),
    ],
    decorations: [{ type: 'skull', x: 1, y: 1 }, { type: 'star', x: 'a', y: 1 }, { type: 'bow', x: 5, y: 5, size: 99 }],
  })))
  assert.equal(d.name, 'bHi/b there')
  assert.equal(d.night, 0.75)
  assert.equal(d.strands.length, 147) // 150 looked at, the first 3 refused
  assert.deepEqual({ ...d.strands[0], id: 'x' }, { id: 'x', style: 'c9', colors: ['red'], groupSize: 1, spacingIn: 12, size: 1, points: [[1, 1], [2, 2]] })
  assert.deepEqual(d.decorations.map((x) => [x.type, x.size]), [['bow', 1]])
})

test('pictures: only a JPEG data URL turns into bytes', () => {
  assert.deepEqual([...jpegBytes('data:image/jpeg;base64,/9j/')], [0xff, 0xd8, 0xff])
  assert.equal(jpegBytes('data:image/png;base64,AAAA'), null)
  assert.equal(jpegBytes('sample'), null)
  assert.equal(jpegBytes(undefined), null)
})

test('uploads are deleted 30 days after they arrive', () => {
  const now = Date.parse('2026-11-10T12:00:00Z')
  const DAY = 86400000
  assert.equal(KEEP_DAYS, 30)
  assert.equal(expired(now - 29 * DAY, now), false)
  assert.equal(expired(now - 30 * DAY, now), true)
  assert.equal(expired(NaN, now), false)
  assert.equal(cutoff(now).toISOString(), '2026-10-11T12:00:00.000Z')
})
