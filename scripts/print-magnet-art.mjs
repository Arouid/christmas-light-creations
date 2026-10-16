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
const HOUSE_H = 7.2 // the cottage itself (chimney to snow), inches tall on the magnet
const MARGIN = 1.3, GUTTER = 1.0 // outer margin, gap between the cottage and the words
const CREAM = '#F3E6C8', GOLD = '#E2B65C' // the render's own cream and gold
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
// Where the cottage really is inside the crop (its snow and neon, not the dark around it), so it is placed and
// balanced by what the eye sees, not by the picture's box.
const probe = await sharp(art).resize({ width: 200 }).raw().toBuffer({ resolveWithObject: true })
let vx0 = Infinity, vy0 = Infinity, vx1 = -1, vy1 = -1
for (let y = 0; y < probe.info.height; y++) for (let x = 0; x < probe.info.width; x++) {
  const i = (y * probe.info.width + x) * 4, d = probe.data
  if ((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * (d[i + 3] / 255) > 70) { vx0 = Math.min(vx0, x); vx1 = Math.max(vx1, x); vy0 = Math.min(vy0, y); vy1 = Math.max(vy1, y) }
}
const k = crop.width / probe.info.width // probe px → crop px
const ART_H = (HOUSE_H * crop.height) / ((vy1 - vy0 + 1) * k)
const inch = ART_H / crop.height // inches per crop px
const artW = crop.width * inch
const artX = MARGIN - vx0 * k * inch // the cottage's left edge on the margin
const artY = H / 2 - ((vy0 + vy1 + 1) / 2) * k * inch // the cottage centred on the door's middle line
const houseRight = artX + (vx1 + 1) * k * inch

const T = (s, { font = FONTS.inter, location = { wght: 800 }, cap, fit, tracking = 0.02, fill }) => {
  const g = glyphs(s, font, location)
  return textLine(s, { font, location, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
}
// The words, one calm centred block (owner, of the first layout: "some of the fonts are offputting and things kind
// of just clash"): the name in Fraunces at a lighter weight, all cream; FREE ESTIMATES small in gold between thin
// rules; the phone in Inter (Fraunces' hairline numerals vanish at a distance), the only big gold thing; the site on
// its own line, big enough to read when parked (owner: "website might as well not be on there" at 0.2 in).
const col = houseRight + GUTTER, colW = W - MARGIN - col, cx = col + colW / 2
const serif = { font: FONTS.fraunces, location: { opsz: 144, wght: 600 }, tracking: 0, fill: CREAM }
const name1 = T('Christmas Light', { ...serif, fit: colW * 0.92 })
const name2 = T('Creations', { ...serif, cap: name1.cap / U })
const tag = T('FREE ESTIMATES', { location: { wght: 600 }, cap: 0.3, tracking: 0.26, fill: GOLD })
const phone = T(PHONE, { location: { wght: 600 }, fit: colW * 0.94, tracking: 0.01, fill: GOLD })
const foot = T(SITE, { location: { wght: 600 }, fit: colW * 0.88, tracking: 0.01, fill: CREAM })
// Laid out from 0, then the block (name's cap line to the site's baseline) is centred on the door's middle line.
const r1 = name1.cap / U, r2 = r1 + (name1.cap / U) * 1.38, rTag = r2 + 1.05, rPhone = rTag + 0.55 + phone.cap / U, rFoot = rPhone + 0.6 + foot.cap / U
const top = H / 2 - rFoot / 2
const [b1, b2, bTag, bPhone, bFoot] = [r1, r2, rTag, rPhone, rFoot].map((r) => top + r)
const ruleGap = 0.3, tagHalf = tag.width / U / 2
const rule = (x0, x1) => `<rect x="${fmt(x0 * U)}" y="${fmt((bTag - 0.165) * U)}" width="${fmt((x1 - x0) * U)}" height="${fmt(0.03 * U)}" fill="${GOLD}"/>`
const body = [
  `<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${BG}"/>`,
  `<image x="${fmt(artX * U)}" y="${fmt(artY * U)}" width="${fmt(artW * U)}" height="${fmt(ART_H * U)}" href="data:image/png;base64,${art.toString('base64')}"/>`,
  name1.svg(cx * U, b1 * U, 'middle'),
  name2.svg(cx * U, b2 * U, 'middle'),
  rule(col + 0.4, cx - tagHalf - ruleGap), tag.svg(cx * U, bTag * U, 'middle'), rule(cx + tagHalf + ruleGap, col + colW - 0.4),
  phone.svg(cx * U, bPhone * U, 'middle'),
  foot.svg(cx * U, bFoot * U, 'middle'),
]
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">${body.join('')}</svg>`
const out = DIR + 'vehicle-magnet-24x12-cottage-3d'
writeFileSync(out + '.svg', svg)
svgToPdf(svg, W, H, out + '.pdf')
// librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).png().toBuffer()
await sharp(png).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
const m = await sharp(png).metadata()
console.log(`vehicle-magnet-24x12-cottage-3d: ${W} x ${H} in, background ${BG}, cottage ${fmt(artW)} x ${fmt(ART_H)} in at ${Math.round(crop.height / ART_H)} dpi, words ${fmt(col)}–${fmt(col + colW)} in; preview ${m.width}x${m.height}`)
// A drive-by check: the magnet at 1/40 size, about how it reads from 50 feet.
await sharp(png).resize({ width: Math.round(W * 150 / 40) }).png().toFile(out + '-50ft.png')
