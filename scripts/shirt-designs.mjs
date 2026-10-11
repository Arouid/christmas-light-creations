// More t-shirt designs from the vector art (the cottage, the 2012 trees and sign, the whole
// scene), beyond the plain logo in shirt-art.mjs: arched and stacked type, a round badge, a
// sunburst with a ribbon, a string of C9 bulbs, a crew back, in the brand fonts (Fraunces,
// Inter) and a few Windows display faces (Impact, Bahnschrift condensed, Georgia Bold).
// Run: node scripts/shirt-designs.mjs   → assets-source/shirts/designs/ (not shipped)
//
// Each design: <name>.png (300 dpi, transparent, print size: the Uberprints upload),
// <name>.svg and <name>.pdf (vector, text as outlines: for a screen printer) and
// mockup-<name>.png on a tee. Most designs come twice: "-on-navy" (white and gold ink,
// colour art) and "-on-gold" for a yellow/gold shirt (navy ink, one-colour navy art,
// berry-red accents). Lines are kept at 2 pt or more at print size, as on the shirts.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COLORS, COLOR_ROLES, FONTS, NAVY_ROLES, WHITE_ROLES, checkRoles, flattenArt, fmt, glyphs, parseArt, parseLogo, prepCottage, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const OUT = fileURLToPath(new URL('../assets-source/shirts/designs/', import.meta.url))
const U = 100 // SVG units per inch
const DPI = 300
const MIN_PT = 2 // thinnest line at print size (garment printing)

// Fonts: the site's own (outlined by scripts/lib/text-outlines.py) and Windows display faces when present.
const SYS = (f) => (existsSync('C:/Windows/Fonts/' + f) ? 'C:/Windows/Fonts/' + f : null)
const FONT = { fraunces: FONTS.fraunces, inter: FONTS.inter, impact: SYS('impact.ttf') || FONTS.inter, bahn: SYS('bahnschrift.ttf') || FONTS.inter, georgia: SYS('georgiab.ttf') || FONTS.fraunces }
const IMPACT = SYS('impact.ttf') ? { wght: 400 } : { wght: 800 }
const COND = SYS('bahnschrift.ttf') ? { wght: 700, wdth: 75 } : { wght: 800 } // Bahnschrift Bold Condensed
const SLAB = SYS('georgiab.ttf') ? { wght: 700 } : { opsz: 144, wght: 900 }
const DISPLAY = { opsz: 144, wght: 900 }, SOFT = { opsz: 9, wght: 700 }, ITAL = { opsz: 144, wght: 600 }

const { navyDeep: NAVY, white: WHITE, gold: GOLD, pale: PALE, magenta: MAGENTA, green: GREEN } = COLORS
const INK = '#0a1530', RED = '#ff3a3a', BERRY = '#b51d31', HOLLY = '#1f8a5b', CYAN = '#4ad1e0', NIGHT800 = '#12214a', NIGHT700 = '#1c2f63'
// What goes on which shirt.
const SHIRTS = {
  navy: { tee: '#152040', teeEdge: '#0b1430', ink: WHITE, accent: GOLD, soft: PALE, rays: NIGHT800, ribbon: GOLD, ribbonDark: '#c99a2e', ribbonInk: NAVY, art: 'white', bulbs: [RED, GOLD, GREEN, MAGENTA, CYAN, RED, GOLD] },
  gold: { tee: '#f2b63a', teeEdge: '#d39a22', ink: NAVY, accent: BERRY, soft: INK, rays: '#d9a021', ribbon: NAVY, ribbonDark: '#02060f', ribbonInk: WHITE, art: 'navy', bulbs: [BERRY, NAVY, HOLLY, MAGENTA, NIGHT700, BERRY, HOLLY] },
}

// --- art ---
const LOGO = {
  color: { logo: checkRoles(parseLogo('clc-cottage-color.svg'), COLOR_ROLES), roles: COLOR_ROLES, look: 'flat' },
  white: { logo: checkRoles(parseLogo('clc-cottage-one-color-white.svg'), WHITE_ROLES), roles: WHITE_ROLES, look: 'white' },
  navy: { logo: parseLogo('clc-cottage-one-color-navy.svg'), look: 'white' }, // solid roof: same 10 paths as the white file
}
LOGO.navy.roles = LOGO.navy.logo.paths.length === 12 ? NAVY_ROLES : WHITE_ROLES
checkRoles(LOGO.navy.logo, LOGO.navy.roles)
const arts = {}
const nested = (vb, x, y, w, h, content) => `<svg x="${fmt(x * U)}" y="${fmt(y * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${content}</svg>`

// The cottage, kind 'color' | 'white' | 'navy', w inches wide; small: card-size rules (no specks, big flakes only).
function cottage(kind, { x, y, w, small = false }) {
  const { logo, roles, look } = LOGO[kind]
  const vb = logo.viewBox
  const h = (w * vb.h) / vb.w
  const minUnits = (MIN_PT / 72) * (vb.w / w)
  const c = prepCottage(logo, roles, { minUnits, look, drop: small ? ['specks', 'wallLines', 'doorLines', 'postHighlights'] : ['specks'], keepFlakeMin: small ? 100 : 0 })
  return { h, svg: nested(vb, x, y, w, h, c.svg) }
}
// The trees, the sign or the scene (sign-and-trees/*.svg), glow drawn solid; flip mirrors it.
function art(file, { x, y, w, flip = false }) {
  arts[file] ??= parseArt('sign-and-trees/' + file)
  const a = arts[file]
  const vb = a.viewBox
  const h = (w * vb.h) / vb.w
  const inner = flattenArt(a.inner)
  return { h, svg: nested(vb, x, y, w, h, flip ? `<g transform="translate(${fmt(2 * vb.x + vb.w)} 0) scale(-1 1)">${inner}</g>` : inner) }
}

// --- type ---
function text(str, { cap, fit, font = FONT.inter, location = { wght: 800 }, fill = WHITE, tracking = 0.04, stroke, strokeWidth } = {}) {
  const g = glyphs(str, font, location)
  const em = cap ? (cap * U * g.upem) / g.capHeight : undefined
  const t = textLine(str, { font, location, em, fitWidth: fit ? fit * U : undefined, tracking, fill, stroke, strokeWidth: strokeWidth && strokeWidth * U })
  return { width: t.width / U, cap: t.cap / U, at: (x, y, anchor = 'start') => t.svg(x * U, y * U, anchor) }
}
// A line of text along a circle: baseline on the circle of radius r (inches) centred on (cx, cy), centred at the
// top (reading clockwise, letters outside the circle) or, with bottom, at the bottom (upright, letters inside).
function arcText(str, { cx, cy, r, cap, font = FONT.inter, location = { wght: 800 }, fill = WHITE, tracking = 0.08, bottom = false, stroke, strokeWidth }) {
  const g = glyphs(str, font, location)
  const em = (cap * U * g.upem) / g.capHeight
  const s = em / g.upem
  const steps = g.glyphs.map((gl) => gl.advance * s + tracking * em)
  const total = steps.reduce((a, b) => a + b, 0) - tracking * em
  const R = r * U
  const dir = bottom ? -1 : 1
  let a = (bottom ? Math.PI / 2 : -Math.PI / 2) - (dir * (total / 2)) / R
  const parts = []
  g.glyphs.forEach((gl, i) => {
    const px = cx * U + R * Math.cos(a), py = cy * U + R * Math.sin(a)
    const rot = (a * 180) / Math.PI + (bottom ? -90 : 90)
    if (gl.d) parts.push(`<path transform="translate(${fmt(px)} ${fmt(py)}) rotate(${fmt(rot)}) scale(${s} ${-s})" d="${gl.d}"/>`)
    a += (dir * steps[i]) / R
  })
  const paint = stroke ? ` stroke="${stroke}" stroke-width="${fmt(strokeWidth * U)}" stroke-linejoin="round"` : ''
  return `<g fill="${fill}"${paint}>${parts.join('')}</g>`
}
// Arched text with an outline behind it (two layers, so the outline never thins the letters).
function arcOutlined(str, opts, outline, width) {
  return arcText(str, { ...opts, fill: outline, stroke: outline, strokeWidth: width }) + arcText(str, opts)
}

// --- shapes (inches) ---
const circle = (cx, cy, r, fill, stroke, sw) => `<circle cx="${fmt(cx * U)}" cy="${fmt(cy * U)}" r="${fmt(r * U)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${fmt(sw * U)}"` : ''}/>`
function star(cx, cy, r, fill) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r, a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${fmt((cx + rr * Math.cos(a)) * U)},${fmt((cy + rr * Math.sin(a)) * U)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`
}
function rays(cx, cy, r, n, fill, id) {
  const w = []
  for (let i = 0; i < n; i += 2) {
    const a0 = (i * 2 * Math.PI) / n, a1 = ((i + 1) * 2 * Math.PI) / n
    w.push(`<path d="M${fmt(cx * U)} ${fmt(cy * U)} L${fmt((cx + 2 * r * Math.cos(a0)) * U)} ${fmt((cy + 2 * r * Math.sin(a0)) * U)} L${fmt((cx + 2 * r * Math.cos(a1)) * U)} ${fmt((cy + 2 * r * Math.sin(a1)) * U)} Z"/>`)
  }
  return `<clipPath id="${id}">${circle(cx, cy, r, '#000')}</clipPath><g fill="${fill}" clip-path="url(#${id})">${w.join('')}</g>`
}
function ribbon(cx, y, w, h, fill, dark) {
  const x0 = cx - w / 2, x1 = cx + w / 2, d = h * 0.25, t = h * 0.55
  const poly = (p) => `<polygon points="${p.map(([px, py]) => `${fmt(px * U)},${fmt(py * U)}`).join(' ')}" fill="${dark}"/>`
  return [
    poly([[x0 - t, y + d], [x0 + 0.2, y + d], [x0 + 0.2, y + d + h], [x0 - t, y + d + h], [x0 - t + h * 0.3, y + d + h / 2]]),
    poly([[x1 + t, y + d], [x1 - 0.2, y + d], [x1 - 0.2, y + d + h], [x1 + t, y + d + h], [x1 + t - h * 0.3, y + d + h / 2]]),
    `<rect x="${fmt(x0 * U)}" y="${fmt(y * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" fill="${fill}"/>`,
  ].join('')
}
// A C9 bulb hanging from (x, y), pointing down, about 1.9 in tall.
function bulb(x, y, colour) {
  return `<rect x="${fmt((x - 0.17) * U)}" y="${fmt(y * U)}" width="${fmt(0.34 * U)}" height="${fmt(0.28 * U)}" rx="${fmt(0.04 * U)}" fill="#4a5068"/>` +
    `<rect x="${fmt((x - 0.17) * U)}" y="${fmt((y + 0.1) * U)}" width="${fmt(0.34 * U)}" height="${fmt(0.06 * U)}" fill="#6b7290"/>` +
    `<path d="M${fmt((x - 0.16) * U)} ${fmt((y + 0.28) * U)} C${fmt((x - 0.62) * U)} ${fmt((y + 0.75) * U)} ${fmt((x - 0.5) * U)} ${fmt((y + 1.5) * U)} ${fmt(x * U)} ${fmt((y + 1.62) * U)} C${fmt((x + 0.5) * U)} ${fmt((y + 1.5) * U)} ${fmt((x + 0.62) * U)} ${fmt((y + 0.75) * U)} ${fmt((x + 0.16) * U)} ${fmt((y + 0.28) * U)} Z" fill="${colour}"/>` +
    `<ellipse cx="${fmt((x - 0.15) * U)}" cy="${fmt((y + 0.72) * U)}" rx="${fmt(0.07 * U)}" ry="${fmt(0.22 * U)}" fill="${WHITE}"/>`
}
const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}in" height="${h}in" viewBox="0 0 ${fmt(w * U)} ${fmt(h * U)}">${body.join('\n')}</svg>`

// --- the designs: each returns { w, h, body } for a shirt palette S ---
const designs = {
  // The whole 2012 scene (trees, Merry X-MAS sign, snow) under the name on an arch. Navy only.
  scene: { shirts: ['navy'], note: 'the 2012 scene, Fraunces arch', make: (S) => {
    const w = 11
    return { w, h: 13.1, body: [
      arcText('CHRISTMAS LIGHT CREATIONS', { cx: 5.5, cy: 9.5, r: 8.3, cap: 0.5, font: FONT.fraunces, location: DISPLAY, fill: S.accent, tracking: 0.05 }),
      art('clc-scene-trees-sign-color.svg', { x: 0.25, y: 3.2, w: 10.5 }).svg,
      text('PEARLAND, TX  ·  SINCE 2011', { cap: 0.34, fill: S.soft, tracking: 0.1 }).at(5.5, 12.75, 'middle'),
    ] }
  } },
  // Varsity: condensed caps on an arch, the cottage, CREATIONS straight under it.
  varsity: { shirts: ['navy', 'gold'], note: 'Bahnschrift condensed arch', make: (S) => {
    const w = 11
    const ct = S.art === 'white' ? cottage('color', { x: 3.0, y: 3.9, w: 5.0 }) : cottage('navy', { x: 3.0, y: 3.9, w: 5.0 })
    return { w, h: 12.2, body: [
      arcOutlined('CHRISTMAS LIGHT', { cx: 5.5, cy: 8.0, r: 6.0, cap: 1.05, font: FONT.bahn, location: COND, fill: S.accent, tracking: 0.05 }, S.ink === WHITE ? WHITE : NAVY, 0.1),
      ct.svg,
      text('CREATIONS', { cap: 1.05, font: FONT.bahn, location: COND, fill: S.ink, tracking: 0.08 }).at(5.5, 10.9, 'middle'),
      text('EST · 2011 · PEARLAND, TEXAS', { cap: 0.32, fill: S.soft, tracking: 0.12 }).at(5.5, 11.75, 'middle'),
    ] }
  } },
  // Round badge: rings, the name around the top, Pearland · Texas around the bottom, cottage and two pines inside.
  badge: { shirts: ['navy', 'gold'], note: 'round badge, 10 in', make: (S) => badge(S, 10) },
  badgeChest: { shirts: ['navy', 'gold'], note: 'round badge, 3.5 in left chest', make: (S) => badge(S, 3.5) },
  // The Merry X-MAS sign with a friendly line above and the name below. Navy only (the board is gold).
  sign: { shirts: ['navy'], note: 'the 2012 sign, Fraunces soft', make: (S) => {
    const w = 10
    const line1 = text('Christmas Light', { fit: 9.0, font: FONT.fraunces, location: DISPLAY, fill: S.accent, tracking: 0 })
    return { w, h: 11.5, body: [
      text('from your friends at', { cap: 0.5, font: FONT.fraunces, location: SOFT, fill: S.soft, tracking: 0.01 }).at(5, 0.9, 'middle'),
      art('clc-sign-color.svg', { x: 2.25, y: 1.4, w: 5.5 }).svg,
      line1.at(5, 9.6, 'middle'),
      text('Creations', { cap: line1.cap, font: FONT.fraunces, location: DISPLAY, fill: S.ink, tracking: 0 }).at(5, 11.0, 'middle'),
    ] }
  } },
  // Two pines flanking the name stacked in Impact. One colour: the cheap screen print.
  treepair: { shirts: ['navy', 'gold'], note: 'one colour: two pines, Impact stack', make: (S) => {
    const w = 12, tree = `clc-tree-big-one-color-${S.art}.svg`
    const lines = ['CHRISTMAS', 'LIGHT', 'CREATIONS']
    const cap = 4.2 / Math.max(...lines.map((l) => text(l, { cap: 1, font: FONT.impact, location: IMPACT, tracking: 0.02 }).width)) // the widest line spans 4.2 in
    return { w, h: 7.2, body: [
      art(tree, { x: 0.2, y: 0.4, w: 3.4 }).svg,
      art(tree, { x: 8.4, y: 0.4, w: 3.4, flip: true }).svg,
      ...lines.map((l, i) => text(l, { cap, font: FONT.impact, location: IMPACT, fill: S.ink, tracking: 0.02 }).at(6, 2.45 + i * (cap + 0.25), 'middle')),
      text('PEARLAND, TX  ·  281-819-0163', { cap: 0.36, fill: S.soft, tracking: 0.08 }).at(6, 6.75, 'middle'),
    ] }
  } },
  // Sunburst behind the cottage, the name on a ribbon in Georgia Bold.
  sunburst: { shirts: ['navy', 'gold'], note: 'sunburst and ribbon, Georgia', make: (S) => {
    const w = 11
    const ct = S.art === 'white' ? cottage('color', { x: 2.7, y: 1.6, w: 5.6 }) : cottage('navy', { x: 2.7, y: 1.6, w: 5.6 })
    return { w, h: 10.9, body: [
      rays(5.5, 4.8, 5.0, 24, S.rays, 'sun'),
      ct.svg,
      ribbon(5.5, 8.2, 9.8, 1.4, S.ribbon, S.ribbonDark),
      text('CHRISTMAS LIGHT CREATIONS', { fit: 9.2, font: FONT.georgia, location: SLAB, fill: S.ribbonInk, tracking: 0.06 }).at(5.5, 9.18, 'middle'),
      text('SINCE 2011  ·  PEARLAND, TEXAS', { cap: 0.3, fill: S.soft, tracking: 0.12 }).at(5.5, 10.45, 'middle'),
    ] }
  } },
  // Crew back: INSTALL CREW in Impact, the site's own line under it.
  crew: { shirts: ['navy', 'gold'], note: 'crew back, Impact', make: (S) => {
    const w = 12
    return { w, h: 8.4, body: [
      cottage(S.art, { x: 4.5, y: 0, w: 3.0 }).svg,
      text('INSTALL CREW', { fit: 11.5, font: FONT.impact, location: IMPACT, fill: S.ink, tracking: 0.03 }).at(6, 5.2, 'middle'),
      text('You never lift a finger.', { cap: 0.5, font: FONT.fraunces, location: ITAL, fill: S.accent, tracking: 0 }).at(6, 6.3, 'middle'),
      text('CHRISTMAS LIGHT CREATIONS  ·  PEARLAND, TX', { fit: 10.8, fill: S.soft, tracking: 0.08 }).at(6, 7.3, 'middle'),
      text('281-819-0163  ·  christmas-light-creations.com', { fit: 10.8, location: { wght: 700 }, fill: S.ink, tracking: 0.02 }).at(6, 7.95, 'middle'),
    ] }
  } },
  // A drooping string of C9 bulbs over the name.
  bulbs: { shirts: ['navy', 'gold'], note: 'string of C9 bulbs', make: (S) => {
    const w = 11
    const P0 = [0.3, 0.6], P1 = [5.5, 2.7], P2 = [10.7, 0.6]
    const q = (t) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]]
    const bulbs = S.bulbs.map((c, i) => { const [x, y] = q(0.1 + (i * 0.8) / 6); return bulb(x, y, c) })
    return { w, h: 6.6, body: [
      `<path d="M${fmt(P0[0] * U)} ${fmt(P0[1] * U)} Q${fmt(P1[0] * U)} ${fmt(P1[1] * U)} ${fmt(P2[0] * U)} ${fmt(P2[1] * U)}" fill="none" stroke="${S.soft}" stroke-width="${fmt(0.07 * U)}" stroke-linecap="round"/>`,
      ...bulbs,
      text('Christmas Light Creations', { fit: 10.2, font: FONT.fraunces, location: DISPLAY, fill: S.ink, tracking: 0 }).at(5.5, 5.35, 'middle'),
      text('PEARLAND, TX  ·  SINCE 2011', { cap: 0.3, fill: S.accent, tracking: 0.12 }).at(5.5, 6.2, 'middle'),
    ] }
  } },
}

function badge(S, size) {
  const c = size / 2, k = size / 10 // k scales the 10-in layout
  const sw = Math.max(0.03, 0.12 * k), sw2 = Math.max(0.03, 0.06 * k)
  const body = [
    circle(c, c, 4.9 * k, 'none', S.ink, sw),
    circle(c, c, 3.55 * k, 'none', S.ink, sw2),
    arcText('CHRISTMAS LIGHT CREATIONS', { cx: c, cy: c, r: 3.95 * k, cap: 0.4 * k, fill: S.ink, tracking: 0.05 }),
    arcText('PEARLAND  ·  TEXAS', { cx: c, cy: c, r: 4.55 * k, cap: 0.5 * k, fill: S.accent, tracking: 0.12, bottom: true }),
    star(c - 4.22 * k, c, 0.22 * k, S.accent),
    star(c + 4.22 * k, c, 0.22 * k, S.accent),
    cottage(S.art, { x: c - 1.8 * k, y: 2.5 * k, w: 3.6 * k, small: size < 6 }).svg,
    text('SINCE 2011', { cap: 0.26 * k, fill: S.soft, tracking: 0.14 }).at(c, 7.55 * k, 'middle'),
  ]
  if (size >= 6) body.push(art(`clc-tree-small-one-color-${S.art}.svg`, { x: c - 2.65 * k, y: 4.8 * k, w: 0.9 * k }).svg, art(`clc-tree-small-one-color-${S.art}.svg`, { x: c + 1.75 * k, y: 4.8 * k, w: 0.9 * k, flip: true }).svg)
  return { w: size, h: size, body }
}

// --- output ---
async function mockup(name, S, w, png) {
  const PPI = 60, W = 22 * PPI, H = 28 * PPI
  const tee = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 22 28"><rect width="22" height="28" fill="#e9ebf0"/>` +
    `<path d="M2.6 1.6 L8.4 0.9 Q11 3.3 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z" fill="${S.tee}" stroke="${S.teeEdge}" stroke-width="0.06" stroke-linejoin="round"/>` +
    `<path d="M8.4 0.9 Q11 3.3 13.6 0.9" fill="none" stroke="${S.teeEdge}" stroke-width="0.28"/>` +
    `<text x="0.4" y="27.9" font-family="sans-serif" font-size="0.42" fill="#555b6b">${name}: ${w} in wide, 3 in below the collar</text></svg>`
  const artPng = await sharp(png).resize({ width: Math.round(w * PPI) }).png().toBuffer()
  const top = (name.includes('chest') ? 4.2 : 5.0) * PPI
  const left = (name.includes('chest') ? 14.6 - w / 2 : 11 - w / 2) * PPI
  const out = await sharp(Buffer.from(tee)).composite([{ input: artPng, left: Math.round(left), top: Math.round(top) }]).png({ palette: true, compressionLevel: 9 }).toBuffer()
  await sharp(out).toFile(`${OUT}mockup-${name}.png`)
  return out
}

mkdirSync(OUT, { recursive: true })
const made = []
for (const [key, d] of Object.entries(designs)) {
  for (const shirt of d.shirts) {
    const S = SHIRTS[shirt]
    const { w, h, body } = d.make(S)
    const name = `${key.replace('badgeChest', 'badge-chest')}-on-${shirt}`
    const svg = doc(w, h, body)
    writeFileSync(`${OUT}${name}.svg`, svg)
    svgToPdf(svg, w, h, `${OUT}${name}.pdf`)
    const png = await sharp(Buffer.from(svg), { density: DPI }).ensureAlpha().withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
    writeFileSync(`${OUT}${name}.png`, png)
    made.push({ name, mock: await mockup(name, S, w, png) })
    console.log(`${name}: ${w} x ${h} in, ${Math.round(w * DPI)}x${Math.round(h * DPI)} px, ${Math.round(png.length / 1024)} KB  (${d.note})`)
  }
}
// Contact sheet of the mockups.
{
  const cell = 440, cols = 4, pad = 10
  const rows = Math.ceil(made.length / cols)
  const comps = await Promise.all(made.map(async ({ mock }, i) => ({
    input: await sharp(mock).resize({ width: cell - 2 * pad, height: cell - 2 * pad, fit: 'inside' }).png().toBuffer(),
    left: (i % cols) * cell + pad, top: Math.floor(i / cols) * cell + pad,
  })))
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#3b3f4b' } }).composite(comps).png({ palette: true, compressionLevel: 9 }).toFile(`${OUT}preview-sheet.png`)
  console.log(`preview-sheet.png: ${made.length} mockups`)
}
