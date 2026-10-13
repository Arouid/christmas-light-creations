import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PALETTE, brandFill, hsl, repaint } from '../src/lib/holidayIcons.js'

test('stock fills land on the brand palette by hue; outlines go navy; odd values are left alone', () => {
  assert.equal(brandFill('#151515'), PALETTE.navy, 'the black outline')
  assert.equal(brandFill('#ee6159'), PALETTE.berry); assert.equal(brandFill('#E4513F'), PALETTE.berry)
  assert.equal(brandFill('#FFDD09'), PALETTE.gold); assert.equal(brandFill('#FD9808'), PALETTE.gold)
  assert.equal(brandFill('#ffc97a'), PALETTE.goldLight, 'a light tint stays light')
  assert.equal(brandFill('#ffffff'), PALETTE.white); assert.equal(brandFill('#d0d0dc'), PALETTE.white); assert.equal(brandFill('#c1c1c0'), PALETTE.white)
  assert.equal(brandFill('#90C660'), PALETTE.pine); assert.equal(brandFill('#84BD5A'), PALETTE.pine)
  assert.equal(brandFill('#54C9FD'), PALETTE.goldLight, 'blue would read cold on navy')
  assert.equal(brandFill('none'), null); assert.equal(brandFill('url(#g)'), null)
  assert.deepEqual(Object.keys(hsl([1, 0, 0])), ['h', 's', 'l'])
})

test('repaint rewrites attribute and style fills and drops the upload comment', () => {
  const svg = '<!-- Uploaded to: SVG Repo, www.svgrepo.com -->\n<svg><path fill="#151515"/><path style="fill:#E4513F;stroke:none"/><path fill="none"/><circle stroke="#ffffff"/></svg>'
  const out = repaint(svg)
  assert.ok(!out.includes('SVG Repo'))
  assert.ok(out.includes(`fill="${PALETTE.navy}"`) && out.includes(`fill:${PALETTE.berry}`) && out.includes('fill="none"') && out.includes(`stroke="${PALETTE.white}"`))
})
