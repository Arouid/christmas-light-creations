// The 24 x 18 in yard / corner sign in the truck magnet's cream "Elsie" look (owner, 2026-10-16: "18x24 yard sign";
// pieces in scripts/lib/elsieParts.mjs). Read from a car at a corner, so: the name across the top with the gold
// sparkle divider, what we do (the road sign's own service line, scripts/print-vectors.mjs), a big QR code (7 in of
// printed squares, the old sign's was 4.8 in) with SCAN FOR A FREE ESTIMATE, and beside it FREE ESTIMATES, the phone
// as the biggest thing, clcxmas.com; along the bottom the town and the trust line. Square corners (coroplast), the
// frame's corners rounded.
// The QR code is tagged ?sign=<code> like the corner signs (src/lib/sign.js; the Signs tab counts each corner):
//   node scripts/print-yard-sign.mjs                         one sign, ?sign=road-sign
//   node scripts/print-yard-sign.mjs --signs broadway-288 cr-59   one sign per corner code
// → recraft/yard-sign-24x18-elsie[-<code>].{svg,pdf,png} (24 x 18 in, the cut) and -bleed (25 x 19 in: the upload).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { C, divider, elsieName, frame, pages, PHONE, qrCode, redXSite, T, U } from './lib/elsieParts.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const W = 24, H = 18 // inches
const SERVICE = 'INSTALLED · SERVICED ALL SEASON · TAKEN DOWN IN JANUARY' // as on the road sign (print-vectors.mjs)
const AREA = 'PEARLAND, TX · SERVING SOUTH HOUSTON SINCE 2011 · FAMILY-OWNED & INSURED'
const args = process.argv.slice(2)
const slug = (s) => s.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const codes = args.includes('--signs') ? args.slice(args.indexOf('--signs') + 1).map(slug).filter(Boolean) : ['road-sign']

for (const code of codes) {
  const nameSvg = elsieName([{ text: 'christmas light creations', x0: 1.6, x1: W - 1.6, base: 3.0 }], 1.25)
  const div = divider(W / 2, 4.05, 6.5, { r: 0.32, gap: 0.24, t: 0.085 })
  const service = T(SERVICE, { fit: 21, tracking: 0.05, fill: C.deep })
  // The code on the left, SCAN FOR A FREE ESTIMATE under it.
  const QR = { x: 1.3, y: 6.1, size: 8.0 }
  const qr = qrCode(code, QR)
  const qrCx = QR.x + QR.size / 2
  const scan = T('SCAN FOR A FREE ESTIMATE', { fit: QR.size * 0.9, tracking: 0.06, fill: C.deep })
  // The right column, centred on the code's printed squares.
  const colX0 = QR.x + QR.size + 0.5, colX1 = W - 1.3, cx = (colX0 + colX1) / 2, colW = colX1 - colX0
  const free = T('FREE ESTIMATES', { cap: 0.75, tracking: 0.14, fill: C.deep })
  const phone = T(PHONE, { fit: colW * 0.98, fill: C.ink })
  const site = redXSite({ w: colW * 0.62, base: 12.95, cx })
  const area = T(AREA, { wght: 500, fit: 21, tracking: 0.06, fill: C.ink })
  const body = frame(W, H) + nameSvg + div + service.svg((W / 2) * U, 5.45 * U, 'middle') + qr.svg + scan.svg(qrCx * U, 14.8 * U, 'middle') +
    free.svg(cx * U, 8.0 * U, 'middle') + phone.svg(cx * U, 10.85 * U, 'middle') + site + area.svg((W / 2) * U, 16.55 * U, 'middle')
  const { trim, bled, b } = pages(W, H, body, { radius: 0 })
  const out = DIR + 'yard-sign-24x18-elsie' + (code === 'road-sign' ? '' : `-${code}`)
  for (const [file, s, w, h] of [[out, trim, W, H], [out + '-bleed', bled, W + 2 * b, H + 2 * b]]) {
    writeFileSync(file + '.svg', s)
    svgToPdf(s, w, h, file + '.pdf')
    await sharp(Buffer.from(s), { density: Math.sqrt(72 * 200) }).withMetadata({ density: 200 }).png({ compressionLevel: 9 }).toFile(file + '.png')
  }
  console.log(`${out.split('/').pop()}: ${W} x ${H} in (and -bleed); QR ${qr.url}, version ${qr.version}, ${qr.moduleMm.toFixed(1)} mm squares; phone ${(phone.cap / U).toFixed(2)} in tall, service line ${(service.cap / U).toFixed(2)} in, scan line ${(scan.cap / U).toFixed(2)} in, bottom line ${(area.cap / U).toFixed(2)} in`)
}
