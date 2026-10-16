// Print-ready crew-shirt artwork from the vector logo (assets-source/brand/logo-vector),
// written to assets-source/shirts/ (not shipped). Run: node scripts/shirt-art.mjs
//
// Makes, at 300 dpi on a transparent background:
//   front-chest*.png   the stacked lockup 4 in wide (left chest)
//   back-full*.png     the lockup 12 in wide with the site and phone under it (full back)
// in three looks: full colour with the neon glow rasterised cleanly (faint haze
// clipped), full colour "flat" (solid outlines, no blur: the safe DTG upload) and
// one-colour white (screen print). Plus a navy preview of each and a same-scale sheet.
// And "-flat-knockout" for navy shirts: the flat look without the dark wall and window
// (owner, 2026-10-16, of a dark-shirt proof: "why is this showing up faded"). On a dark shirt
// DTG lays white under every inked pixel, so the logo's near-navy wall prints as a greyish
// patch lighter than the shirt; left out, the shirt itself is the wall.
//
// Print prep, not a redesign: strokes thinner than 2 pt at the print size are
// thickened to 2 pt (an added stroke in the same colour) or dropped (specks, the
// small snowflakes, the wood-grain scratches at chest size). The lettering is
// stroked a little at chest size so the serifs and the 5.6-pt tagline hold up.
// Text under the back lockup is Inter Bold as outlines (scripts/lib/logoArt.mjs).
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { checkRoles, COLOR_ROLES, fmt, letteringGroups, parseLogo, prepCottage, textLine, unifyNavy, WHITE_ROLES } from './lib/logoArt.mjs'

const OUT = fileURLToPath(new URL('../assets-source/shirts/', import.meta.url))

const DPI = 300
const VB_W = 2300 // width of the stacked logos' viewBox (units)
const VB_TOP = -18
const NAVY = '#1b2340' // preview "fabric" (Bella+Canvas navy, roughly)
const MIN_PT = 2 // thinnest line that prints reliably, in points at print size
const SIZES = { chest: 4, back: 12 } // print width in inches
const KEEP_FLAKE_MIN = 100 // keep snowflakes at least this wide (units): the big one and the two medium ones
const HAZE = 0.2 // glow look: alpha below this is cut (no faint fringe for the white underbase to pick up)
const SITE = 'CHRISTMAS-LIGHT-CREATIONS.COM'
const PHONE = '281-819-0163'

// Dropped at chest size: too thin to print at 4 in and too small to thicken without turning to blobs.
const DROP_AT_CHEST = { color: ['wallLines', 'doorLines', 'postHighlights', 'chimneyWhite'], white: ['wallLines'] }
// Lettering gets a small stroke too (units, keyed by the group's scale): Fraunces hairlines ~5, Inter tagline stems ~8.
const LETTER_EXTRA = { chest: { 0.095: 5, 0.030273: 3 }, back: { 0.095: 1, 0.030273: 0 } }

const unitsPerInch = (inches) => VB_W / inches
const minUnits = (inches) => (MIN_PT / 72) * unitsPerInch(inches) // 2 pt in units: chest 16, back 5.3

// --- raster ---
async function raster(svg, widthPx, heightPx, { haze = false } = {}) {
  let img = sharp(Buffer.from(svg), { density: 72 }).ensureAlpha()
  if (haze) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i] / 255
      data[i] = a <= HAZE ? 0 : Math.round(255 * Math.min(1, (a - HAZE) / (1 - HAZE)))
    }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  }
  const png = await img.withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
  const meta = await sharp(png).metadata()
  if (meta.width !== widthPx || meta.height !== heightPx) throw new Error(`rendered ${meta.width}x${meta.height}, wanted ${widthPx}x${heightPx}`)
  return png
}

async function preview(name, png, scale) {
  const meta = await sharp(png).metadata()
  const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale)
  const m = Math.round(w * 0.08)
  const art = scale === 1 ? png : await sharp(png).resize({ width: w }).png().toBuffer()
  await sharp({ create: { width: w + 2 * m, height: h + 2 * m, channels: 4, background: NAVY } })
    .composite([{ input: art, left: m, top: m }]).png().toFile(`${OUT}preview-${name}.png`)
}

// --- main ---
mkdirSync(OUT, { recursive: true })
const color = checkRoles(parseLogo('clc-logo-stacked-color.svg'), COLOR_ROLES)
const white = checkRoles(parseLogo('clc-logo-stacked-one-color-white.svg'), WHITE_ROLES)

const made = [] // for the console table and the sheet
for (const [name, size, look, knock = []] of [
  ['front-chest', 'chest', 'glow'], ['front-chest-flat', 'chest', 'flat'], ['front-chest-one-color-white', 'chest', 'white'],
  ['back-full', 'back', 'glow'], ['back-full-flat', 'back', 'flat'], ['back-full-one-color-white', 'back', 'white'],
  ['front-chest-flat-knockout', 'chest', 'flat', ['wall', 'windowInterior']], ['back-full-flat-knockout', 'back', 'flat', ['wall', 'windowInterior']],
]) {
  const logo = look === 'white' ? white : color
  const roles = look === 'white' ? WHITE_ROLES : COLOR_ROLES
  const drop = ['specks', ...(size === 'chest' ? DROP_AT_CHEST[look === 'white' ? 'white' : 'color'] : []), ...knock]
  const cottage = prepCottage(logo, roles, { minUnits: minUnits(SIZES[size]), look, drop, keepFlakeMin: KEEP_FLAKE_MIN })
  const body = [cottage.svg, ...letteringGroups(logo.lettering, LETTER_EXTRA[size])]
  let bottom = 1752 + VB_TOP // the lockup's own bottom edge
  const notes = []
  if (size === 'back') {
    const site = textLine(SITE, { fitWidth: VB_W - 120 })
    const siteBase = 1634 + 100 + site.cap // tagline baseline + gap + cap height
    const phone = textLine(PHONE, { em: 182 })
    const phoneBase = siteBase + 55 + phone.cap
    body.push(site.svg(VB_W / 2, siteBase, 'middle'), phone.svg(VB_W / 2, phoneBase, 'middle'))
    bottom = phoneBase + 45
    const inch = 1 / unitsPerInch(SIZES.back)
    notes.push(`site caps ${(site.cap * inch).toFixed(2)} in tall, ${(site.width * inch).toFixed(1)} in wide; phone caps ${(phone.cap * inch).toFixed(2)} in tall, ${(phone.width * inch).toFixed(1)} in wide`)
  }
  const vbH = bottom - VB_TOP
  const widthPx = SIZES[size] * DPI
  const heightPx = Math.round((vbH * widthPx) / VB_W)
  const svg = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${VB_TOP} ${VB_W} ${fmt(vbH)}" width="${widthPx}" height="${heightPx}">${look === 'glow' ? logo.defs : ''}${body.join('\n')}</svg>`)
  const png = await raster(svg, widthPx, heightPx, { haze: look === 'glow' })
  writeFileSync(`${OUT}${name}.png`, png)
  await preview(name, png, size === 'back' ? 0.5 : 1)
  made.push({ name, size, look, png, widthPx, heightPx })
  console.log(`${name}.png  ${widthPx}x${heightPx} px = ${SIZES[size]} x ${(heightPx / DPI).toFixed(2)} in at ${DPI} dpi, ${Math.round(png.length / 1024)} KB`)
  console.log(`   min line ${MIN_PT} pt = ${fmt(minUnits(SIZES[size]))} units; thickened: ${cottage.log.thickened.join(', ') || 'nothing'}; dropped: ${cottage.log.dropped.join(', ')}; snowflakes kept: ${cottage.log.flakes.join(', ')}`)
  for (const n of notes) console.log('   ' + n)
}

// Same-scale sheet: chest and back side by side at 100 px per inch, so the proportion on a shirt is visible.
{
  const PPI = 100, pad = 60
  const items = made.filter((m) => m.look !== 'glow' && !m.name.endsWith('-knockout'))
  const cells = await Promise.all(items.map(async (m) => {
    const w = Math.round(SIZES[m.size] * PPI)
    const buf = await sharp(m.png).resize({ width: w }).png().toBuffer()
    const h = Math.round((m.heightPx / m.widthPx) * w)
    return { ...m, buf, w, h }
  }))
  const head = 90 // two label lines above each row
  const rowH = Math.max(...cells.map((c) => c.h)) + 2 * pad + head
  const colW = { chest: SIZES.chest * PPI + 2 * pad, back: SIZES.back * PPI + 2 * pad }
  const W = colW.chest + colW.back, H = rowH * 2
  const comps = []
  const labels = []
  cells.forEach((c) => {
    const row = c.look === 'white' ? 1 : 0
    const left = (c.size === 'chest' ? 0 : colW.chest) + pad
    comps.push({ input: c.buf, left, top: row * rowH + pad + head })
    const what = c.look === 'white' ? 'one colour white (screen print)' : 'full colour flat (digital/DTG)'
    const y = row * rowH + pad + (c.size === 'chest' ? 10 : 48)
    labels.push(`<text x="${pad}" y="${y}" fill="#c9d1e6" font-family="sans-serif" font-size="28">${c.name}.png: ${c.size === 'chest' ? 'left chest, 4 in wide' : 'full back, 12 in wide'}, ${what}</text>`)
  })
  comps.push({ input: Buffer.from(`<svg width="${W}" height="${H}">${labels.join('')}<text x="${W - pad}" y="${H - 20}" text-anchor="end" fill="#8d97b3" font-family="sans-serif" font-size="24">same scale: 100 px = 1 in</text></svg>`), left: 0, top: 0 })
  await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } }).composite(comps).png().toFile(`${OUT}preview-sheet.png`)
  console.log(`preview-sheet.png  ${W}x${H}`)
}
