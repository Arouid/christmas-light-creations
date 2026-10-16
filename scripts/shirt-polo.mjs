// Left-chest marks for the sales polos, made for embroidery: two thread colours, no line thinner than 3 pt, no
// letters under 0.15 in, no snowflakes or specks. Three marks, each for a navy polo (white and gold thread) and a
// white polo (navy and dark-gold thread):
// - wordmark: "Christmas Light / Creations" in Fraunces (the logo's lettering), PEARLAND, TX under it; text only.
// - caps: CHRISTMAS LIGHT / CREATIONS in Inter ExtraBold, the second line spaced out in gold, EST. 2011 between
//   two rules; text only.
// - logo: the cottage (one colour, sketch lines and flakes dropped) beside the Fraunces name: the horizontal logo
//   made stitchable.
// Run: node scripts/shirt-polo.mjs   → assets-source/shirts/designs/polo-*.{png,svg,pdf}, mockup-polo-*.png and
// mockup-polo-sheet.png (all six on polos). The embroidery shop digitizes the SVG or PDF into stitches.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COLORS, FONTS, NAVY_ROLES, WHITE_ROLES, checkRoles, fmt, glyphs, parseLogo, prepCottage, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const OUT = fileURLToPath(new URL('../assets-source/shirts/designs/', import.meta.url))
const U = 100 // SVG units per inch
const DPI = 300
const MIN_PT = 3 // thinnest line at stitch size (about 1 mm, a satin column)
const SERIF = { opsz: 144, wght: 900 }
const EDGE = 0.03 // in: margin round each mark, so round letters and strokes aren't clipped
const HAIRLINE = 0.012 // in: Fraunces' thin strokes thickened by this (same-colour outline) so they stitch
const { navyDeep: NAVY, white: WHITE, gold: GOLD } = COLORS
const POLOS = {
  navy: { tee: '#152040', edge: '#0b1430', ink: WHITE, accent: GOLD, art: 'white' },
  white: { tee: '#f6f6f3', edge: '#c9ced8', ink: NAVY, accent: '#b8862b', art: 'navy' }, // dark gold: #ffcf4d vanishes on white
}
const LOGO = { white: { logo: parseLogo('clc-cottage-one-color-white.svg'), roles: WHITE_ROLES }, navy: { logo: parseLogo('clc-cottage-one-color-navy.svg') } }
LOGO.navy.roles = LOGO.navy.logo.paths.length === 12 ? NAVY_ROLES : WHITE_ROLES
for (const l of Object.values(LOGO)) checkRoles(l.logo, l.roles)

function text(str, { cap, font = FONTS.inter, location = { wght: 800 }, fill, tracking = 0.04, hairline = 0 }) {
  const g = glyphs(str, font, location)
  const em = (cap * U * g.upem) / g.capHeight
  const t = textLine(str, { font, location, em, tracking, fill, stroke: hairline ? fill : undefined, strokeWidth: hairline * U })
  return { width: t.width / U, at: (x, y, anchor = 'start') => t.svg(x * U, y * U, anchor) }
}
// The width a line set at cap would take (to size a line to a width).
const capFor = (str, width, opts) => (width / text(str, { ...opts, cap: 1, fill: '#000' }).width)
const rule = (x1, x2, y, colour, pt = MIN_PT) => `<line x1="${fmt(x1 * U)}" y1="${fmt(y * U)}" x2="${fmt(x2 * U)}" y2="${fmt(y * U)}" stroke="${colour}" stroke-width="${fmt((pt / 72) * U)}" stroke-linecap="round"/>`
function cottage(kind, { x, y, w }) {
  const { logo, roles } = LOGO[kind]
  const vb = logo.viewBox
  const h = (w * vb.h) / vb.w
  const minUnits = (MIN_PT / 72) * (vb.w / w)
  const c = prepCottage(logo, roles, { minUnits, look: 'white', drop: ['specks', 'snow', 'wallLines', 'doorLines', 'postHighlights'] })
  return { h, svg: `<svg x="${fmt(x * U)}" y="${fmt(y * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${c.svg}</svg>` }
}

const marks = {
  wordmark: (P) => {
    const w = 3.5
    const cap = capFor('Christmas Light', w, { font: FONTS.fraunces, location: SERIF, tracking: 0 })
    const serif = { cap, font: FONTS.fraunces, location: SERIF, tracking: 0, hairline: HAIRLINE }
    const b1 = cap, b2 = b1 + cap * 1.32, b3 = b2 + 0.3 + 0.15
    return { w, h: b3 + 0.02, body: [
      text('Christmas Light', { ...serif, fill: P.ink }).at(w / 2, b1, 'middle'),
      text('Creations', { ...serif, fill: P.accent }).at(w / 2, b2, 'middle'),
      text('PEARLAND, TX', { cap: 0.15, fill: P.ink, tracking: 0.22 }).at(w / 2, b3, 'middle'),
    ] }
  },
  caps: (P) => {
    const w = 3.5
    const cap = capFor('CHRISTMAS LIGHT', w, { tracking: 0.04 })
    const b1 = cap, b2 = b1 + cap * 1.3, b3 = b2 + 0.28 + 0.15
    const est = text('EST. 2011', { cap: 0.15, fill: P.ink, tracking: 0.2 })
    const gap = 0.12, mid = b3 - 0.075
    return { w, h: b3 + 0.02, body: [
      text('CHRISTMAS LIGHT', { cap, fill: P.ink, tracking: 0.04 }).at(w / 2, b1, 'middle'),
      text('CREATIONS', { cap, fill: P.accent, tracking: 0.28 }).at(w / 2, b2, 'middle'),
      est.at(w / 2, b3, 'middle'),
      rule(0.03, w / 2 - est.width / 2 - gap, mid, P.accent),
      rule(w / 2 + est.width / 2 + gap, w - 0.03, mid, P.accent),
    ] }
  },
  logo: (P) => {
    const w = 4.25, cw = 1.3, gap = 0.18, tx = cw + gap, tw = w - tx
    const c = cottage(P.art, { x: 0, y: 0, w: cw })
    const cap = capFor('Christmas Light', tw, { font: FONTS.fraunces, location: SERIF, tracking: 0 })
    const serif = { cap, font: FONTS.fraunces, location: SERIF, tracking: 0, hairline: HAIRLINE }
    const block = cap * 2.32 + 0.27 + 0.15 // two name lines and the town line
    const top = Math.max(0, (c.h - block) / 2 + 0.06)
    const b1 = top + cap, b2 = b1 + cap * 1.32, b3 = b2 + 0.27 + 0.15
    return { w, h: Math.max(c.h, b3 + 0.02), body: [
      c.svg,
      text('Christmas Light', { ...serif, fill: P.ink }).at(tx, b1),
      text('Creations', { ...serif, fill: P.accent }).at(tx, b2),
      text('PEARLAND, TX', { cap: 0.15, fill: P.ink, tracking: 0.22 }).at(tx + 0.02, b3),
    ] }
  },
}

// A polo (collar, placket, two buttons), the mark on the left chest.
async function mockup(name, P, w, png) {
  const PPI = 60, W = 22 * PPI, H = 28 * PPI
  const polo = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 22 28"><rect width="22" height="28" fill="#e9ebf0"/>` +
    `<path d="M2.6 1.6 L8.4 0.9 Q11 2.4 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z" fill="${P.tee}" stroke="${P.edge}" stroke-width="0.06" stroke-linejoin="round"/>` +
    `<path d="M0.2 6.6 L2.8 8.4 M21.8 6.6 L19.2 8.4" stroke="${P.edge}" stroke-width="0.5"/>` +
    `<rect x="10.5" y="2.2" width="1" height="5.2" rx="0.1" fill="${P.tee}" stroke="${P.edge}" stroke-width="0.06"/>` +
    `<circle cx="11" cy="4.1" r="0.17" fill="${P.edge}"/><circle cx="11" cy="5.9" r="0.17" fill="${P.edge}"/>` +
    `<path d="M8.4 0.9 L11 2.2 L9.7 3.9 L7.5 1.3 Z M13.6 0.9 L11 2.2 L12.3 3.9 L14.5 1.3 Z" fill="${P.tee}" stroke="${P.edge}" stroke-width="0.08" stroke-linejoin="round"/>` +
    `<text x="0.4" y="27.9" font-family="sans-serif" font-size="0.42" fill="#555b6b">${name}: ${w} in wide, left chest</text></svg>`
  const art = await sharp(png).resize({ width: Math.round(w * PPI) }).png().toBuffer()
  const out = await sharp(Buffer.from(polo)).composite([{ input: art, left: Math.round((15.1 - w / 2) * PPI), top: Math.round(4.4 * PPI) }])
    .png({ palette: true, compressionLevel: 9 }).toBuffer()
  await sharp(out).toFile(`${OUT}mockup-${name}.png`)
  return out
}

const made = []
for (const [key, make] of Object.entries(marks)) {
  for (const [polo, P] of Object.entries(POLOS)) {
    const m = make(P), body = m.body
    const w = m.w + 2 * EDGE, h = m.h + 2 * EDGE
    const name = `polo-${key}-on-${polo}`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}in" height="${fmt(h)}in" viewBox="${fmt(-EDGE * U)} ${fmt(-EDGE * U)} ${fmt(w * U)} ${fmt(h * U)}">${body.join('\n')}</svg>`
    writeFileSync(`${OUT}${name}.svg`, svg)
    svgToPdf(svg, w, h, `${OUT}${name}.pdf`)
    // librsvg turns the inch size into pixels at the density and sharp scales by density/72 again: render big, size down.
    const png = await sharp(await sharp(Buffer.from(svg), { density: DPI }).ensureAlpha().png().toBuffer())
      .resize(Math.round(w * DPI), Math.round(h * DPI), { fit: 'fill' }).withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
    writeFileSync(`${OUT}${name}.png`, png)
    made.push(await mockup(name, P, w, png))
    console.log(`${name}: ${fmt(w)} x ${fmt(h)} in, ${Math.round(w * DPI)}x${Math.round(h * DPI)} px`)
  }
}
// The six mockups, cropped to the chest, in one sheet: a row per mark, navy polo left, white right.
const PPI = 60, crop = { left: 7 * PPI, top: 0, width: 13 * PPI, height: 9.5 * PPI }
const tiles = await Promise.all(made.map((m) => sharp(m).extract(crop).png().toBuffer()))
await sharp({ create: { width: crop.width * 2 + 10, height: (crop.height + 10) * 3 - 10, channels: 3, background: '#3b3f4b' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % 2) * (crop.width + 10), top: Math.floor(i / 2) * (crop.height + 10) })))
  .png({ palette: true, compressionLevel: 9 }).toFile(`${OUT}mockup-polo-sheet.png`)
console.log('mockup-polo-sheet.png: wordmark, caps, logo (rows) on navy and white polos')
