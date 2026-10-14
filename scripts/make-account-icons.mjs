// Icons for the customers' installable app (/account/, docs/specs/customer-app.md),
// from the cottage tile in assets-source/brand/logo-vector. Run once after the tile changes:
//   node scripts/make-account-icons.mjs
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const TILE = 'assets-source/brand/logo-vector/clc-cottage-tile-1080.png'
const OUT = 'public/account/icons'
const NAVY = { r: 5, g: 11, b: 26, alpha: 1 } // the tile's own navy (#050b1a)

mkdirSync(OUT, { recursive: true })

// "any" icons: the rounded tile as it is.
for (const size of [192, 512]) await sharp(TILE).resize(size).png().toFile(`${OUT}/icon-${size}.png`)

// The tile centred on a flat navy square.
async function onNavy(size, inner, file) {
  const tile = await sharp(TILE).resize(inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: tile, gravity: 'centre' }]).png().toFile(`${OUT}/${file}`)
}
// iPhone rounds the corners itself; transparent corners would show black.
await onNavy(180, 180, 'apple-touch-icon.png')
// Android cuts a circle or squircle out of a maskable icon: keep the cottage in the middle 70%.
await onNavy(512, 358, 'maskable-512.png')
console.log(`wrote ${OUT}/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png`)
