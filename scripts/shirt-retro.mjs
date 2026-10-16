// "Retro CLC": the owner's Recraft design (assets-source/shirts/recraft/retro-clc.svg, not in git): CHRISTMAS LIGHT
// CREATIONS arched over a gold and red rainbow, a night sky with a cottage between snowy pines, PEARLAND, TX · EST.
// 2011 under it. Owner, 2026-10-16, asked whether to swap in our real cottage: "if you can make it work".
// The download's cottage is one cream shape (smoke, chimney, roof, walls) over a cottage-shaped hole in the navy sky,
// plus its window, door and bulbs. All of that goes, the sky is painted back over the hole (under the pines and the
// stars), and our cottage stands on the snow: the colour logo with its neon drawn solid in this design's colours
// (roof line red like a light strand, window and posts gold, snow and smoke cream, walls the night's navy).
// Run: node scripts/shirt-retro.mjs   → recraft/retro-clc-*.{png,svg,pdf} (11 in wide, 300 dpi) and the mockups:
// - color: as drawn (the cream page dropped), for DTG/DTF on cream, white, sand or light grey shirts.
// - 5-color: the same folded into five spot colours (navy, red, gold, cream, orange) for screen printing.
// Light shirts only: on a navy shirt the pines, the roof and the town line vanish into the shirt.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COLOR_ROLES, checkRoles, fmt, parseLogo, prepCottage } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const DPI = 300
const PRINT_IN = 11
const C = { navy: '#0C2F4A', red: '#B42320', gold: '#E4A734', cream: '#FEF8E7', orange: '#D3631F' } // the design's own
// The download's cottage: its cream body (smoke to walls; checked), door, window panes, wall lines, the two snow
// highlights on the roof, the bulbs and their wire.
const HOUSE = [6, 24, 26, 106, 107, 108, 109, 260, 261, 262, 263, 264, 265, 266, ...Array.from({ length: 25 }, (_, k) => 273 + k), 300, 303, 304, 305, 307, 308, 309]
const HOUSE_CHECK = { 6: [283, 532, 771, 858], 106: [584, 834, 719, 942] }
// The sky painted back over the hole (drawing units, before the file's 0.9 scale), bottom edge a snowy rise.
// Its bottom edge is the snow line, level with the foot of our cottage's walls (921), so the cottage stands on the
// snow, which is the shirt itself (the cottage's own cream mound would print a second cream).
const SKY = 'M280 700 L782 700 L782 903 Q745 914 700 920 L345 920 Q310 914 280 903 Z'
const COTTAGE_AT = { cx: 530, bottom: 965, w: 470 }
// Our colour cottage, recoloured: each role → a colour, or null to leave it out.
const ROLE_COLOURS = {
  smoke: C.cream, wall: C.navy, wallLines: C.cream, windowInterior: C.gold, windowGlow: C.gold, windowFrame: C.cream,
  doorGlow: C.gold, door: C.cream, doorLines: C.navy, postsGlow: C.gold, posts: C.cream, ground: null,
  roofGlowOuter: C.red, roofGlowInner: C.red, roof: C.cream, chimneyGlow: C.gold, chimneyWhite: C.cream, chimney: C.navy, chimneyDot: C.gold,
}
const DROP = ['specks', 'snow', 'postHighlights']

const box = (d) => {
  const n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round)
}
const src = readFileSync(DIR + 'retro-clc.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const head = src.match(/<svg[^>]*>/)[0]
const defs = (src.match(/<defs>[^]*?<\/defs>/) || [''])[0]
const paths = [...src.matchAll(/<path [^>]*\/>/g)].map((m) => m[0])
const SCALE = paths[0].match(/transform="([^"]*)"/)[1]
if (paths.some((p) => p.match(/transform="([^"]*)"/)[1] !== SCALE)) throw new Error('retro-clc.svg: shapes no longer share one transform')
for (const [i, b] of Object.entries(HOUSE_CHECK)) {
  if (box(paths[i].match(/ d="([^"]*)"/)[1]).some((v, k) => Math.abs(v - b[k]) > 2)) throw new Error(`retro-clc.svg: path ${i} is not the cottage any more (new download?)`)
}
if (!/^#FEF8E7$/i.test(paths[0].match(/fill="([^"]*)"/)[1])) throw new Error('retro-clc.svg: path 0 is not the cream page')

// The cottage (drawing units), placed by its viewBox: w wide, bottom on the snow.
const LOGO = parseLogo('clc-cottage-color.svg')
checkRoles(LOGO, COLOR_ROLES)
const vb = LOGO.viewBox
const cScale = COTTAGE_AT.w / vb.w
const minUnits = ((2 / 72) * (1024 * 0.9 / PRINT_IN)) / 0.9 / cScale // 2 pt at print size, in cottage units
const prepped = prepCottage(LOGO, COLOR_ROLES, { minUnits, look: 'flat', drop: DROP })
const inner = LOGO.wrap ? prepped.svg.replace(/^<g transform="[^"]*">/, '').replace(/<\/g>$/, '') : prepped.svg
const tags = inner.split('\n')
const roles = COLOR_ROLES.filter((r) => !DROP.includes(r))
if (tags.length !== roles.length) throw new Error(`cottage: ${tags.length} shapes for ${roles.length} roles`)
const recoloured = tags.map((t, i) => {
  const colour = ROLE_COLOURS[roles[i]]
  if (colour === undefined) throw new Error(`cottage: no colour for ${roles[i]}`)
  return colour ? t.replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${colour}"`) : ''
}).join('')
const ch = cScale * vb.h
const cottage = `<svg x="${fmt(COTTAGE_AT.cx - COTTAGE_AT.w / 2)}" y="${fmt(COTTAGE_AT.bottom - ch)}" width="${fmt(COTTAGE_AT.w)}" height="${fmt(ch)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">` +
  (LOGO.wrap ? `<g transform="${LOGO.wrap}">${recoloured}</g>` : recoloured) + '</svg>'

// The design: the page dropped, the sky patch right after the navy disc (so pines and stars stay on top), the house
// shapes dropped, our cottage last but under the town line (it sits above it anyway).
const body = paths.map((p, i) => {
  if (i === 0 || HOUSE.includes(i)) return ''
  return i === 1 ? p + `<path transform="${SCALE}" fill="${C.navy}" d="${SKY}"/>` : p
}).join('') + `<g transform="${SCALE}">${cottage}</g>`
const draw = (b) => `${head}${defs}${b}</svg>`

// Five spot colours: every colour to the nearest of navy, red, gold, cream, orange.
const SPOT = Object.values(C)
const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16))
const nearest = (h) => SPOT.reduce((best, s) => {
  const d = rgb(h).reduce((a, v, k) => a + (v - rgb(s)[k]) ** 2, 0)
  return d < best.d ? { s, d } : best
}, { d: Infinity }).s
const stops = Object.fromEntries([...defs.matchAll(/<linearGradient id="([^"]*)"[^>]*>\s*<stop[^>]*stop-color="([^"]*)"/g)].map((m) => [m[1], m[2]]))
const fiveColor = body.replace(/(fill|stroke)="(#[0-9A-Fa-f]{6}|url\(#([^)]*)\))"/g, (m, attr, val, grad) => `${attr}="${nearest(grad ? stops[grad] : val)}"`)

// The trimmed box, in the file's own units.
const { info } = await sharp(Buffer.from(draw(body)), { density: 72 }).trim().toBuffer({ resolveWithObject: true })
const B = { x: -info.trimOffsetLeft, y: -info.trimOffsetTop, w: info.width, h: info.height }
const hIn = (PRINT_IN * B.h) / B.w
const sized = (b) => draw(b).replace(head, `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PRINT_IN}in" height="${fmt(hIn)}in" viewBox="${B.x} ${B.y} ${B.w} ${B.h}">`)

const PPI = 60
const TEE = 'M2.6 1.6 L8.4 0.9 Q11 3.3 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z'
const tiles = []
for (const [name, b, tee, edge] of [['color', body, '#F3EBDB', '#cfc6b2'], ['5-color', fiveColor, '#f6f6f3', '#c9ced8']]) {
  const svg = sized(b)
  writeFileSync(`${DIR}retro-clc-${name}.svg`, svg)
  svgToPdf(svg, PRINT_IN, hIn, `${DIR}retro-clc-${name}.pdf`)
  // librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
  const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * DPI * 1.5) }).resize({ width: PRINT_IN * DPI, kernel: 'lanczos3' })
    .withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(`${DIR}retro-clc-${name}.png`, png)
  console.log(`retro-clc-${name}: ${PRINT_IN} x ${fmt(hIn)} in`)
  const shirt = `<svg xmlns="http://www.w3.org/2000/svg" width="${22 * PPI}" height="${22 * PPI}" viewBox="0 0 22 22"><rect width="22" height="22" fill="#e9ebf0"/>` +
    `<path d="${TEE}" fill="${tee}" stroke="${edge}" stroke-width="0.06" stroke-linejoin="round"/>` +
    `<text x="0.4" y="21.6" font-family="sans-serif" font-size="0.5" fill="#555b6b">${name === 'color' ? 'cream tee' : 'white tee, 5 spot colours'}, ${PRINT_IN} in wide</text></svg>`
  const art = await sharp(png).resize({ width: PRINT_IN * PPI }).toBuffer()
  // composite first, then size down (sharp would otherwise resize before compositing)
  const dressed = await sharp(Buffer.from(shirt)).composite([{ input: art, left: Math.round((11 - PRINT_IN / 2) * PPI), top: Math.round(3.6 * PPI) }]).png().toBuffer()
  tiles.push(await sharp(dressed).resize({ width: 660 }).png().toBuffer())
}
await sharp({ create: { width: 660 * 2 + 10, height: 660, channels: 3, background: '#3b3f4b' } })
  .composite(tiles.map((input, i) => ({ input, left: i * 670, top: 0 }))).png().toFile(`${DIR}retro-clc-mockups.png`)
console.log('retro-clc-mockups.png: cream tee (colour), white tee (5 spot colours)')
