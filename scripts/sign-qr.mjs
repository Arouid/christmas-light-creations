// QR codes for road signs: one per corner, so leads show which sign
// brought them in ("Road sign (Broadway 288)" on the lead).
//
//   npm run sign-qr -- broadway-288 "dixie farm and 35" cr-59
//
// Writes print-ready SVGs (scale to any size) and PNGs to signs/qr/.
import { mkdir, writeFile } from 'node:fs/promises'
import QRCode from 'qrcode'

const SITE = 'https://christmas-light-creations.com/'
const codes = process.argv.slice(2).map((c) => c.toLowerCase().trim().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)).filter(Boolean)
if (!codes.length) {
  console.log('Usage: npm run sign-qr -- <corner> [<corner> ...]   e.g. npm run sign-qr -- broadway-288 dixie-farm-35')
  process.exit(1)
}

const dir = new URL('../signs/qr/', import.meta.url)
await mkdir(dir, { recursive: true })
// High error correction: signs get dirty, wet and scratched outdoors.
const opts = { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#000000', light: '#ffffff' } }
for (const code of codes) {
  const url = `${SITE}?sign=${code}`
  await writeFile(new URL(`${code}.svg`, dir), await QRCode.toString(url, { ...opts, type: 'svg' }))
  await writeFile(new URL(`${code}.png`, dir), await QRCode.toBuffer(url, { ...opts, width: 1500 }))
  console.log(`${code}: ${url}`)
}
console.log(`\nSaved to signs/qr/. Print at least 4 inches wide so phones can scan from a car.`)
