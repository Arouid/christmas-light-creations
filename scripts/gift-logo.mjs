// The logo with a red bow on the cottage's roof, for the gift-wrapping page's
// header only (docs/specs/gift-wrapping.md; owner 2026-10-15: "be cool if we
// could get a red bow on our logo", that page only). He turned down a
// photo-real stock bow ("looks like its just pasted in over top"), so the bow
// is drawn here in the logo's own neon style: like the roofline and the
// chimney, each line is a pale core on a red tube with a soft red glow, and the
// loops hold only a faint red glow. No stock art in it.
// public/images/clc-logo-wide.png (unchanged) → public/images/gift-wrap/logo-wide-bow.png
//   node scripts/gift-logo.mjs
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const LOGO = 'public/images/clc-logo-wide.png' // 517 × 168
const OUT = 'public/images/gift-wrap/logo-wide-bow.png'
// The knot sits on the roof's top edge, right of the chimney; the loops rise into the night sky
// (clear of the chimney, its smoke and the snowflake), the tails lie on the snow.
const KNOT = { x: 94, y: 63 }
const SCALE = 1.25

// The bow round its knot at (0, 0), about 44 wide before scaling: two loops, two notched tails.
const SHAPES = [
  'M0 0C-7-11-19-15-21-8C-23-1-12 3 0 0Z',
  'M0 0C7-11 19-15 21-8C23-1 12 3 0 0Z',
  'M-2 2L-9 16L-5.5 14.5L-3.5 18L2 3',
  'M2 2L9 16L5.5 14.5L3.5 18L-2 3',
]
// One neon layer of the whole bow: every shape and the knot with the same paint.
const layer = (paint) => SHAPES.map((d) => `<path d="${d}" ${paint}/>`).join('') + `<circle r="3.2" ${paint}/>`
// Line widths in logo pixels, whatever the scale.
const px = (n) => n / SCALE

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="517" height="168">
  <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
  <g transform="translate(${KNOT.x} ${KNOT.y}) scale(${SCALE})" stroke-linejoin="round" stroke-linecap="round">
    ${layer('fill="#ff2a3c" fill-opacity="0.25" stroke="none"')}
    <g filter="url(#glow)">${layer(`fill="none" stroke="#ff1f35" stroke-opacity="0.95" stroke-width="${px(5)}"`)}</g>
    ${layer(`fill="none" stroke="#ff3b4d" stroke-width="${px(2.6)}"`)}
    ${layer(`fill="none" stroke="#ffd9dd" stroke-width="${px(1.05)}"`)}
  </g>
</svg>`

mkdirSync('public/images/gift-wrap', { recursive: true })
const r = await sharp(LOGO).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(OUT)
console.log(`${OUT}: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
