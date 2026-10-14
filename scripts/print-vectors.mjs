// Print-ready vector files from the logo vectors (assets-source/brand/logo-vector): road sign,
// yard sign, vehicle magnet, cut-vinyl door decals, banner, business card and sticker,
// written to assets-source/print/ (not shipped) as SVG, vector PDF (headless Chrome)
// and a PNG preview each, plus preview-sheet.png.
//
//   node scripts/print-vectors.mjs                                  everything; the road sign's QR is tagged ?sign=road-sign
//   node scripts/print-vectors.mjs --signs broadway-288 dixie-farm-35   one road sign per corner code (QR ?sign=<code>,
//                                                                   the codes the staff app's Signs tab uses; src/lib/sign.js)
//
// Sizes are inches; the SVG unit is 1/100 in. All text is Inter or Fraunces as outlines
// (scripts/lib/logoArt.mjs), so the shop needs no fonts. The cottage's neon glow (an SVG
// blur) is drawn solid so the PDFs stay pure vector; lines under 1 pt (0.5 pt on the card
// and sticker) are thickened in their own colour, and at card size the specks, small
// snowflakes and wood-grain scratches are left out, as on the shirts.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { COLORS, COLOR_ROLES, FONTS, NAVY_ROLES, WHITE_ROLES, checkRoles, fmt, glyphs, letteringGroups, parseLogo, prepCottage, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const OUT = fileURLToPath(new URL('../assets-source/print/', import.meta.url))
const U = 100 // SVG units per inch
const SITE_URL = 'https://christmas-light-creations.com/'
const NAVY = COLORS.navyDeep // the site's night-950, also the app tile's background
const INK = '#0a1530' // night-900: the one-colour navy logo's ink
const { white: WHITE, gold: GOLD, pale: PALE } = COLORS
const PHONE = '281-819-0163'
const SITE = 'christmas-light-creations.com'
const SERVICE = 'INSTALLED · SERVICED ALL SEASON · TAKEN DOWN IN JANUARY'
const AREA = 'PEARLAND, TX · SERVING SOUTH HOUSTON SINCE 2011 · FAMILY-OWNED & INSURED'
const FREE = 'FREE ESTIMATES'
const SCAN = 'SCAN FOR A FREE ESTIMATE'
const CARD_NAME = 'Scott Minor' // on the back of the business card (owner, 2026-10-11)
const HEAVY = { wght: 800 }, BOLD = { wght: 700 }, MEDIUM = { wght: 500 }, DISPLAY = { opsz: 144, wght: 900 }

const slug = (c) => c.toLowerCase().trim().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const args = process.argv.slice(2)
const signCodes = args.includes('--signs') ? args.slice(args.indexOf('--signs') + 1).map(slug).filter(Boolean) : ['road-sign']

const LOGOS = {
  stacked: { file: 'clc-logo-stacked-color.svg', roles: COLOR_ROLES, look: 'flat' },
  horizontal: { file: 'clc-logo-horizontal-color.svg', roles: COLOR_ROLES, look: 'flat' },
  horizontalWhite: { file: 'clc-logo-horizontal-one-color-white.svg', roles: WHITE_ROLES, look: 'white' },
  horizontalNavy: { file: 'clc-logo-horizontal-one-color-navy.svg', roles: NAVY_ROLES, look: 'white' },
  tile: { file: 'clc-cottage-color-on-navy-tile.svg', roles: COLOR_ROLES, look: 'flat' },
}
for (const l of Object.values(LOGOS)) l.logo = checkRoles(parseLogo(l.file), l.roles)

// A logo placed at (x, y), w inches wide; lines held to minPt at that size. small: card/sticker rules.
function logo(name, { x, y, w, minPt = 1, small = false }) {
  const { logo: l, roles, look } = LOGOS[name]
  const vb = l.viewBox
  const h = (w * vb.h) / vb.w
  const minUnits = (minPt / 72) * (vb.w / w)
  const drop = small ? ['specks', 'wallLines', 'doorLines', 'postHighlights'] : []
  const c = prepCottage(l, roles, { minUnits, look, drop, keepFlakeMin: small ? 100 : 0 })
  const svg = `<svg x="${fmt(x * U)}" y="${fmt(y * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${l.background || ''}${c.svg}${letteringGroups(l.lettering).join('')}</svg>`
  return { svg, h, log: c.log }
}

// A line of text sized by cap height (inches) or fitted to a width; at(x, y, anchor) puts its baseline at y.
function text(str, { cap, fit, font = FONTS.inter, location = HEAVY, fill = WHITE, tracking = 0.04 } = {}) {
  const g = glyphs(str, font, location)
  const em = cap ? (cap * U * g.upem) / g.capHeight : undefined
  const t = textLine(str, { font, location, em, fitWidth: fit ? fit * U : undefined, tracking, fill })
  return { width: t.width / U, cap: t.cap / U, at: (x, y, anchor = 'start') => t.svg(x * U, y * U, anchor) }
}

// QR code to the site (tagged ?sign=<code> so the lead shows where it came from), black on a white rounded box.
async function qr(code, { x, y, size }) {
  const url = code ? `${SITE_URL}?sign=${code}` : SITE_URL
  const s = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 0, color: { dark: '#000000', light: '#0000' } })
  const n = Number(s.match(/viewBox="0 0 (\d+) /)[1])
  const inner = (size * n) / (n + 8) // four modules of white around the code
  const pad = (size - inner) / 2
  const svg = `<rect x="${fmt(x * U)}" y="${fmt(y * U)}" width="${fmt(size * U)}" height="${fmt(size * U)}" rx="${fmt(size * 6)}" fill="#ffffff"/>` +
    s.replace('<svg ', `<svg x="${fmt((x + pad) * U)}" y="${fmt((y + pad) * U)}" width="${fmt(inner * U)}" height="${fmt(inner * U)}" `)
  return { svg, url }
}

const doc = (w, h, bg, body) => // (LF only: the logo files carry CRLF)
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}in" height="${h}in" viewBox="0 0 ${fmt(w * U)} ${fmt(h * U)}">${bg || ''}${body.join('\n')}</svg>`.replace(/\r\n?/g, '\n')
const rect = (w, h, fill, rx = 0) => `<rect width="${fmt(w * U)}" height="${fmt(h * U)}" rx="${fmt(rx * U)}" fill="${fill}"/>`

// --- the items ---
async function roadSign(code) {
  const w = 24, h = 18, m = 0.75
  const q = await qr(code, { x: 18.45, y: 0.9, size: 4.8 })
  const site = text(SITE, { cap: 0.62, location: BOLD, tracking: 0.01 })
  const body = [
    logo('horizontal', { x: m, y: 0.7, w: 17 }).svg,
    q.svg,
    text(SCAN, { fit: 4.6, fill: PALE, tracking: 0.06 }).at(18.45 + 2.4, 6.3, 'middle'),
    text(SERVICE, { fit: w - 2 * m, fill: PALE }).at(w / 2, 10.05, 'middle'),
    text(PHONE, { fit: w - 2 * m, tracking: 0.02 }).at(w / 2, 13.35, 'middle'),
    site.at(m, 15.15),
    text(FREE, { cap: 0.62, fill: GOLD }).at(w - m, 15.15, 'end'),
    text(AREA, { cap: 0.36, fill: PALE, tracking: 0.08 }).at(w / 2, 16.65, 'middle'),
  ]
  return { name: code === 'road-sign' ? 'road-sign-24x18' : `road-sign-24x18-${code}`, w, h, bleed: 0, svg: doc(w, h, rect(w, h, NAVY), body), note: `QR → ${q.url}` }
}

async function yardSign() {
  const w = 18, h = 12, m = 0.75
  const q = await qr('yard-sign', { x: 13.65, y: 1.0, size: 3.6 })
  const body = [
    text('LIGHTS BY', { cap: 0.5, fill: PALE, tracking: 0.14 }).at(m, 1.25),
    logo('horizontal', { x: m, y: 1.6, w: 12 }).svg,
    q.svg,
    text(SCAN, { fit: 3.5, fill: PALE, tracking: 0.06 }).at(13.65 + 1.8, 5.05, 'middle'),
    text(PHONE, { fit: w - 2 * m, tracking: 0.02 }).at(w / 2, 9.95, 'middle'),
    text(SITE, { cap: 0.42, location: BOLD, tracking: 0.01 }).at(m, 11.0),
    text(FREE, { cap: 0.42, fill: GOLD }).at(w - m, 11.0, 'end'),
  ]
  return { name: 'yard-sign-18x12', w, h, bleed: 0, svg: doc(w, h, rect(w, h, NAVY), body), note: `QR → ${q.url}` }
}

async function magnet() {
  const w = 24, h = 12, m = 0.8, col = 14.0, colW = 9.2
  const q = await qr('vehicle', { x: 20.2, y: 7.4, size: 3.0 })
  const body = [
    logo('horizontal', { x: m, y: 0.8, w: 12.5 }).svg,
    text(FREE, { cap: 0.62, fill: GOLD }).at(col, 2.0),
    text(PHONE, { fit: colW, tracking: 0.02 }).at(col, 4.0),
    text(SITE, { fit: colW, location: BOLD, tracking: 0.01 }).at(col, 5.45),
    text(SERVICE, { fit: 18.6, fill: PALE }).at(m, 8.65),
    text(AREA, { fit: 18.6, fill: PALE, tracking: 0.06 }).at(m, 9.75),
    q.svg,
    text(SCAN, { fit: 2.9, fill: PALE, tracking: 0.06 }).at(20.2 + 1.5, 10.95, 'middle'),
  ]
  return { name: 'vehicle-magnet-24x12', w, h, bleed: 0, svg: doc(w, h, rect(w, h, NAVY, 0.75), body), note: `rounded corners 0.75 in; QR → ${q.url}` }
}

function decal(colour) {
  const w = 20
  const ink = colour === 'white' ? WHITE : INK
  const lk = logo(colour === 'white' ? 'horizontalWhite' : 'horizontalNavy', { x: 0, y: 0, w })
  const phone = text(PHONE, { cap: 1.3, fill: ink, tracking: 0.03 })
  const h = Math.ceil((lk.h + 0.45 + 1.3 + 0.1) * 100) / 100
  const body = [lk.svg, phone.at(w / 2, lk.h + 0.45 + 1.3, 'middle')]
  return { name: `door-decal-20in-${colour}`, w, h, bleed: 0, svg: doc(w, h, '', body), previewBg: colour === 'white' ? NAVY : WHITE, note: `one colour ${colour}, no background: cut vinyl` }
}

async function banner() {
  const w = 72, h = 36, m = 3, col = 40, colW = 29
  const q = await qr('banner', { x: 62, y: 24.5, size: 7 })
  const body = [
    logo('horizontal', { x: m, y: 3, w: 34 }).svg,
    text(FREE, { cap: 2.0, fill: GOLD }).at(col, 6.5),
    text(PHONE, { fit: colW, tracking: 0.02 }).at(col, 12.6),
    text(SITE, { fit: colW, location: BOLD, tracking: 0.01 }).at(col, 17.0),
    text(SERVICE, { fit: 56, fill: PALE }).at(m, 26.5),
    text(AREA, { fit: 56, fill: PALE, tracking: 0.06 }).at(m, 30.0),
    q.svg,
    text(SCAN, { fit: 6.8, fill: PALE, tracking: 0.06 }).at(62 + 3.5, 32.6, 'middle'),
  ]
  return { name: 'banner-72x36', w, h, bleed: 0, svg: doc(w, h, rect(w, h, NAVY), body), note: `keep 3 in from the edges clear of hems and grommets; QR → ${q.url}` }
}

function cardFront() {
  const w = 3.75, h = 2.25, lw = 2.3 // 3.5 x 2 trim + 0.125 bleed
  const vb = LOGOS.stacked.logo.viewBox
  const lh = (lw * vb.h) / vb.w
  const body = [logo('stacked', { x: (w - lw) / 2, y: (h - lh) / 2, w: lw, minPt: 0.5, small: true }).svg]
  return { name: 'business-card-front', w, h, bleed: 0.125, svg: doc(w, h, rect(w, h, NAVY), body), note: 'trim 3.5 x 2 in' }
}

async function cardBack() {
  const w = 3.75, h = 2.25, x = 0.3
  const q = await qr('card', { x: 2.5, y: 0.55, size: 0.95 })
  const body = [
    text('Christmas Light Creations', { fit: 2.0, font: FONTS.fraunces, location: DISPLAY, fill: INK, tracking: 0 }).at(x, 0.5),
    text(CARD_NAME, { cap: 0.115, location: { wght: 600 }, fill: INK, tracking: 0.01 }).at(x, 0.78),
    text(PHONE, { cap: 0.2, fill: INK, tracking: 0.02 }).at(x, 1.18),
    text(SITE, { fit: 2.0, location: { wght: 600 }, fill: INK, tracking: 0.01 }).at(x, 1.45),
    text('Free estimates · Family-owned & insured', { cap: 0.072, location: MEDIUM, fill: INK, tracking: 0.01 }).at(x, 1.7),
    text('Pearland, TX · South Houston since 2011', { cap: 0.072, location: MEDIUM, fill: INK, tracking: 0.01 }).at(x, 1.88),
    q.svg,
    text('FREE ESTIMATE', { cap: 0.065, fill: INK, tracking: 0.08 }).at(2.5 + 0.475, 1.68, 'middle'),
  ]
  return { name: 'business-card-back', w, h, bleed: 0.125, svg: doc(w, h, rect(w, h, WHITE), body), note: `trim 3.5 x 2 in; QR → ${q.url}` }
}

function sticker() {
  const w = 3.25 // 3 in trim + 0.125 bleed; the tile's own rounded corners
  const lk = logo('tile', { x: 0, y: 0, w, minPt: 0.5, small: true })
  return { name: 'sticker-3in', w, h: w, bleed: 0.125, trimRadius: 0.65, svg: doc(w, w, '', [lk.svg]), note: 'trim 3 x 3 in, corner radius 0.65 in' }
}

// --- output: SVG, PDF via Chrome, PNG preview on grey (navy for the transparent decals) with the trim shown ---
async function pdf(item) {
  svgToPdf(item.svg, item.w, item.h, `${OUT}${item.name}.pdf`)
}
async function preview(item) {
  const density = Math.min(300, Math.round(1400 / item.w))
  const art = await sharp(Buffer.from(item.svg), { density }).png().toBuffer()
  const { width, height } = await sharp(art).metadata()
  const m = Math.round(width * 0.05)
  const over = []
  if (item.bleed) {
    const px = width / item.w, b = item.bleed * px
    over.push(`<rect x="${fmt(m + b)}" y="${fmt(m + b)}" width="${fmt(width - 2 * b)}" height="${fmt(height - 2 * b)}" rx="${fmt((item.trimRadius || 0) * px)}" fill="none" stroke="#ff4d8a" stroke-width="2" stroke-dasharray="12 8"/>`)
  }
  const label = `${item.name}: ${item.w} x ${item.h} in${item.bleed ? ` (trim inside the dashed line, ${item.bleed} in bleed)` : ''}`
  over.push(`<text x="${m}" y="${m - 10}" fill="${item.previewBg === WHITE ? INK : '#f1f3f8'}" font-family="sans-serif" font-size="${Math.max(16, Math.round(width / 60))}">${label}</text>`)
  const png = await sharp({ create: { width: width + 2 * m, height: height + 2 * m, channels: 4, background: item.previewBg || '#7d8291' } })
    .composite([{ input: art, left: m, top: m }, { input: Buffer.from(`<svg width="${width + 2 * m}" height="${height + 2 * m}">${over.join('')}</svg>`), left: 0, top: 0 }])
    .png().toBuffer()
  await sharp(png).png({ palette: true, compressionLevel: 9 }).toFile(`${OUT}${item.name}.png`)
  return png
}

mkdirSync(OUT, { recursive: true })
const items = [...(await Promise.all(signCodes.map(roadSign))), await yardSign(), await magnet(), decal('white'), decal('navy'), await banner(), cardFront(), await cardBack(), sticker()]
const previews = []
for (const item of items) {
  writeFileSync(`${OUT}${item.name}.svg`, item.svg)
  await pdf(item)
  previews.push({ item, png: await preview(item) })
  console.log(`${item.name}: ${item.w} x ${item.h} in${item.bleed ? ` incl. ${item.bleed} in bleed` : ''} → .svg .pdf .png  (${item.note})`)
}

// Contact sheet (not to scale).
{
  const cell = 620, cols = 3, pad = 20
  const rows = Math.ceil(previews.length / cols)
  const comps = await Promise.all(previews.map(async ({ png }, i) => ({
    input: await sharp(png).resize({ width: cell - 2 * pad, height: cell - 2 * pad, fit: 'inside' }).png().toBuffer(),
    left: (i % cols) * cell + pad, top: Math.floor(i / cols) * cell + pad,
  })))
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#3b3f4b" } }).composite(comps).png({ palette: true, compressionLevel: 9 }).toFile(`${OUT}preview-sheet.png`)
  console.log(`preview-sheet.png: ${previews.length} items, not to scale`)
}
