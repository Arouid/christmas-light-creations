// Bradley, co-owner (died October 2025), as the company mascot: the owner's two Recraft portraits of him made
// print-ready and tried on clothes. Owner, 2026-10-16: "I wanna make him the business mascot".
// - line: head and shoulders in his fishing cap, navy line art. The cap's patch (another company's fish logo) is
//   swapped for our cottage. Navy shirt: the white parts in white ink, the lines left as shirt. White, gold or
//   mustard shirt: the lines in navy ink, the rest left as shirt.
// - gold: half length in his flat cap, coat and scarf, gold on navy. Navy shirt: one gold ink. Gold or mustard
//   shirt: one navy ink.
// - medal: the round tribute (BRAD MEDEL over his beanie portrait, CHRISTMAS LIGHT CREATIONS under it), navy, white
//   and gold with grey shading. Navy shirt: white and gold inks, the navy disc left as shirt. White shirt: navy and
//   gold inks. Colour: as drawn (greys too), for digital printing on any shirt. Also as a 4-in chest print.
//   Patch: the whole medal, navy disc included (the patch's twill), 3.5 in, its colours cut to five threads.
// The downloads keep a full-page backing square (dropped here) and draw light shapes over dark ones, so unprinted
// parts are cut out with a mask (the shirt shows through), not just left unpainted.
// Run: node scripts/shirt-mascot.mjs   (reads and writes assets-source/shirts/recraft/, not in git)
// Output: mascot-<art>-on-<shirt>.{png,svg,pdf} (11 in wide, 300 dpi, transparent; the medal also -chest.png, 4 in),
// mascot-mockups.png (a navy polo with him on the sleeve, navy and gold tees with him on the back, a cap with a
// leather patch, the medal on a navy tee's chest and back).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COLORS, FONTS, NAVY_ROLES, WHITE_ROLES, checkRoles, fmt, glyphs, parseLogo, prepCottage, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const DPI = 300
const PRINT_IN = 11 // back-print width
const { navyDeep: NAVY, white: WHITE, gold: GOLD } = COLORS
const SOURCES = {
  // The patch: path 206 is its white face (box checked below); 207–209 are the fish and its two highlights.
  line: { file: 'bradley-blue-line art.svg', patch: { face: 206, box: [380, 116, 637, 242], drop: [207, 208, 209] } },
  gold: { file: 'bradley-navy-gold.svg' },
  medal: { file: 'brad-medel-circle-tribute.svg' },
}
// Which ink each kind of shape gets per shirt (null: not printed, the shirt shows).
const PRINTS = {
  'line-on-navy': { art: 'line', inks: { light: WHITE, dark: null, gold: null } },
  'line-on-light': { art: 'line', inks: { dark: NAVY, light: null, gold: null } }, // white, gold or mustard shirts
  'gold-on-navy': { art: 'gold', inks: { gold: GOLD, dark: null, light: null } },
  'gold-on-gold': { art: 'gold', inks: { dark: NAVY, gold: null, light: null } },
  'medal-on-navy': { art: 'medal', inks: { light: WHITE, gold: GOLD, dark: null }, chest: 4 },
  'medal-on-white': { art: 'medal', inks: { dark: '#1c2b44', gold: '#b8862b', light: null }, chest: 4 }, // its own navy (ours prints near black on white), dark gold
  'medal-color': { art: 'medal', inks: 'as drawn', chest: 4 },
  'medal-patch': { art: 'medal', inks: (sh) => thread(sh), w: 3.5 },
}

// The patch's five threads (owner, 2026-10-16: "this is the patch im wanting", the medal). The download's 13 colours
// fold into them by brightness: its navies and near-blacks, the beanie's two greys, its whites, its gold.
const THREADS = { navy: '#1C2B44', grey: '#8E95A9', lightGrey: '#CED3DF', white: '#FFFFFF', gold: '#B6964F' }
function thread({ shade, colour }) {
  if (shade === 'gold') return THREADS.gold
  if (shade === 'dark') return THREADS.navy
  const h = colour.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.88 ? THREADS.white : lum > 0.7 ? THREADS.lightGrey : THREADS.grey
}

const box = (d) => {
  const n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}
function shade(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  if (r - b > 40 && r > 150) return 'gold'
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? 'dark' : 'light'
}
// The one-colour cottage, its sketch lines, flakes and specks dropped, every paint in `fill` (for the cap patch).
const COTTAGE = parseLogo('clc-cottage-one-color-navy.svg')
const COTTAGE_ROLES = COTTAGE.paths.length === 12 ? NAVY_ROLES : WHITE_ROLES
checkRoles(COTTAGE, COTTAGE_ROLES)
function cottage(fill, [x0, y0, x1, y1]) {
  const vb = COTTAGE.viewBox
  const h = (y1 - y0), w = (h * vb.w) / vb.h
  const inner = prepCottage(COTTAGE, COTTAGE_ROLES, { minUnits: 0, look: 'white', drop: ['specks', 'snow', 'wallLines', 'doorLines', 'postHighlights'] }).svg
    .replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${fill}"`)
  return `<svg x="${fmt((x0 + x1) / 2 - w / 2)}" y="${fmt(y0)}" width="${fmt(w)}" height="${fmt(h)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${inner}</svg>`
}

// A portrait as a list of shapes, each { shade, draw(fill) }, without the backing square; the line art's patch swapped.
function load({ file, patch }) {
  const src = readFileSync(DIR + file, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
  const [, , vw, vh] = src.match(/viewBox="([^"]*)"/)[1].split(/[ ,]+/).map(Number)
  const stops = Object.fromEntries([...src.matchAll(/<linearGradient id="([^"]*)"[^>]*>\s*<stop[^>]*stop-color="([^"]*)"/g)].map((m) => [m[1], m[2]]))
  const paths = [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => {
    const fill = m[1].match(/fill="([^"]*)"/)[1]
    const grad = fill.match(/url\(#([^)]*)\)/)
    return { colour: grad ? stops[grad[1]] : fill, d: m[1].match(/ d="([^"]*)"/)[1] }
  })
  const shapes = []
  paths.forEach((p, i) => {
    const [x0, y0, x1, y1] = box(p.d)
    if (x1 - x0 >= vw * 0.98 && y1 - y0 >= vh * 0.98) return // the backing square
    if (patch?.drop.includes(i)) return
    shapes.push({ shade: shade(p.colour), colour: p.colour, draw: (fill) => `<path fill="${fill}" d="${p.d}"/>` })
    if (patch && i === patch.face) {
      if (box(p.d).some((v, k) => Math.abs(v - patch.box[k]) > 2)) throw new Error(`${file}: path ${i} is not the cap patch any more (new download?)`)
      const [px0, py0, px1, py1] = patch.box, inset = (py1 - py0) * 0.09
      shapes.push({ shade: 'dark', colour: NAVY, draw: (fill) => `<g transform="rotate(-3 ${fmt((px0 + px1) / 2)} ${fmt((py0 + py1) / 2)})">${cottage(fill, [px0, py0 + inset, px1, py1 - inset])}</g>` })
    }
  })
  return { vw, vh, shapes }
}
const arts = Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, load(s)]))
// The art's box: every shape rendered, then trimmed.
for (const a of Object.values(arts)) {
  const all = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.vw}" height="${a.vh}" viewBox="0 0 ${a.vw} ${a.vh}">${a.shapes.map((s) => s.draw('#000')).join('')}</svg>`
  const { info } = await sharp(Buffer.from(all), { density: 72 }).trim().toBuffer({ resolveWithObject: true })
  a.box = { x: -info.trimOffsetLeft, y: -info.trimOffsetTop, w: info.width, h: info.height }
}
// The printed parts in their inks, the rest cut out (mask), as a nested <svg> w inches wide at (x, y) inches.
// inks 'as drawn': every shape in its own colour, nothing cut out.
function printed(a, inks, { x = 0, y = 0, w }) {
  const { box: b } = a, h = (w * b.h) / b.w
  const area = `x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"`
  const inkOf = (sh) => (inks === 'as drawn' ? sh.colour : typeof inks === 'function' ? inks(sh) : inks[sh.shade])
  const mask = a.shapes.map((sh) => sh.draw(inkOf(sh) ? '#fff' : '#000')).join('')
  const ink = a.shapes.filter(inkOf).map((sh) => sh.draw(inkOf(sh))).join('')
  return { w, h, svg: `<svg x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">` +
    `<defs><mask id="cut" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${mask}</mask></defs><g mask="url(#cut)">${ink}</g></svg>` }
}
const page = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}in" height="${fmt(h)}in" viewBox="0 0 ${fmt(w)} ${fmt(h)}">${body}</svg>`
// librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
const png = (svg, w) => sharp(Buffer.from(svg), { density: Math.sqrt(72 * DPI * 1.5) }).resize({ width: Math.round(w * DPI), kernel: 'lanczos3' })
  .withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()

const prints = {}
for (const [name, { art, inks, chest, w = PRINT_IN }] of Object.entries(PRINTS)) {
  const p = printed(arts[art], inks, { w })
  const svg = page(p.w, p.h, p.svg)
  writeFileSync(`${DIR}mascot-${name}.svg`, svg)
  svgToPdf(svg, p.w, p.h, `${DIR}mascot-${name}.pdf`)
  prints[name] = await png(svg, p.w)
  writeFileSync(`${DIR}mascot-${name}.png`, prints[name])
  if (chest) {
    const c = printed(arts[art], inks, { w: chest })
    writeFileSync(`${DIR}mascot-${name}-chest.png`, await png(page(c.w, c.h, c.svg), c.w))
  }
  console.log(`mascot-${name}: ${fmt(p.w)} x ${fmt(p.h)} in${chest ? `, chest ${chest} in` : ''}`)
}

// --- mockups (60 px per inch) ---
const PPI = 60
const T = (s, opts) => { // a line of text in inches
  const g = glyphs(s, opts.font, opts.location)
  const t = textLine(s, { ...opts, em: (opts.cap * g.upem) / g.capHeight })
  return t
}
const TEE = 'M2.6 1.6 L8.4 0.9 Q11 3.3 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z'
const shirt = (fill, edge, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${22 * PPI}" height="${28 * PPI}" viewBox="0 0 22 28"><rect width="22" height="28" fill="#e9ebf0"/>` +
  `<path d="${TEE}" fill="${fill}" stroke="${edge}" stroke-width="0.06" stroke-linejoin="round"/>${extra}</svg>`
const POLO_BITS = (fill, edge) => `<rect x="10.5" y="2.2" width="1" height="5.2" rx="0.1" fill="${fill}" stroke="${edge}" stroke-width="0.06"/>` +
  `<circle cx="11" cy="4.1" r="0.17" fill="${edge}"/><circle cx="11" cy="5.9" r="0.17" fill="${edge}"/>` +
  `<path d="M8.4 0.9 L11 2.2 L9.7 3.9 L7.5 1.3 Z M13.6 0.9 L11 2.2 L12.3 3.9 L14.5 1.3 Z" fill="${fill}" stroke="${edge}" stroke-width="0.08" stroke-linejoin="round"/>`
const BACK_NECK = (edge) => `<path d="M8.4 0.9 Q11 1.7 13.6 0.9" fill="none" stroke="${edge}" stroke-width="0.28"/>`
const label = (s) => `<text x="0.4" y="27.7" font-family="sans-serif" font-size="0.5" fill="#555b6b">${s}</text>`
const at = async (base, art, w, x, y, rotate = 0) => {
  let a = await sharp(art).resize({ width: Math.round(w * PPI) }).png().toBuffer()
  if (rotate) a = await sharp(a).rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const { width, height } = await sharp(a).metadata()
  return sharp(base).composite([{ input: a, left: Math.round(x * PPI - width / 2), top: Math.round(y * PPI - height / 2) }]).png().toBuffer()
}
// The name under a back print, in the logo's Fraunces and the tagline in Inter.
const backName = (ink, y) => {
  const name = T('Christmas Light Creations', { font: FONTS.fraunces, location: { opsz: 144, wght: 900 }, cap: 0.62, tracking: 0, fill: ink })
  const tag = T('PEARLAND, TX  ·  EST. 2011', { font: FONTS.inter, location: { wght: 800 }, cap: 0.26, tracking: 0.16, fill: ink })
  return name.svg(11, y, 'middle') + tag.svg(11, y + 0.85, 'middle')
}
// A tee seen from the back: the portrait w inches wide, its top 3 in below the collar, the name an inch under it.
const backTee = async (fill, edge, ink, art, w, note) => {
  const { width, height } = await sharp(art).metadata()
  const h = (w * height) / width, top = 3.4
  const name = ink ? backName(ink, top + h + 1.15) : '' // no ink: the art carries the name itself
  const base = await sharp(Buffer.from(shirt(fill, edge, BACK_NECK(edge) + name + label(note)))).png().toBuffer()
  return at(base, art, w, 11, top + h / 2)
}
const tiles = [
  // 1. navy polo, him on the left sleeve (seen from the front: the sleeve on the right of the picture)
  await at(await sharp(Buffer.from(shirt('#152040', '#0b1430', POLO_BITS('#152040', '#0b1430') + label('navy polo: left sleeve, 2.25 in')))).png().toBuffer(),
    prints['line-on-navy'], 2.25, 20.1, 4.6, 28),
  // 2. navy tee back: the gold portrait over the name
  await backTee('#152040', '#0b1430', GOLD, prints['gold-on-navy'], 10, 'navy tee, back: 10 in'),
  // 3. mustard tee back: the line art in navy over the name
  await backTee('#C9911F', '#a87a17', NAVY, prints['line-on-light'], 10, 'mustard tee, back: 10 in'),
]
// 4. a cap with his face laser-engraved on a leather patch
{
  const P = printed(arts.line, { dark: '#3d2614', light: null, gold: null }, { w: 2.3 })
  const cap = `<svg xmlns="http://www.w3.org/2000/svg" width="${22 * PPI}" height="${28 * PPI}" viewBox="0 0 22 28"><rect width="22" height="28" fill="#e9ebf0"/>` +
    `<path d="M3.5 15 Q3.2 5.5 11 5 Q18.8 5.5 18.5 15 Z" fill="#20242e" stroke="#11141b" stroke-width="0.08"/>` +
    `<path d="M11 5.05 L11 15" stroke="#11141b" stroke-width="0.06"/><circle cx="11" cy="5.2" r="0.35" fill="#2b303b"/>` +
    `<path d="M2.2 15.2 Q11 13.6 19.8 15.2 Q20.6 18.4 11 18.9 Q1.4 18.4 2.2 15.2 Z" fill="#2b303b" stroke="#11141b" stroke-width="0.08"/>` +
    `<rect x="8.9" y="7.6" width="4.2" height="4.4" rx="0.5" fill="#b07a45" stroke="#7a5230" stroke-width="0.05"/>` +
    `<rect x="9.05" y="7.75" width="3.9" height="4.1" rx="0.4" fill="none" stroke="#5c3b1f" stroke-width="0.04" stroke-dasharray="0.12 0.08"/>` +
    `<g transform="translate(${fmt(11 - P.w / 2)} ${fmt(9.8 - P.h / 2)})">${P.svg}</g>${label('cap: laser-engraved leather patch, 2.3 in')}</svg>`
  tiles.push(await sharp(Buffer.from(cap)).png().toBuffer())
}
// 5–6. the medal: a navy tee's left chest (4 in) and its back (10 in)
tiles.push(await at(await sharp(Buffer.from(shirt('#152040', '#0b1430', label('navy tee, left chest: 4 in')))).png().toBuffer(), prints['medal-on-navy'], 4, 14.6, 6.4))
tiles.push(await backTee('#152040', '#0b1430', null, prints['medal-on-navy'], 10, 'navy tee, back: 10 in'))
const crop = { left: 0, top: 0, width: 22 * PPI, height: 22 * PPI }
const cut = await Promise.all(tiles.map((t) => sharp(t).extract(crop).resize({ width: 660 }).png().toBuffer()))
await sharp({ create: { width: 670 * 3 - 10, height: 670 * 2 - 10, channels: 3, background: '#3b3f4b' } })
  .composite(cut.map((input, i) => ({ input, left: (i % 3) * 670, top: Math.floor(i / 3) * 670 }))).png().toFile(`${DIR}mascot-mockups.png`)
console.log('mascot-mockups.png: polo sleeve, navy and mustard tee backs, leather-patch cap, the medal on chest and back')

// --- the hat (owner, 2026-10-16: "a trucker style / fishing / outdoor hat with this patch and probably some
// stitching or smaller leather patches"): the line art on an arched twill patch for the front (the shape of his
// Recraft patch mockup, our cottage on the cap), a small leather patch with the cottage for the side, a mockup.
const HAT = { w: 2.75, h: 3.25, border: 0.11, twill: '#EFE6D2', thread: '#1C2B44' }
const LEATHER = { w: 1.6, h: 1.1, hide: '#B07A45', edge: '#7A5230', burn: '#3D2614' }
// The arched patch: a half-circle top, straight sides, rounded bottom corners; i insets it (the border's inner edge).
const archPath = (w, h, i, c = 0.28) => {
  const r = w / 2 - i
  return `M${fmt(i)} ${fmt(w / 2)} A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(w - i)} ${fmt(w / 2)} L${fmt(w - i)} ${fmt(h - i - c)} ` +
    `Q${fmt(w - i)} ${fmt(h - i)} ${fmt(w - i - c)} ${fmt(h - i)} L${fmt(i + c)} ${fmt(h - i)} Q${fmt(i)} ${fmt(h - i)} ${fmt(i)} ${fmt(h - i - c)} Z`
}
function hatPatch() {
  const { w, h, border, twill, thread } = HAT
  const artW = w * 1.06 // shoulders run off the bottom edge, as on his patch; a sliver of twill above the cap
  const art = printed(arts.line, { dark: thread, light: null, gold: null }, { x: (w - artW) / 2, y: 0.3, w: artW })
  return `<defs><clipPath id="inside"><path d="${archPath(w, h, border)}"/></clipPath></defs>` +
    `<path d="${archPath(w, h, 0)}" fill="${thread}"/><path d="${archPath(w, h, border)}" fill="${twill}"/><g clip-path="url(#inside)">${art.svg}</g>`
}
// The leather patch: the cottage and EST. 2011 burned in. engrave: the laser file (black art, red hairline cut line).
function leatherPatch(engrave = false) {
  const { w, h, hide, edge, burn } = LEATHER
  const ink = engrave ? '#000' : burn
  const est = T('EST. 2011', { font: FONTS.inter, location: { wght: 800 }, cap: 0.1, tracking: 0.2, fill: ink })
  const shape = engrave
    ? `<rect x="0.005" y="0.005" width="${fmt(w - 0.01)}" height="${fmt(h - 0.01)}" rx="0.14" fill="none" stroke="#FF0000" stroke-width="0.003"/>`
    : `<rect width="${w}" height="${h}" rx="0.14" fill="${hide}" stroke="${edge}" stroke-width="0.03"/>` +
      `<rect x="0.07" y="0.07" width="${fmt(w - 0.14)}" height="${fmt(h - 0.14)}" rx="0.1" fill="none" stroke="${burn}" stroke-width="0.014" stroke-dasharray="0.05 0.035"/>`
  return shape + cottage(ink, [w / 2, 0.13, w / 2, 0.8]) + est.svg(w / 2, 0.98, 'middle')
}
for (const [name, w, h, body] of [['hat-patch', HAT.w, HAT.h, hatPatch()], ['hat-leather', LEATHER.w, LEATHER.h, leatherPatch()], ['hat-leather-engrave', LEATHER.w, LEATHER.h, leatherPatch(true)]]) {
  const svg = page(w, h, body)
  writeFileSync(`${DIR}mascot-${name}.svg`, svg)
  svgToPdf(svg, w, h, `${DIR}mascot-${name}.pdf`)
  prints[name] = await png(svg, w)
  writeFileSync(`${DIR}mascot-${name}.png`, prints[name])
  console.log(`mascot-${name}: ${w} x ${h} in`)
}
// A trucker cap from the front (the patch) and from the left side (the leather patch where the front panel wraps
// round; the rest of the side and the back are mesh).
{
  const crown = '#1D2A44', dark = '#111a2e', mesh = '#ECEAE3'
  const hat = `<svg xmlns="http://www.w3.org/2000/svg" width="${26 * PPI}" height="${11 * PPI}" viewBox="0 0 26 11"><rect width="26" height="11" fill="#e9ebf0"/>` +
    `<defs><pattern id="mesh" width="0.16" height="0.16" patternUnits="userSpaceOnUse"><rect width="0.16" height="0.16" fill="${mesh}"/><circle cx="0.08" cy="0.08" r="0.04" fill="#b9b6ac"/></pattern></defs>` +
    // front view
    `<path d="M2.5 7.2 C2.5 3.3 4.3 2.2 6.5 2.2 C8.7 2.2 10.5 3.3 10.5 7.2 Z" fill="${crown}" stroke="${dark}" stroke-width="0.06"/>` +
    `<circle cx="6.5" cy="2.25" r="0.2" fill="${crown}" stroke="${dark}" stroke-width="0.04"/>` +
    `<path d="M1.5 7.2 Q6.5 6.3 11.5 7.2 Q12 9.2 6.5 9.6 Q1 9.2 1.5 7.2 Z" fill="${dark}"/>` +
    // side view (brim to the left): mesh crown, the front panel over it, the brim
    `<path d="M14.6 7.2 C14.6 3.8 16.3 2.3 18.9 2.3 C21.6 2.3 23.7 3.8 23.9 7.2 Z" fill="url(#mesh)" stroke="${dark}" stroke-width="0.06"/>` +
    `<path d="M14.6 7.2 C14.6 3.8 16.3 2.3 18.9 2.3 C18.4 4 18.2 5.6 18.3 7.2 Z" fill="${crown}" stroke="${dark}" stroke-width="0.06"/>` +
    `<rect x="22.6" y="6.3" width="1.3" height="0.6" rx="0.1" fill="${dark}"/>` +
    `<path d="M14.8 7.1 Q12.6 7.2 11.6 8.3 Q13.4 8.6 15.4 7.6 Z" fill="${dark}"/>` +
    `<text x="0.4" y="10.7" font-family="sans-serif" font-size="0.42" fill="#555b6b">trucker cap: arched patch 2.75 x 3.25 in front; leather 1.6 x 1.1 in side</text></svg>`
  let out = await at(await sharp(Buffer.from(hat)).png().toBuffer(), prints['hat-patch'], HAT.w, 6.5, 2.7 + HAT.h / 2)
  out = await at(out, prints['hat-leather'], LEATHER.w, 16.4, 5.4, -8)
  await sharp(out).png().toFile(`${DIR}mascot-hat.png`)
  console.log('mascot-hat.png: trucker cap, front and side')
}
