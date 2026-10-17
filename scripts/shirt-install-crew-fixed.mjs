// Install Crew with the owner's own roofline fix (2026-10-16, made in Inkscape on the gold print: "I fixed this cottage
// for install crew can you use this one to fix the rest"). His file is the gold print (install-crew-on-gold.png,
// embedded) with his layer over it: snow over the pink neon, navy outlines and icicles, leaving a thin strip of the
// red neon showing as one line. That layer, taken out of his file, goes over both prints:
// - gold: over install-crew-on-gold.png as it is (his file, flattened at print size);
// - navy: over install-crew-red-on-navy.png (same art, same size, the same red neon under the strip), with his navy
//   outlines knocked out to the shirt like the rest of that print (ink = (colour·alpha − k·navy) / (alpha − k), k the
//   share of the pixel his navy covers).
// Run: node scripts/shirt-install-crew-fixed.mjs → recraft/install-crew-fixed-on-gold.png and
// install-crew-fixed-on-navy.png (12 x 15.84 in, 300 dpi). His file: recraft/install-crew-owner-fixed-gold.svg.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { PRINT_NAVY } from './lib/logoArt.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const W = 3600, H = 4752
const src = readFileSync(DIR + 'install-crew-owner-fixed-gold.svg', 'utf8')
const image = src.match(/<image[^>]*?\/>/)?.[0]
if (!image || !/width="1152"/.test(src) || !/width="1152"[^>]*height="1520.64"/.test(image)) throw new Error('install-crew-owner-fixed-gold.svg: not the 1152 x 1520.64 page with the gold print across it any more')
const embedded = Buffer.from(image.match(/base64,([^"]*)"/)[1].replace(/&#10;|\s/g, ''), 'base64')
const gold = await sharp(DIR + 'install-crew-on-gold.png').raw().toBuffer()
if (!gold.equals(await sharp(embedded).ensureAlpha().raw().toBuffer())) throw new Error('the image in his file is not install-crew-on-gold.png any more')

// His layer alone, at print size; and where it is his navy (white there, black elsewhere, same coverage).
const layer = src.replace(image, '')
const render = (svg) => sharp(Buffer.from(svg), { density: (72 * W) / 1152 }).resize(W, H).ensureAlpha().raw().toBuffer()
const over = await render(layer)
const navyOnly = await render(layer.replace(/(fill|stop-color):(#[0-9a-fA-F]{6})/g, (m, attr, hex) => `${attr}:${hex.toLowerCase() === PRINT_NAVY.toLowerCase() ? '#ffffff' : '#000000'}`))

async function lay(base, knock) {
  const out = Buffer.alloc(W * H * 4)
  const navy = [1, 3, 5].map((i) => parseInt(PRINT_NAVY.slice(i, i + 2), 16))
  for (let p = 0; p < W * H * 4; p += 4) {
    const oa = over[p + 3] / 255, ba = base[p + 3] / 255
    const a = oa + ba * (1 - oa)
    const k = knock ? Math.min(a, (navyOnly[p] / 255) * (navyOnly[p + 3] / 255)) : 0
    const left = a - k
    for (let c = 0; c < 3; c++) {
      const v = over[p + c] * oa + base[p + c] * ba * (1 - oa) // premultiplied, over
      out[p + c] = left > 0.004 ? Math.max(0, Math.min(255, Math.round((v - k * navy[c]) / left))) : 0
    }
    out[p + 3] = Math.round(left * 255)
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).withMetadata({ density: 300 }).png()
}

await (await lay(gold, false)).toFile(DIR + 'install-crew-fixed-on-gold.png')
await (await lay(await sharp(DIR + 'install-crew-red-on-navy.png').ensureAlpha().raw().toBuffer(), true)).toFile(DIR + 'install-crew-fixed-on-navy.png')
console.log('install-crew-fixed-on-gold.png, install-crew-fixed-on-navy.png: his roofline layer over both prints (3600 x 4752, 12 x 15.84 in)')
