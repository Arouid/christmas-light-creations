// "LIT SINCE 2011": the owner's retro Recraft design (assets-source/shirts/recraft/lit-2011.svg, not in git) with its
// cartoon house (pink roof, rosy cheeks) swapped for our cottage, made print-ready. Owner, 2026-10-16: "added
// lit-2011 we need to ready. change the house to our cottage".
// The download traced the 0 and the two 1s of 2011 only where the house didn't cover them, so the cottage sits over
// the same spot (no smoke curl, which would climb over the numbers): cream like the lettering, window and door lit
// gold, with a keyline of shirt round it so its snowy
// roof stands clear of the cream numbers behind. The full-page white square and the navy panel are dropped.
// Run: node scripts/shirt-lit.mjs   → recraft/lit-2011-on-<shirt>.{png,svg,pdf} (11 in wide, 300 dpi, transparent)
// and lit-2011-mockups.png:
// - on-navy: cream and gold inks, everything navy left as shirt (navy or black tees).
// - on-white: the cream in navy ink, gold kept (white, light grey or cream tees).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { letterLines } from './lib/lettering.mjs'
import { checkRoles, fmt, parseLogo, prepCottage, unifyNavy, WHITE_ROLES } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const DPI = 300
const OUTFIT = fileURLToPath(new URL('../assets-source/brand/fonts/outfit/Outfit-Variable.ttf', import.meta.url))
const PRINT_IN = 11
const CREAM = '#F5E2C1', GOLD = '#D9A445', NAVY = '#112A4A' // the design's own colours
// The house: body, roof, cheeks, eyes, lash, smile, side wall and its windows, chimney (the roof and body are checked).
const HOUSE = [5, 6, 7, 8, 9, 10, 11, 22, 23, 24, 25, 26, 27, 28, 35, 38, 51, 53, 57]
const HOUSE_CHECK = { 5: [651, 594, 773, 725], 22: [631, 577, 789, 666] }
const COTTAGE_AT = { cx: 726, bottom: 700, w: 200 } // drawing units: over the cut-off 0, 1, 1, clear of the name line
const KEYLINE = 6 // drawing units of shirt between the cottage and the lettering behind it
const MIN_PT = 2 // thinnest cottage line at print size
const PRINTS = {
  'on-navy': { inks: { cream: CREAM, gold: GOLD, navy: null }, tee: '#152040', edge: '#0b1430' },
  'on-white': { inks: { cream: NAVY, gold: GOLD, navy: null }, tee: '#f6f6f3', edge: '#c9ced8' },
}

const box = (d) => {
  const n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round)
}
const src = readFileSync(DIR + 'lit-2011.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const paths = [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => ({ fill: m[1].match(/fill="([^"]*)"/)[1].toUpperCase(), d: m[1].match(/ d="([^"]*)"/)[1] }))
for (const [i, b] of Object.entries(HOUSE_CHECK)) {
  if (box(paths[i].d).some((v, k) => Math.abs(v - b[k]) > 2)) throw new Error(`lit-2011.svg: path ${i} is not the house any more (new download?)`)
}
const ROLE = { [CREAM]: 'cream', [GOLD]: 'gold', [NAVY]: 'navy' }
// The small CHRISTMAS LIGHT CREATIONS line, hand-drawn by the AI, set again in Outfit SemiBold in its place (owner:
// "start replacing the letters with actual font in all the designs"; scripts/lib/lettering.mjs). LIT SINCE 2011 is
// big display lettering and stays as drawn.
const NAME = letterLines(src, [{ text: 'CHRISTMAS LIGHT CREATIONS', colours: [CREAM], box: [270, 735, 735, 766], count: 24, font: OUTFIT, location: { wght: 600 }, fill: 'FILL' }])
console.log(NAME.notes[0])
const shapes = paths.flatMap((p, i) => {
  const [x0, y0, x1, y1] = box(p.d)
  if (HOUSE.includes(i) || NAME.dropped.includes(i) || x1 - x0 > 700 || y1 - y0 > 700) return [] // the house, the old name line, the page and the navy panel
  if (!ROLE[p.fill]) throw new Error(`lit-2011.svg: unexpected colour ${p.fill} (path ${i})`)
  return [{ role: ROLE[p.fill], svg: (fill) => `<path fill="${fill}" d="${p.d}"/>` }]
}).concat({ role: 'cream', svg: (fill) => NAME.made[0].replaceAll('fill="FILL"', `fill="${fill}"`) })

// The cottage, one colour, no flakes or specks; its window frame and door gold, the rest cream.
const LOGO = parseLogo('clc-cottage-one-color-white.svg')
checkRoles(LOGO, WHITE_ROLES)
const vb = LOGO.viewBox
const art = { x0: 201, x1: 836 } // the design's width in drawing units (LIT to the right-hand sparkles)
const unitsPerIn = (art.x1 - art.x0) / PRINT_IN
const cScale = COTTAGE_AT.w / vb.w // drawing units per cottage unit
const minUnits = (MIN_PT / 72) * unitsPerIn / cScale
const DROP = ['specks', 'snow', 'smoke'] // the smoke would climb over the 0 and the 1s
const prepped = prepCottage(LOGO, WHITE_ROLES, { minUnits, look: 'white', drop: DROP })
const inner = LOGO.wrap ? prepped.svg.replace(/^<g transform="[^"]*">/, '').replace(/<\/g>$/, '') : prepped.svg
const tags = inner.split('\n')
const roles = WHITE_ROLES.filter((r) => !DROP.includes(r))
if (tags.length !== roles.length) throw new Error(`cottage: ${tags.length} shapes for ${roles.length} roles`)
const ch = cScale * vb.h
const place = (body) => `<svg x="${fmt(COTTAGE_AT.cx - COTTAGE_AT.w / 2)}" y="${fmt(COTTAGE_AT.bottom - ch)}" width="${fmt(COTTAGE_AT.w)}" height="${fmt(ch)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">` +
  (LOGO.wrap ? `<g transform="${LOGO.wrap}">${body}</g>` : body) + '</svg>'
const paint = (tag, colour) => tag.replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${colour}"`)
const cottage = (colourOf) => place(tags.map((t, i) => paint(t, colourOf(roles[i]))).join(''))
// The keyline: every cottage shape outlined KEYLINE wider, in the mask's black.
const keyline = place(tags.map((t) => {
  const w = Number((t.match(/stroke-width="([^"]*)"/) || [])[1] || 0) + (2 * KEYLINE) / cScale
  const outlined = t.replace(/ stroke(-[a-z]+)?="[^"]*"/g, '').replace(/\/?>$/, (end) => ` stroke="#000" stroke-width="${fmt(w)}" stroke-linejoin="round" stroke-linecap="round"${end}`)
  return outlined.replace(/fill="(?!none)[^"]*"/, 'fill="#000"')
}).join(''))

// The trimmed box of the whole design (lettering, sparkles, cottage and its keyline).
const all = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${shapes.map((s) => s.svg('#000')).join('')}${keyline}</svg>`
const { info } = await sharp(Buffer.from(all), { density: 72 }).trim().toBuffer({ resolveWithObject: true })
const B = { x: -info.trimOffsetLeft, y: -info.trimOffsetTop, w: info.width, h: info.height }

function design(inks) {
  const area = `x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"`
  const mask = shapes.map((s) => s.svg(inks[s.role] ? '#fff' : '#000')).join('') + keyline + cottage(() => '#fff')
  const ink = shapes.filter((s) => inks[s.role]).map((s) => s.svg(inks[s.role])).join('') +
    cottage((r) => (r === 'windowFrame' || r === 'door' ? inks.gold : inks.cream))
  const h = (PRINT_IN * B.h) / B.w
  return { h, svg: unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_IN}in" height="${fmt(h)}in" viewBox="${B.x} ${B.y} ${B.w} ${B.h}">` +
    `<defs><mask id="cut" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${mask}</mask></defs><g mask="url(#cut)">${ink}</g></svg>`) }
}

const PPI = 60
const TEE = 'M2.6 1.6 L8.4 0.9 Q11 3.3 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z'
const tiles = []
for (const [name, { inks, tee, edge }] of Object.entries(PRINTS)) {
  const { h, svg } = design(inks)
  writeFileSync(`${DIR}lit-2011-${name}.svg`, svg)
  svgToPdf(svg, PRINT_IN, h, `${DIR}lit-2011-${name}.pdf`)
  // librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
  const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * DPI * 1.5) }).resize({ width: PRINT_IN * DPI, kernel: 'lanczos3' })
    .withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(`${DIR}lit-2011-${name}.png`, png)
  console.log(`lit-2011-${name}: ${PRINT_IN} x ${fmt(h)} in`)
  const shirt = `<svg xmlns="http://www.w3.org/2000/svg" width="${22 * PPI}" height="${22 * PPI}" viewBox="0 0 22 22"><rect width="22" height="22" fill="#e9ebf0"/>` +
    `<path d="${TEE}" fill="${tee}" stroke="${edge}" stroke-width="0.06" stroke-linejoin="round"/>` +
    `<text x="0.4" y="21.6" font-family="sans-serif" font-size="0.5" fill="#555b6b">front, ${PRINT_IN} in wide</text></svg>`
  const a = await sharp(png).resize({ width: PRINT_IN * PPI }).toBuffer()
  // composite first, then size down (sharp would otherwise resize before compositing)
  const dressed = await sharp(Buffer.from(shirt)).composite([{ input: a, left: Math.round((11 - PRINT_IN / 2) * PPI), top: Math.round(4 * PPI) }]).png().toBuffer()
  tiles.push(await sharp(dressed).resize({ width: 660 }).png().toBuffer())
}
await sharp({ create: { width: 660 * 2 + 10, height: 660, channels: 3, background: '#3b3f4b' } })
  .composite(tiles.map((input, i) => ({ input, left: i * 670, top: 0 }))).png().toFile(`${DIR}lit-2011-mockups.png`)
console.log('lit-2011-mockups.png: navy tee, white tee')
