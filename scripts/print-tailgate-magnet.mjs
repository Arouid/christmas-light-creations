// The tailgate magnet (owner, 2026-10-16: "tailgate magnet?", after asking whether to squeeze the QR code onto the
// door magnet: no, the door is read while driving; the tailgate is read by the car behind at a light and by people
// walking past a parked truck). The door magnet's look (scripts/print-magnet-art.mjs, the Elsie pick): cream, a thin
// navy frame, the name in Elsie Swash Caps Black with its gold dot and the gold sparkle divider, the rest in
// Montserrat. Under the name: a big QR code on the left, SCAN FOR A FREE ESTIMATE, the phone and clcxmas.com on the
// right. The QR code opens the site with ?sign=truck, so a lead from it is tagged "Road sign (Truck)" like the
// corner signs' codes (src/lib/sign.js, scripts/sign-qr.mjs) and shows in the staff Signs tab.
// Run: node scripts/print-tailgate-magnet.mjs → recraft/tailgate-magnet-18x12-cream-elsie.{svg,pdf,png} (18 x 12 in,
// the cut) and -bleed.{svg,pdf,png} (19 x 13 in, 1/2 in of cream past the cut all round: the upload).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { setWords } from './lib/lettering.mjs'
import { fmt, glyphs, textLine, unifyNavy } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const FONTS = fileURLToPath(new URL('../assets-source/brand/fonts/', import.meta.url))
const ELSIE = FONTS + 'elsie-swash-caps/ElsieSwashCaps-Black.ttf', MONTSERRAT = FONTS + 'montserrat/Montserrat-Variable.ttf'
const URL_TO = 'https://christmas-light-creations.com/?sign=truck'
const PHONE = '281-819-0163'
const W = 18, H = 12, U = 100 // inches; drawing units per inch
const ink = '#1F304B', gold = '#D4AF63', deep = '#9A7428', red = '#D7262E', bg = '#FEFCF1' // the door magnet's colours
const FRAME_INSET = 0.35, FRAME_LINE = 2 / 72, RADIUS = 0.75

const T = (s, { font = MONTSERRAT, wght = 600, cap, fit, tracking = 0, fill }) => {
  const g = glyphs(s, font, { wght })
  return textLine(s, { font, location: { wght }, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
}
const sparkle = (cx, cy, r) => `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`

// The name across the top, centred, one line, the gold dot raised a touch like the door's.
const NAME = { x0: 1.4, x1: W - 1.4, base: 2.15, xh: 0.95 }
const name = setWords([{ text: 'christmas light creations', x0: NAME.x0 * U, x1: NAME.x1 * U, base: NAME.base * U }],
  { font: ELSIE, xh: NAME.xh * U, accent: [0, 3], accentScale: 1.45, accentLift: 0.05 * U })
const nameSvg = name.map((it) => `<path transform="${it.tf}" fill="${it.role === 'accent' ? gold : ink}" d="${it.d}"/>`).join('')

// The divider under it: the sparkle between two tapering rules, as on the door.
const divY = 3.0, divHalf = 4.2, r = 0.26, gap = 0.2, t = 0.07
const rule = (inner, outer) => `<path fill="${deep}" d="M${fmt(outer * U)} ${fmt(divY * U)} L${fmt(inner * U)} ${fmt((divY - t / 2) * U)} Q${fmt((inner + Math.sign(inner - outer) * t / 2) * U)} ${fmt(divY * U)} ${fmt(inner * U)} ${fmt((divY + t / 2) * U)} Z"/>`
const divider = rule(W / 2 - r - gap, W / 2 - divHalf) + rule(W / 2 + r + gap, W / 2 + divHalf) + `<path fill="${deep}" d="${sparkle(W / 2 * U, divY * U, r * U)}"/>`

// The QR code: high error correction (dirt, scratches), navy squares on the cream, its quiet zone of 3 squares
// clear of everything; as big as the space under the divider allows.
const qr = QRCode.create(URL_TO, { errorCorrectionLevel: 'H' })
const n = qr.modules.size, QUIET = 3
const QR = { x: 1.15, y: 3.55, size: 7.4 } // the whole code with its quiet zone, inches
const mod = QR.size / (n + 2 * QUIET)
let qrPath = ''
for (let row = 0; row < n; row++) {
  for (let col = 0; col < n; col++) {
    if (!qr.modules.get(row, col)) continue
    let run = 1
    while (col + run < n && qr.modules.get(row, col + run)) run++
    const x = QR.x + (QUIET + col) * mod, y = QR.y + (QUIET + row) * mod
    qrPath += `M${fmt(x * U)} ${fmt(y * U)}h${fmt(run * mod * U)}v${fmt(mod * U)}h${fmt(-run * mod * U)}Z`
    col += run - 1
  }
}
const qrSvg = `<path fill="${ink}" d="${qrPath}"/>`

// The right column, centred on its own middle: SCAN FOR A / FREE ESTIMATE in deep gold, an arrow to the code, the
// phone, the site with its red x.
const colX0 = QR.x + QR.size + 0.35, colX1 = W - 1.15, cx = (colX0 + colX1) / 2, colW = colX1 - colX0
const scan1 = T('SCAN FOR A', { cap: 0.5, tracking: 0.12, fill: deep }), scan2 = T('FREE ESTIMATE', { cap: 0.5, tracking: 0.12, fill: deep })
const phone = T(PHONE, { fit: colW, fill: ink })
const site = (() => {
  const g = glyphs('clcxmas.com', MONTSERRAT, { wght: 700 }), siteW = colW * 0.72
  const advEm = g.glyphs.reduce((s, gl) => s + gl.advance, 0) / g.upem + 0.01 * (g.glyphs.length - 1)
  const em = (siteW * U) / advEm, k = em / g.upem
  let x = (cx - siteW / 2) * U
  const base = 9.9
  return g.glyphs.map((gl, i) => {
    const p = gl.d ? `<path transform="translate(${fmt(x)} ${fmt(base * U)}) scale(${k} ${-k})" fill="${i === 3 ? red : ink}" d="${gl.d}"/>` : ''
    x += gl.advance * k + 0.01 * em
    return p
  }).join('')
})()
// DY: the column centred on the code's printed squares (not its quiet zone)
const DY = 0.45
// The arrow (owner: "do we have a higher quality arrow?"): drawn like the divider, a shaft tapering to a fine point
// at its tail, and a solid head with swept-back, gently curved sides and a notched back; deep gold.
const ay = 6.15 + DY, ax0 = cx - 1.25, ax1 = cx + 1.25 // tip, tail
const headL = 0.5, headH = 0.34, notch = 0.16, shaft = 0.09
const P = (x, y) => `${fmt(x * U)} ${fmt(y * U)}`
const head = `M${P(ax0, ay)} Q${P(ax0 + headL * 0.45, ay - headH * 0.35)} ${P(ax0 + headL, ay - headH)} Q${P(ax0 + headL - notch * 0.6, ay - headH * 0.35)} ${P(ax0 + headL - notch, ay)} ` +
  `Q${P(ax0 + headL - notch * 0.6, ay + headH * 0.35)} ${P(ax0 + headL, ay + headH)} Q${P(ax0 + headL * 0.45, ay + headH * 0.35)} ${P(ax0, ay)} Z`
const tail = `M${P(ax0 + headL - notch - 0.02, ay - shaft / 2)} L${P(ax1, ay)} L${P(ax0 + headL - notch - 0.02, ay + shaft / 2)} Z`
const arrow = `<path fill="${deep}" d="${head} ${tail}"/>`
const right = scan1.svg(cx * U, (4.55 + DY) * U, 'middle') + scan2.svg(cx * U, (5.35 + DY) * U, 'middle') + arrow + phone.svg(cx * U, (8.15 + DY) * U, 'middle') + site

const frame = `<rect x="${fmt(FRAME_INSET * U)}" y="${fmt(FRAME_INSET * U)}" width="${fmt((W - 2 * FRAME_INSET) * U)}" height="${fmt((H - 2 * FRAME_INSET) * U)}" rx="${fmt((RADIUS - FRAME_INSET) * U)}" fill="none" stroke="${ink}" stroke-width="${fmt(FRAME_LINE * U)}"/>`
const body = frame + nameSvg + divider + qrSvg + right
const svg = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}"><rect width="${W * U}" height="${H * U}" rx="${RADIUS * U}" fill="${bg}"/>${body}</svg>`)
const B = 0.5
const bled = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * B}in" height="${H + 2 * B}in" viewBox="${-B * U} ${-B * U} ${(W + 2 * B) * U} ${(H + 2 * B) * U}"><rect x="${-B * U}" y="${-B * U}" width="${(W + 2 * B) * U}" height="${(H + 2 * B) * U}" fill="${bg}"/>${body}</svg>`)

const out = DIR + 'tailgate-magnet-18x12-cream-elsie'
for (const [file, s, w, h] of [[out, svg, W, H], [out + '-bleed', bled, W + 2 * B, H + 2 * B]]) {
  writeFileSync(file + '.svg', s)
  svgToPdf(s, w, h, file + '.pdf')
  await sharp(Buffer.from(s), { density: Math.sqrt(72 * 300) }).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(file + '.png')
}
console.log(`tailgate-magnet-18x12-cream-elsie: ${W} x ${H} in (and -bleed ${W + 2 * B} x ${H + 2 * B}); QR version ${qr.version}, ${n} squares, ${(mod * 25.4).toFixed(1)} mm each, ${QR.size} in with its quiet zone → ${URL_TO}; phone ${(phone.cap / U).toFixed(2)} in tall`)
