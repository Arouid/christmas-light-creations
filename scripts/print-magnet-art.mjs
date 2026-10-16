// The truck magnet with the owner's 3D cottage (assets-source/shirts/recraft/door-magnet-clc.png, an AI render,
// 4096 x 2286, not in git). Owner, 2026-10-16, picked it ("number 2 in 4k") after the critique: lovely cottage, but
// its words were baked into the picture and the phone was about an inch tall. So only the cottage is used, cut out
// and faded into a flat background of its own colour, and the words are set in our fonts as vectors, the phone the
// biggest thing on the door. Two versions:
// - navy: the whole magnet the render's night colour, words in cream and gold (light trucks).
// - cream (owner: "can we do a cream background version of the magnets?"): a cream magnet with the cottage in a
//   round night window, words in navy and dark gold (dark trucks, or simply a lighter look).
// Run: node scripts/print-magnet-art.mjs   → recraft/vehicle-magnet-24x12-cottage-3d[-cream].{pdf,png,svg}
// (24 x 12 in, 0.75-in rounded corners; the picture embedded at about 150 dpi, the text vector).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { FONTS, fmt, glyphs, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SRC = DIR + 'door-magnet-clc.png'
const W = 24, H = 12, U = 100 // inches; SVG units per inch
// The cottage in the render (fractions of its width and height): between the baked-in title and the bottom rule.
const CROP = { x0: 0.285, x1: 0.715, y0: 0.19, y1: 0.835 } // y0 below the title's descenders
const MARGIN = 1.3, GUTTER = 1.0 // outer margin, gap between the cottage and the words
const PHONE = '281-819-0163', SITE = 'christmas-light-creations.com'
const THEMES = {
  navy: { file: 'vehicle-magnet-24x12-cottage-3d', houseH: 6.6, name: '#F3E6C8', accent: '#E2B65C', phone: '#E2B65C', site: '#F3E6C8' }, // the render's cream and gold
  cream: { file: 'vehicle-magnet-24x12-cottage-3d-cream', paper: '#F7F1E3', window: 5.0, houseH: 5.6, name: '#0C2341', accent: '#9A7020', phone: '#0C2341', site: '#3C4A63' },
}

const meta = await sharp(SRC).metadata()
const crop = { left: Math.round(CROP.x0 * meta.width), top: Math.round(CROP.y0 * meta.height), width: Math.round((CROP.x1 - CROP.x0) * meta.width), height: Math.round((CROP.y1 - CROP.y0) * meta.height) }
const cut = await sharp(SRC).extract(crop).png().toBuffer()
// The night colour: the median of the crop's top and side edges (the bottom edge is snow), so the fade meets it
// without a seam.
const edge = await sharp(cut).resize(40, 40, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
const ring = []
for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (x < 3 || y < 3 || x > 36) ring.push([0, 1, 2].map((c) => edge.data[(y * 40 + x) * 3 + c]))
const median = [0, 1, 2].map((c) => ring.map((p) => p[c]).sort((a, b) => a - b)[ring.length >> 1])
const NIGHT = '#' + median.map((v) => v.toString(16).padStart(2, '0')).join('')
// Fade: an ellipse, solid in the middle, clear at the crop's edges.
const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}"><defs><radialGradient id="f" cx="50%" cy="54%" r="54%">` +
  `<stop offset="0.62" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`)
// and a second fade over the bottom seventh, so the snow melts into the night with no edge where the picture ends.
const floor = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#b)"/></svg>`)
const art = await sharp(await sharp(cut).ensureAlpha().composite([{ input: await sharp(fade).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer())
  .composite([{ input: await sharp(floor).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer()
const href = `data:image/png;base64,${art.toString('base64')}`
// Where the cottage really is inside the crop (its snow and neon, not the dark around it), so it is placed and
// balanced by what the eye sees, not by the picture's box.
const probe = await sharp(art).resize({ width: 200 }).raw().toBuffer({ resolveWithObject: true })
let vx0 = Infinity, vy0 = Infinity, vx1 = -1, vy1 = -1
for (let y = 0; y < probe.info.height; y++) for (let x = 0; x < probe.info.width; x++) {
  const i = (y * probe.info.width + x) * 4, d = probe.data
  if ((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * (d[i + 3] / 255) > 70) { vx0 = Math.min(vx0, x); vx1 = Math.max(vx1, x); vy0 = Math.min(vy0, y); vy1 = Math.max(vy1, y) }
}
const k = crop.width / probe.info.width // probe px → crop px
// The picture sized so the cottage itself is houseH inches tall, with the cottage's centre at (cx, cy) or its left
// edge at left.
function place(houseH, { cx, left, cy }) {
  const artH = (houseH * crop.height) / ((vy1 - vy0 + 1) * k), inch = artH / crop.height
  const x = left !== undefined ? left - vx0 * k * inch : cx - ((vx0 + vx1 + 1) / 2) * k * inch
  const y = cy - ((vy0 + vy1 + 1) / 2) * k * inch
  return { x, y, w: crop.width * inch, h: artH, right: x + (vx1 + 1) * k * inch, dpi: Math.round(crop.height / artH) }
}

const T = (s, { font = FONTS.inter, location = { wght: 800 }, cap, fit, tracking = 0.02, fill }) => {
  const g = glyphs(s, font, location)
  return textLine(s, { font, location, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
}
// The words, one calm centred block (owner, of the first layout: "some of the fonts are offputting and things kind
// of just clash"): the name in Fraunces at a lighter weight; FREE ESTIMATES small between thin rules; the phone in
// Inter (Fraunces' hairline numerals vanish at a distance), the biggest thing; the site on its own line, big enough
// to read when parked (owner: "website might as well not be on there" at 0.2 in). Centred on the door's middle line.
function words(th, col) {
  const colW = W - MARGIN - col, cx = col + colW / 2
  const serif = { font: FONTS.fraunces, location: { opsz: 144, wght: 600 }, tracking: 0, fill: th.name }
  const name1 = T('Christmas Light', { ...serif, fit: colW * 0.92 })
  const name2 = T('Creations', { ...serif, cap: name1.cap / U })
  const tag = T('FREE ESTIMATES', { location: { wght: 600 }, cap: 0.3, tracking: 0.26, fill: th.accent })
  const phone = T(PHONE, { location: { wght: 600 }, fit: colW * 0.94, tracking: 0.01, fill: th.phone })
  const foot = T(SITE, { location: { wght: 600 }, fit: colW * 0.88, tracking: 0.01, fill: th.site })
  const r1 = name1.cap / U, r2 = r1 + (name1.cap / U) * 1.38, rTag = r2 + 1.05, rPhone = rTag + 0.55 + phone.cap / U, rFoot = rPhone + 0.6 + foot.cap / U
  const top = H / 2 - rFoot / 2
  const [b1, b2, bTag, bPhone, bFoot] = [r1, r2, rTag, rPhone, rFoot].map((r) => top + r)
  const half = tag.width / U / 2, gap = 0.3
  const rule = (x0, x1) => `<rect x="${fmt(x0 * U)}" y="${fmt((bTag - 0.165) * U)}" width="${fmt((x1 - x0) * U)}" height="${fmt(0.03 * U)}" fill="${th.accent}"/>`
  return [name1.svg(cx * U, b1 * U, 'middle'), name2.svg(cx * U, b2 * U, 'middle'),
    rule(col + 0.4, cx - half - gap), tag.svg(cx * U, bTag * U, 'middle'), rule(cx + half + gap, col + colW - 0.4),
    phone.svg(cx * U, bPhone * U, 'middle'), foot.svg(cx * U, bFoot * U, 'middle')]
}
const image = (p) => `<image x="${fmt(p.x * U)}" y="${fmt(p.y * U)}" width="${fmt(p.w * U)}" height="${fmt(p.h * U)}" href="${href}"/>`

for (const [theme, th] of Object.entries(THEMES)) {
  let body, p, col
  if (theme === 'navy') {
    p = place(th.houseH, { left: MARGIN, cy: H / 2 })
    col = p.right + GUTTER
    body = [`<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${NIGHT}"/>`, image(p), ...words(th, col)]
  } else {
    // The round night window: a circle of the render's night colour, the cottage inside it, clipped to it.
    const r = th.window, wx = MARGIN + r - 0.3, wy = H / 2
    p = place(th.houseH, { cx: wx, cy: wy + 0.15 })
    col = wx + r + GUTTER
    body = [`<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${th.paper}"/>`,
      `<defs><clipPath id="window"><circle cx="${fmt(wx * U)}" cy="${fmt(wy * U)}" r="${fmt(r * U)}"/></clipPath></defs>`,
      `<circle cx="${fmt(wx * U)}" cy="${fmt(wy * U)}" r="${fmt(r * U)}" fill="${NIGHT}"/>`, `<g clip-path="url(#window)">${image(p)}</g>`,
      `<circle cx="${fmt(wx * U)}" cy="${fmt(wy * U)}" r="${fmt((r + 0.12) * U)}" fill="none" stroke="${th.accent}" stroke-width="${fmt(0.05 * U)}"/>`,
      ...words(th, col)]
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">${body.join('')}</svg>`
  const out = DIR + th.file
  writeFileSync(out + '.svg', svg)
  svgToPdf(svg, W, H, out + '.pdf')
  // librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
  const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).png().toBuffer()
  await sharp(png).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
  // A drive-by check: the magnet at 1/40 size, about how it reads from 50 feet.
  await sharp(png).resize({ width: Math.round((W * 150) / 40) }).png().toFile(out + '-50ft.png')
  console.log(`${th.file}: ${W} x ${H} in, night ${NIGHT}, cottage ${fmt(p.w)} x ${fmt(p.h)} in at ${p.dpi} dpi, words from ${fmt(col)} in`)
}
