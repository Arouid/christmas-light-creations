// The gift-wrapping page's licensed decoration (docs/specs/gift-wrapping.md):
// the Vecteezy Pro strip of red and white ornaments in Santa hats (item
// 23805645, raw file in assets-source/stock/vecteezy/packs/pack1/, ignored)
// → public/images/holiday/ornaments-hats.webp (1600 px) and -800.webp.
// Its "MERRY CHRISTMAS" lettering and the grey floor under the balls are
// taken out and the off-white background is lifted to pure white, so the strip
// sits on the white page with no visible box. Decoration only: no gifts in it.
//   node scripts/gift-art.mjs
import sharp from 'sharp'

const SRC = 'assets-source/stock/vecteezy/packs/pack1/vecteezy_christmas-ball-in-red-santa-claus-hat-isolated-on-white_23805645.jpg'
const OUT = 'public/images/holiday/ornaments-hats'
// The lettering's box and the part kept (the balls end at y ≈ 665, their reflections below).
const TEXT = { left: 620, top: 128, right: 1300, bottom: 205 }
const KEEP = { left: 70, top: 18, width: 1780, height: 654 }

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const ramp = (v, lo, hi) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels
    if (x >= TEXT.left && x < TEXT.right && y >= TEXT.top && y < TEXT.bottom) {
      data[i] = data[i + 1] = data[i + 2] = 255
      continue
    }
    const lo = Math.min(data[i], data[i + 1], data[i + 2])
    const hi = Math.max(data[i], data[i + 1], data[i + 2])
    if (hi - lo > 10) continue // coloured: the red balls and hats stay as they are
    // Near-white greys (the background, its gradient) fade to white; the fur's shading below 222 stays.
    const t = ramp(lo, 222, 246)
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] + (255 - data[i + c]) * t)
  }
}
const clean = sharp(data, { raw: info }).extract(KEEP)
const buf = await clean.png().toBuffer()
for (const [w, file] of [[1600, `${OUT}.webp`], [800, `${OUT}-800.webp`]]) {
  const r = await sharp(buf).resize({ width: w }).webp({ quality: 80 }).toFile(file)
  console.log(`${file}: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
}
