import { statSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'

// /design/ opens on the sample already drawn (scripts/sample-design.mjs) and
// swaps in the live canvas at the same size once the visitor changes it.
const file = (name) => new URL(`../public/images/design/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

test('the ready-made sample picture is a small WebP the same size as the sample house', async () => {
  const house = await sharp(file('sample-house.jpg')).metadata()
  const picture = await sharp(file('sample-design.webp')).metadata()
  assert.equal(picture.format, 'webp')
  assert.deepEqual([picture.width, picture.height], [house.width, house.height])
  assert.ok(statSync(file('sample-design.webp')).size < 60 * 1024)
})
