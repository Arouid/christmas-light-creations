// The truck magnet with the owner's 3D cottage (assets-source/shirts/recraft/door-magnet-clc.png, an AI render,
// 4096 x 2286, not in git). Owner, 2026-10-16, picked it ("number 2 in 4k") after the critique: lovely cottage, but
// its words were baked into the picture and the phone was about an inch tall. So only the cottage is used, cut out
// and faded into a flat background of its own colour, and the words are set in our fonts as vectors, the phone the
// biggest thing on the door.
// Run: node scripts/print-magnet-art.mjs   → recraft/vehicle-magnet-24x12-cottage-3d.{pdf,png,svg} (24 x 12 in,
// 0.75-in rounded corners; the picture embedded at about 155 dpi, the text vector).
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
const ART_H = 10.0 // inches tall on the magnet
const CREAM = '#F3E6C8', GOLD = '#E2B65C', PALE = '#B9C2D6' // the render's own cream and gold
const PHONE = '281-819-0163', SITE = 'christmas-light-creations.com'

const meta = await sharp(SRC).metadata()
const crop = { left: Math.round(CROP.x0 * meta.width), top: Math.round(CROP.y0 * meta.height), width: Math.round((CROP.x1 - CROP.x0) * meta.width), height: Math.round((CROP.y1 - CROP.y0) * meta.height) }
const cut = await sharp(SRC).extract(crop).png().toBuffer()
// The background: the median colour of the crop's top and side edges (the bottom edge is snow), so the fade meets
// it without a seam.
const edge = await sharp(cut).resize(40, 40, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
const ring = []
for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (x < 3 || y < 3 || x > 36) ring.push([0, 1, 2].map((c) => edge.data[(y * 40 + x) * 3 + c]))
const median = [0, 1, 2].map((c) => ring.map((p) => p[c]).sort((a, b) => a - b)[ring.length >> 1])
const BG = '#' + median.map((v) => v.toString(16).padStart(2, '0')).join('')
// Fade: an ellipse, solid in the middle, clear at the crop's edges.
const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}"><defs><radialGradient id="f" cx="50%" cy="54%" r="54%">` +
  `<stop offset="0.62" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`)
const art = await sharp(cut).ensureAlpha().composite([{ input: await sharp(fade).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer()
const artW = (ART_H * crop.width) / crop.height

const T = (s, { font = FONTS.inter, location = { wght: 800 }, cap, fit, tracking = 0.02, fill }) => {
  const g = glyphs(s, font, location)
  return textLine(s, { font, location, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
}
const col = 11.6, colW = W - 0.8 - col // the text column
const serif = { font: FONTS.fraunces, location: { opsz: 144, wght: 900 }, tracking: 0 }
const name1 = T('Christmas Light', { ...serif, fit: colW, fill: CREAM })
const name2 = T('Creations', { ...serif, cap: name1.cap / U, fill: GOLD })
const body = [
  `<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${BG}"/>`,
  `<image x="${fmt(0.5 * U)}" y="${fmt(((H - ART_H) / 2) * U)}" width="${fmt(artW * U)}" height="${fmt(ART_H * U)}" href="data:image/png;base64,${art.toString('base64')}"/>`,
  name1.svg(col * U, 2.25 * U),
  name2.svg(col * U, 2.25 * U + name1.cap * 1.4),
  `<rect x="${fmt(col * U)}" y="${fmt(4.55 * U)}" width="${fmt(colW * U)}" height="${fmt(0.04 * U)}" fill="${GOLD}"/>`,
  T('PROFESSIONAL CHRISTMAS LIGHTS', { location: { wght: 700 }, fit: colW, tracking: 0.16, fill: PALE }).svg(col * U, 5.3 * U),
  T(PHONE, { fit: colW, fill: GOLD }).svg(col * U, 8.0 * U),
  T(SITE, { location: { wght: 700 }, fit: colW * 0.86, tracking: 0.01, fill: CREAM }).svg(col * U, 9.35 * U),
  T('FREE ESTIMATES', { cap: 0.42, tracking: 0.14, fill: GOLD }).svg(col * U, 10.45 * U),
]
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">${body.join('')}</svg>`
const out = DIR + 'vehicle-magnet-24x12-cottage-3d'
writeFileSync(out + '.svg', svg)
svgToPdf(svg, W, H, out + '.pdf')
// librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).png().toBuffer()
await sharp(png).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
const m = await sharp(png).metadata()
console.log(`vehicle-magnet-24x12-cottage-3d: ${W} x ${H} in, background ${BG}, cottage ${fmt(artW)} x ${ART_H} in at ${Math.round(crop.height / ART_H)} dpi; preview ${m.width}x${m.height}`)
// A drive-by check: the magnet at 1/40 size, about how it reads from 50 feet.
await sharp(png).resize({ width: Math.round(W * 150 / 40) }).png().toFile(out + '-50ft.png')
