// Install Crew with the mustard cottage's house (owner, 2026-10-16: "notice the red on the mustard cottage vs the red
// on the install crew cottage. Also the mustard cottage roof is much nicer", "just a strip of red is all we want on the
// install crew and the new roof from mustard cottage"). The two AI drawings don't share a house shape, so a roof alone
// can't be moved across; the whole house is: the mustard cottage (recraft/big-cottage-mustard-limited-size.svg: snow
// roof, one thin red roofline) replaces Install Crew's (recraft/install-crew-v2-pearland-white.svg: thick pink neon).
// How: every Install Crew shape whose middle falls inside its house (the big white shape 0, above the snow line) goes;
// shapes 0 and 2 (white snow and dark backing, under house and banner alike) keep only their part below the snow line;
// a full sky circle (measured from the disc, shape 180, which had a roof-shaped hole) fills the gap; the mustard
// cottage, its snowflakes and smoke turned white (snow falling in the night sky), stands in the snow; the snow bank,
// banner and lower lettering are drawn over its foot.
// Run: node scripts/shirt-install-crew-v3.mjs → recraft/install-crew-v3.svg, then the prints:
//   navy: recraft/install-crew-v3-on-navy.png (shirt-knockout.mjs, the navies knocked out)
//   gold: recraft/install-crew-v3-on-gold.png (shirt-install-crew-gold.mjs on this file)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SCRIPTS = fileURLToPath(new URL('./', import.meta.url))
// Shape 180 was the sky disc with a roof-shaped hole plus two thin navy ring lines, its edge wrapped round the old
// eaves (those wraps print as stray outlines on a gold shirt). It is redrawn clean, measured row by row: the disc and
// the two lines (radius, width), the lines ending where the gold side rings end.
const SKY = { cx: 2048, cy: 1854, r: 944, fill: '#1F2742', rings: [[971, 16], [1020, 28]], ringsEnd: 2290 }
const SNOW_LINE = 2800 // file units: the snow bank's top; below it the banner group is kept whole
const KEEP = [92, 99] // the snow bank's details and the banner's gold edge
const GOLD = ['#C3923A', '#C79A3E'] // rings and lettering: never part of the house
const HOUSE_BOX = { cx: 2048, bottom: 2885, w: 1750 } // the mustard cottage's art box, centred (file units): its smoke stays in the sky
// The old eaves' icicles and the dark bits round them sit just outside shape 0: this band goes too, but small white
// shapes (the stars) stay.
const EAVES = { x0: 1000, x1: 3200, y0: 1900 }
const SMOKE = [220, 224], FLAKES = Array.from({ length: 28 }, (_, k) => 221 + k).filter((i) => i !== 224 && i !== 237)

const src = readFileSync(DIR + 'install-crew-v2-pearland-white.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const head = src.match(/<svg[^>]*>/)[0], defs = (src.match(/<defs>[^]*?<\/defs>/) || [''])[0]
const paths = [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => {
  const d = m[1].match(/ d="([^"]*)"/)[1], n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return { tag: m[0], fill: (m[1].match(/fill="([^"]*)"/) || [])[1]?.toUpperCase(), cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2,
    w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
})
if (paths.length !== 372 || paths[180].fill !== '#1F2742') throw new Error('install-crew-v2: not the expected file any more')

// The old house: shape 0 rasterised at 1/4 size, tested at each shape's middle.
const Q = 4
const { data, info } = await sharp(Buffer.from(head + paths[0].tag.replace(/fill="[^"]*"/, 'fill="#000"') + '</svg>'), { density: 72 / Q })
  .flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true })
const inHouse = (p) => { const x = Math.round(p.cx / Q), y = Math.round(p.cy / Q); return p.cy < SNOW_LINE && data[y * info.width + x] < 128 }

const below = `<clipPath id="ringsEnd"><rect x="0" y="0" width="4096" height="${SKY.ringsEnd}"/></clipPath><clipPath id="belowSnow"><rect x="0" y="${SNOW_LINE}" width="4096" height="${4096 - SNOW_LINE}"/></clipPath>`
const upper = [], lower = []
let removed = 0
paths.forEach((p, i) => {
  if (i === 0 || i === 2) { lower.push(p.tag.replace('<path ', '<path clip-path="url(#belowSnow)" ')); return }
  if (i === 180) return // redrawn clean, below
  const star = ['#FEFDFD', '#FFFFFF'].includes(p.fill) && p.w < 70 && p.h < 70
  const eave = p.cx > EAVES.x0 && p.cx < EAVES.x1 && p.cy > EAVES.y0 && p.cy < SNOW_LINE && !star
  const faint = Number((p.tag.match(/fill-opacity="([^"]*)"/) || [])[1] ?? 1) < 0.5 // the vectorizer's near-invisible specks
  if (!KEEP.includes(i) && !GOLD.includes(p.fill) && (inHouse(p) || eave || faint)) { removed++; return }
  ;(p.cy >= SNOW_LINE || KEEP.includes(i) ? lower : upper).push(p.tag)
})

// The mustard cottage, its flakes and smoke white, cropped to its art and placed.
const m = readFileSync(DIR + 'big-cottage-mustard-limited-size.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
let k = -1
const mInner = m.replace(/^[^]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<path ([^>]*)\/>/g, (t) => {
  k++
  return SMOKE.includes(k) || FLAKES.includes(k) ? t.replace(/fill="[^"]*"/, 'fill="#F7F1E3"') : t
}).replace(/gradient_/g, 'mustard_gradient_') // its gradient ids, kept apart from Install Crew's own
const mBox = await (async () => {
  const { info: t } = await sharp(Buffer.from(m), { density: 72 }).trim().toBuffer({ resolveWithObject: true })
  return { x: -t.trimOffsetLeft, y: -t.trimOffsetTop, w: t.width, h: t.height }
})()
const hH = (HOUSE_BOX.w * mBox.h) / mBox.w
const house = `<svg x="${HOUSE_BOX.cx - HOUSE_BOX.w / 2}" y="${HOUSE_BOX.bottom - hH}" width="${HOUSE_BOX.w}" height="${hH}" viewBox="${mBox.x} ${mBox.y} ${mBox.w} ${mBox.h}">${mInner}</svg>`

const out = head + defs.replace('</defs>', below + '</defs>').replace('<defs>', defs ? '<defs>' : '') + (defs ? '' : `<defs>${below}</defs>`) +
  `<circle cx="${SKY.cx}" cy="${SKY.cy}" r="${SKY.r}" fill="${SKY.fill}"/>` +
  `<g clip-path="url(#ringsEnd)">${SKY.rings.map(([r, w]) => `<circle cx="${SKY.cx}" cy="${SKY.cy}" r="${r}" fill="none" stroke="${SKY.fill}" stroke-width="${w}"/>`).join('')}</g>` +
  upper.join('') + house + lower.join('') + '</svg>'
writeFileSync(DIR + 'install-crew-v3.svg', out)
console.log(`install-crew-v3.svg: ${removed} house shapes out, the mustard cottage in (${Math.round(HOUSE_BOX.w)} x ${Math.round(hH)} units)`)

// The prints.
execFileSync('node', [SCRIPTS + 'shirt-knockout.mjs', DIR + 'install-crew-v3.svg', DIR + 'install-crew-v3-on-navy.png', '12', '1F2742,141A39,25263C,23202A', '--drop-bg'], { stdio: 'inherit' })
execFileSync('node', [SCRIPTS + 'shirt-install-crew-gold.mjs', 'install-crew-v3.svg', 'install-crew-v3-on-gold.png', 'all'], { stdio: 'inherit' })
