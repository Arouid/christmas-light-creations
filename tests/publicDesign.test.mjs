import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIMITS, attachmentProblem, standardSize } from '../src/lib/publicDesign.js'

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
