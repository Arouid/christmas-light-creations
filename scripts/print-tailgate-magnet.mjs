// The tailgate magnet (owner, 2026-10-16: "tailgate magnet?", after asking whether to squeeze the QR code onto the
// door magnet: no, the door is read while driving; the tailgate is read by the car behind at a light and by people
// walking past a parked truck). The door magnet's look (scripts/print-magnet-art.mjs, the Elsie pick; its pieces in
// scripts/lib/elsieParts.mjs): cream, a thin navy frame, the name in Elsie Swash Caps Black with its gold dot and the
// gold sparkle divider, the rest in Montserrat. Under the name: a big QR code on the left, SCAN FOR A FREE ESTIMATE,
// the phone and clcxmas.com on the right. The QR code opens the site with ?sign=truck, so a lead from it is tagged
// "Road sign (Truck)" like the corner signs' codes (src/lib/sign.js, scripts/sign-qr.mjs) and shows in the Signs tab.
// Run: node scripts/print-tailgate-magnet.mjs → recraft/tailgate-magnet-18x12-cream-elsie.{svg,pdf,png} (18 x 12 in,
// the cut) and -bleed.{svg,pdf,png} (19 x 13 in, 1/2 in of cream past the cut all round: the upload).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { C, divider, elsieName, frame, pages, PHONE, qrCode, redXSite, T, U } from './lib/elsieParts.mjs'
import { fmt } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const W = 18, H = 12 // inches

// The name across the top, centred, one line; the divider under it.
const nameSvg = elsieName([{ text: 'christmas light creations', x0: 1.4, x1: W - 1.4, base: 2.15 }], 0.95)
const div = divider(W / 2, 3.0, 4.2)

// The QR code: as big as the space under the divider allows (7.4 in with its quiet zone).
const QR = { x: 1.15, y: 3.55, size: 7.4 }
const qr = qrCode('truck', QR)

// The right column, centred on its own middle and on the code's printed squares (DY): SCAN FOR A / FREE ESTIMATE in
// deep gold, an arrow to the code, the phone, the site with its red x.
const colX0 = QR.x + QR.size + 0.35, colX1 = W - 1.15, cx = (colX0 + colX1) / 2, colW = colX1 - colX0
const DY = 0.45
const scan1 = T('SCAN FOR A', { cap: 0.5, tracking: 0.12, fill: C.deep }), scan2 = T('FREE ESTIMATE', { cap: 0.5, tracking: 0.12, fill: C.deep })
const phone = T(PHONE, { fit: colW, fill: C.ink })
const site = redXSite({ w: colW * 0.72, base: 9.9, cx })
// The arrow (owner: "do we have a higher quality arrow?"): drawn like the divider, a shaft tapering to a fine point
// at its tail, and a solid head with swept-back, gently curved sides and a notched back; deep gold.
const ay = 6.15 + DY, ax0 = cx - 1.25, ax1 = cx + 1.25 // tip, tail
const headL = 0.5, headH = 0.34, notch = 0.16, shaft = 0.09
const P = (x, y) => `${fmt(x * U)} ${fmt(y * U)}`
const head = `M${P(ax0, ay)} Q${P(ax0 + headL * 0.45, ay - headH * 0.35)} ${P(ax0 + headL, ay - headH)} Q${P(ax0 + headL - notch * 0.6, ay - headH * 0.35)} ${P(ax0 + headL - notch, ay)} ` +
  `Q${P(ax0 + headL - notch * 0.6, ay + headH * 0.35)} ${P(ax0 + headL, ay + headH)} Q${P(ax0 + headL * 0.45, ay + headH * 0.35)} ${P(ax0, ay)} Z`
const tail = `M${P(ax0 + headL - notch - 0.02, ay - shaft / 2)} L${P(ax1, ay)} L${P(ax0 + headL - notch - 0.02, ay + shaft / 2)} Z`
const arrow = `<path fill="${C.deep}" d="${head} ${tail}"/>`
const right = scan1.svg(cx * U, (4.55 + DY) * U, 'middle') + scan2.svg(cx * U, (5.35 + DY) * U, 'middle') + arrow + phone.svg(cx * U, (8.15 + DY) * U, 'middle') + site

const { trim, bled, b } = pages(W, H, frame(W, H) + nameSvg + div + qr.svg + right)
const out = DIR + 'tailgate-magnet-18x12-cream-elsie'
for (const [file, s, w, h] of [[out, trim, W, H], [out + '-bleed', bled, W + 2 * b, H + 2 * b]]) {
  writeFileSync(file + '.svg', s)
  svgToPdf(s, w, h, file + '.pdf')
  await sharp(Buffer.from(s), { density: Math.sqrt(72 * 300) }).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(file + '.png')
}
console.log(`tailgate-magnet-18x12-cream-elsie: ${W} x ${H} in (and -bleed ${W + 2 * b} x ${H + 2 * b}); QR version ${qr.version}, ${qr.squares} squares, ${qr.moduleMm.toFixed(1)} mm each, ${QR.size} in with its quiet zone → ${qr.url}; phone ${(phone.cap / U).toFixed(2)} in tall`)
