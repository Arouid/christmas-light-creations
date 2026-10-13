import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newDesign } from '../src/designer/model.js'
import { finishedPicture } from '../src/design/photo.js'
import { LIMITS, WATERMARK_TEXT, attachmentProblem, standardSize, watermark, watermarkLayout } from '../src/lib/publicDesign.js'

test('every photo becomes the standard size: long side 1280, same shape', () => {
  assert.deepEqual(standardSize(4032, 3024), { width: 1280, height: 960, portrait: false })
  assert.deepEqual(standardSize(3024, 4032), { width: 960, height: 1280, portrait: true })
  assert.deepEqual(standardSize(1000, 600), { width: 1280, height: 768, portrait: false }) // a smaller one is enlarged
  assert.deepEqual(standardSize(1280, 800), { width: 1280, height: 800, portrait: false })
})

test('too small or broken photos are refused', () => {
  assert.equal(standardSize(640, 480), null)
  assert.equal(standardSize(799, 799), null)
  assert.equal(standardSize(0, 900), null)
  assert.equal(standardSize(NaN, 900), null)
})

test('an attachment must fit the database limits', () => {
  const jpeg = (n) => `data:image/jpeg;base64,${'A'.repeat(n)}`
  const ok = { design: '{"strands":[]}', photo: jpeg(1000), image: jpeg(1000) }
  assert.equal(attachmentProblem(ok), '')
  assert.equal(attachmentProblem({ ...ok, photo: 'sample' }), '')
  assert.equal(attachmentProblem({ ...ok, design: '' }), 'design')
  assert.equal(attachmentProblem({ ...ok, design: 'x'.repeat(LIMITS.design + 1) }), 'design')
  assert.equal(attachmentProblem({ ...ok, photo: jpeg(LIMITS.photo) }), 'photo')
  assert.equal(attachmentProblem({ ...ok, photo: 'data:image/png;base64,AAAA' }), 'photo')
  assert.equal(attachmentProblem({ ...ok, image: jpeg(LIMITS.image) }), 'image')
  assert.equal(attachmentProblem({ ...ok, image: 'sample' }), 'image')
  assert.equal(attachmentProblem(), 'design')
})

// A 2D context that remembers every call and every property set.
function fakeContext() {
  const calls = []
  return new Proxy({}, {
    get: (t, prop) => {
      if (prop === 'calls') return calls
      if (prop in t) return t[prop]
      return (...args) => { calls.push([prop, ...args]); return prop === 'measureText' ? { width: 300 } : undefined }
    },
    set: (t, prop, v) => { t[prop] = v; calls.push(['set', prop, v]); return true },
  })
}
const LOGO = { width: 517, height: 168 } // clc-logo-wide.png

test('the mark sits inside the bottom-right corner and scales with the picture', () => {
  const L = watermarkLayout(1280, 960, { logoAspect: LOGO.width / LOGO.height, textWidth: 350 })
  assert.equal(L.font, 19)
  assert.ok(L.plate.x > 1280 * 0.6 && L.plate.x + L.plate.w < 1280, 'right side, inside')
  assert.ok(L.plate.y > 960 * 0.7 && L.plate.y + L.plate.h < 960, 'bottom, inside')
  assert.equal(L.logo.w, Math.round(1280 * 0.24))
  assert.ok(L.logo.x >= L.plate.x && L.logo.x + L.logo.w <= L.plate.x + L.plate.w, 'logo inside the plate')
  assert.ok(L.logo.y > L.plate.y && L.logo.y + L.logo.h < L.text.y && L.text.y < L.plate.y + L.plate.h, 'logo above the text, both on the plate')
  const P = watermarkLayout(960, 1280, { logoAspect: LOGO.width / LOGO.height, textWidth: 260 })
  assert.equal(P.font, 14)
  assert.ok(P.logo.w < L.logo.w && P.plate.x + P.plate.w < 960 && P.plate.y + P.plate.h < 1280, 'smaller on a portrait photo')
  const T = watermarkLayout(1280, 960) // no logo: text only, on a shorter plate
  assert.equal(T.logo, null)
  assert.ok(T.plate.h < L.plate.h && T.plate.w > 0)
})

test('the mark draws the plate, the logo and the designer address, and leaves the context as it found it', () => {
  const ctx = fakeContext()
  const L = watermark(ctx, 1280, 960, { logo: LOGO })
  const names = ctx.calls.map((c) => c[0])
  assert.deepEqual([names[0], names.at(-1)], ['save', 'restore'])
  assert.deepEqual(ctx.calls.find((c) => c[0] === 'drawImage'), ['drawImage', LOGO, L.logo.x, L.logo.y, L.logo.w, L.logo.h])
  assert.deepEqual(ctx.calls.find((c) => c[0] === 'fillText'), ['fillText', WATERMARK_TEXT, L.text.x, L.text.y])
  assert.ok(names.indexOf('fill') < names.indexOf('drawImage') && names.indexOf('drawImage') < names.indexOf('fillText'), 'plate, then logo, then text')
  assert.ok(ctx.calls.some((c) => c[0] === 'set' && c[1] === 'globalCompositeOperation' && c[2] === 'source-over'), 'drawn normally, whatever the design left behind')
  const text = fakeContext()
  watermark(text, 1280, 960, { logo: null })
  assert.ok(!text.calls.some((c) => c[0] === 'drawImage') && text.calls.some((c) => c[0] === 'fillText' && c[1] === WATERMARK_TEXT), 'no logo: text only')
})

test('every finished picture (the thumbnail and what is sent with the request) carries the mark over the design', () => {
  const ctx = fakeContext()
  const canvas = { width: 0, height: 0, getContext: () => ctx, toDataURL: () => 'data:image/jpeg;base64,AAAA' }
  globalThis.document = { createElement: () => canvas }
  try {
    const photo = { width: 1280, height: 960 }
    const url = finishedPicture(newDesign({ width: 1280, height: 960 }), photo, LOGO)
    assert.equal(url, 'data:image/jpeg;base64,AAAA')
    assert.deepEqual([canvas.width, canvas.height], [1280, 960])
    const house = ctx.calls.findIndex((c) => c[0] === 'drawImage' && c[1] === photo)
    const mark = ctx.calls.findIndex((c) => c[0] === 'drawImage' && c[1] === LOGO)
    assert.ok(house >= 0 && mark > house, 'the photo is drawn, then the logo over it')
    assert.ok(ctx.calls.some((c) => c[0] === 'fillText' && c[1] === WATERMARK_TEXT), 'and the designer address')
  } finally {
    delete globalThis.document
  }
})
