// Knocks the shirt colour out of a design SVG (from Recraft or anywhere) so it prints on a navy shirt: shapes in
// the given colours are lifted out, so the shirt shows through (on navy that looks the same, and prints softer and
// cheaper), every other colour stays as ink, and the edges between them stay clean.
// Run: node scripts/shirt-knockout.mjs <in.svg> <out.png> <print width, inches> <hex,hex,...> [--drop-bg] [--map from=to,...]
//   --drop-bg  also drops a full-page background rectangle (Recraft's white page).
//   --map      swaps colours first, fills and gradient stops alike (e.g. the AI's pink neon to red:
//              owner, 2026-10-16, of the Install Crew roofline: "do I just need to live with this red").
// How: the vector is rendered twice at the same size, as itself and as a mask (knocked colours black, all else
// white). The mask gives each pixel's ink coverage m; where ink meets a knocked shape the render's colour is
// m·ink + k·navy, so the ink is recovered as (render − k·navy) / m. Output: a transparent PNG at 300 dpi,
// trimmed to the art and sized to the print width.
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const [src, out, inches, colours, ...flags] = process.argv.slice(2)
const mapArg = flags.includes('--map') ? flags[flags.indexOf('--map') + 1] : ''
const swaps = Object.fromEntries(mapArg.split(',').filter(Boolean).map((p) => p.toUpperCase().replace(/#/g, '').split('=')))
if (!src || !out || !Number(inches) || !colours) {
  console.error('usage: node scripts/shirt-knockout.mjs <in.svg> <out.png> <inches> <hex,hex,...> [--drop-bg]')
  process.exit(1)
}
const knock = colours.split(',').map((c) => c.replace('#', '').toUpperCase())
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
const navy = knock.map(hex).reduce((a, c) => a.map((v, i) => v + c[i] / knock.length), [0, 0, 0])
const isKnock = (f) => knock.includes(f.replace('#', '').toUpperCase())

let svg = readFileSync(src, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
if (mapArg) svg = svg.replace(/(fill|stop-color)="#([0-9A-Fa-f]{6})"/g, (m, attr, hex) => (swaps[hex.toUpperCase()] ? `${attr}="#${swaps[hex.toUpperCase()]}"` : m))
if (flags.includes('--drop-bg')) svg = svg.replace(/<path fill="[^"]*" d="M0 0L(\d+) 0L\1 \1L0 \1L0 0Z"\/>/, '')
const mask = svg.replace(/fill="([^"]*)"/gi, (m, f) => (f === 'none' ? m : `fill="${isKnock(f) ? '#000000' : '#ffffff'}"`))

// Render 1.5x larger than the file's own size, then size down to the print width (crisper than sizing up).
const density = 108
const art = await sharp(Buffer.from(svg), { density }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const cover = await sharp(Buffer.from(mask), { density }).flatten({ background: '#000000' }).greyscale().raw().toBuffer()
const { width, height } = art.info
const px = Buffer.alloc(width * height * 4)
for (let p = 0; p < width * height; p++) {
  const a = art.data[p * 4 + 3] / 255, m = cover[p] / 255
  if (m < 0.03) continue
  const k = Math.max(0, a - m)
  for (let i = 0; i < 3; i++) px[p * 4 + i] = Math.max(0, Math.min(255, Math.round((art.data[p * 4 + i] * a - k * navy[i]) / m)))
  px[p * 4 + 3] = Math.round(Math.min(1, m) * 255)
}
const trimmed = await sharp(px, { raw: { width, height, channels: 4 } }).trim().png().toBuffer()
const r = await sharp(trimmed).resize({ width: Math.round(Number(inches) * 300), kernel: 'lanczos3' })
  .withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(out)
console.log(`${out}: ${r.width}x${r.height} px = ${(r.width / 300).toFixed(2)} x ${(r.height / 300).toFixed(2)} in at 300 dpi`)
