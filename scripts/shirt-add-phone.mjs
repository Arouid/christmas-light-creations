// The phone (and the name, where a design has none) under every back print that lacks them (owner, 2026-10-16:
// "very few back pieces have the business name and phone number on them"). Each design keeps its art; under it, in
// Montserrat like the truck magnet: CHRISTMAS LIGHT CREATIONS (only where the art has no name), 281-819-0163 and
// clcxmas.com, in an
// ink the design already prints (white or cream on navy, navy on gold and light shirts), so a screen print needs no
// extra colour. A print taller than 16 in with its footer is scaled down to 16 in (a DTG platen is 14 x 16).
// Writes <file>-phone.png beside each source (300 dpi, transparent), and -phone.svg / .pdf where the source has a vector.
// Run: node scripts/shirt-add-phone.mjs, then node scripts/shirt-print-ready.mjs (which lists the -phone versions).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { BACKS } from './lib/backsWithPhone.mjs'
import { MONTSERRAT, PHONE, redXSite, T, U } from './lib/elsieParts.mjs'
import { fmt, unifyNavy } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const SHIRTS = fileURLToPath(new URL('../assets-source/shirts/', import.meta.url))
const DPI = 300, MAX_H = 16
// clcxmas.com's cap height per inch of its width, as redXSite sets it (Montserrat Bold, 0.01 em tracking)
const capPerWidth = (() => { const t = T('clcxmas.com', { font: MONTSERRAT, wght: 700, fit: 1, tracking: 0.01 }); return t.cap / U })()
// The footer for art w inches wide: [name], phone, site; returns { h (inches), svg(y0) in drawing units of U per inch }.
function footer(w, ink, withName) {
  const phone = T(PHONE, { font: MONTSERRAT, wght: 600, fit: w * 0.62, tracking: 0.01, fill: ink })
  const name = withName ? T('CHRISTMAS LIGHT CREATIONS', { font: MONTSERRAT, wght: 600, fit: w * 0.8, tracking: 0.12, fill: ink }) : null
  // the site under the phone (owner: "clcxmas.com should be on there"), its x red like the magnets' ("red x like
  // everything else"; a screen print adds the red, which most of the designs already print)
  const siteW = w * 0.4, siteCap = siteW * capPerWidth
  const gap = 0.45, between = 0.32, under = 0.3
  const nameH = name ? name.cap / U + between : 0
  const phoneBase = gap + nameH + phone.cap / U, h = phoneBase + under + siteCap + 0.1 // + the p's descender
  return { h, svg: (y0) => (name ? name.svg((w / 2) * U, (y0 + gap + name.cap / U) * U, 'middle') : '') + phone.svg((w / 2) * U, (y0 + phoneBase) * U, 'middle') +
    redXSite({ w: siteW, base: y0 + phoneBase + under + siteCap, cx: w / 2, ink }) }
}

for (const [file, ink, withName] of BACKS) {
  const png = SHIRTS + file + '.png'
  if (!existsSync(png)) { console.log(`${file}: not on this computer, skipped`); continue }
  const { width, height } = await sharp(png).metadata()
  const w = width / DPI, h = height / DPI
  const f = footer(w, ink, withName)
  const total = h + f.h, k = total > MAX_H ? MAX_H / total : 1 // scale to fit 16 in tall
  const out = SHIRTS + file + '-phone'
  // PNG: the art as printed, the footer drawn under it at the same 300 dpi, then scaled if too tall.
  const foot = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w * DPI)}" height="${fmt(f.h * DPI)}" viewBox="0 ${fmt(h * U)} ${fmt(w * U)} ${fmt(f.h * U)}">${unifyNavy(f.svg(h))}</svg>`)
  const footPng = await sharp(foot).png().toBuffer()
  const tall = await sharp(png).extend({ bottom: Math.round(f.h * DPI), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .composite([{ input: footPng, left: 0, top: height }]).png().toBuffer()
  await sharp(tall).resize({ width: Math.round(width * k), kernel: 'lanczos3' }).withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toFile(out + '.png')
  // Vector: the source SVG nested at the top, the footer under it.
  if (existsSync(SHIRTS + file + '.svg')) {
    const src = readFileSync(SHIRTS + file + '.svg', 'utf8')
    const root = src.match(/<svg[^>]*>/)[0], vb = root.match(/viewBox="([^"]*)"/)[1]
    const inner = src.slice(src.indexOf(root) + root.length).replace(/<\/svg>\s*$/, '')
    const ns = root.includes('xmlns:xlink') ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : ''
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"${ns} width="${fmt(w * k)}in" height="${fmt(total * k)}in" viewBox="0 0 ${fmt(w * U)} ${fmt(total * U)}">` +
      `<svg x="0" y="0" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${vb}" preserveAspectRatio="none">${inner}</svg>${unifyNavy(f.svg(h))}</svg>`
    writeFileSync(out + '.svg', svg)
    svgToPdf(svg, w * k, total * k, out + '.pdf')
  }
  console.log(`${file}-phone: ${(w * k).toFixed(2)} x ${(total * k).toFixed(2)} in${k < 1 ? ` (scaled to ${MAX_H} in tall)` : ''}${withName ? ', name + phone' : ', phone'}`)
}
