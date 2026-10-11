// Print-ready crew-shirt artwork from the vector logo (assets-source/logo-vector),
// written to assets-source/shirts/ (not shipped). Run: node scripts/shirt-art.mjs
//
// Makes, at 300 dpi on a transparent background:
//   front-chest*.png   the stacked lockup 4 in wide (left chest)
//   back-full*.png     the lockup 12 in wide with the site and phone under it (full back)
// in three looks: full colour with the neon glow rasterised cleanly (faint haze
// clipped), full colour "flat" (solid outlines, no blur: the safe DTG upload) and
// one-colour white (screen print). Plus a navy preview of each and a same-scale sheet.
//
// Print prep, not a redesign: strokes thinner than 2 pt at the print size are
// thickened to 2 pt (an added stroke in the same colour) or dropped (specks, the
// small snowflakes, the wood-grain scratches at chest size). The lettering is
// stroked a little at chest size so the serifs and the 5.6-pt tagline hold up.
// Text under the back lockup comes from the site's Inter font via
// scripts/shirt-art-text.py (fontTools), as outlines: no fonts to install.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = new URL('../', import.meta.url)
const OUT = fileURLToPath(new URL('assets-source/shirts/', root))
const VEC = fileURLToPath(new URL('assets-source/logo-vector/', root))
const FONT = fileURLToPath(new URL('public/fonts/inter-latin.woff2', root))
const TEXT_PY = fileURLToPath(new URL('shirt-art-text.py', import.meta.url))

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

// Paths of the cottage group in reading order, checked against the files below.
const COLOR_ROLES = ['specks', 'snow', 'specks', 'smoke', 'wall', 'wallLines', 'windowInterior', 'windowGlow', 'windowFrame', 'doorGlow', 'door', 'doorLines', 'postsGlow', 'posts', 'postHighlights', 'ground', 'roofGlowOuter', 'roofGlowInner', 'roof', 'chimneyGlow', 'chimneyWhite', 'chimney', 'chimneyDot']
const WHITE_ROLES = ['snow', 'specks', 'smoke', 'wallLines', 'windowFrame', 'door', 'posts', 'ground', 'roof', 'chimneyWhite']
// Measured thickness of the thin parts, in units (erosion test on 2 px/unit renders, 2026-10-11).
// Glow strokes use their stroke-width. Fat fills (roof, ground, wall, door) need nothing.
const THICKNESS = { snow: 3.5, smoke: 9, wallLines: 3.5, doorLines: 4, postHighlights: 10, chimneyWhite: 6, chimney: 8, posts: 8, chimneyDot: 8, windowFrame: 11 }
// Dropped at chest size: too thin to print at 4 in and too small to thicken without turning to blobs.
const DROP_AT_CHEST = { color: ['wallLines', 'doorLines', 'postHighlights', 'chimneyWhite'], white: ['wallLines'] }
const FLAT_STROKE = { roofGlowOuter: 16 } // the blurred 26-unit roof glow becomes a solid 16-unit outline
// Lettering gets a small stroke too (units): Fraunces hairlines ~5, Inter tagline stems ~8.
const LETTER_EXTRA = { chest: { 0.095: 5, 0.030273: 3 }, back: { 0.095: 1, 0.030273: 0 } }

const unitsPerInch = (inches) => VB_W / inches
const minUnits = (inches) => (MIN_PT / 72) * unitsPerInch(inches) // 2 pt in units: chest 16, back 5.3
const fmt = (n) => String(Math.round(n * 100) / 100)

// --- SVG parsing (the logo files are flat: one cottage group, three lettering groups) ---
function parseLogo(file) {
  const svg = readFileSync(VEC + file, 'utf8')
  const defs = (svg.match(/<defs>[^]*?<\/defs>/) || [''])[0]
  const cottage = svg.match(/<g transform="translate\(565\.0 0\)">([^]*?)<\/g>/)[1]
  const paths = cottage.match(/<path[^>]*\/>/g).map(parseAttrs)
  const lettering = svg.match(/<g transform="translate\([\d.]+ [\d.]+\) scale\([^)]*\)"[^>]*>[^]*?<\/g>/g)
  if (lettering.length !== 3) throw new Error(`${file}: expected 3 lettering groups, found ${lettering.length}`)
  return { defs, paths, lettering }
}
function parseAttrs(tag) {
  const attrs = {}
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return attrs
}
const tag = (attrs) => '<path ' + Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ') + '/>'

function checkRoles(paths, roles, file) {
  if (paths.length !== roles.length) throw new Error(`${file}: ${paths.length} cottage paths, expected ${roles.length}; the role list in shirt-art.mjs needs a look`)
  const subpaths = (a) => (a.d.match(/M/g) || []).length
  const expect = {
    snow: (a) => subpaths(a) > 50, smoke: (a) => subpaths(a) === 2, wallLines: (a) => subpaths(a) > 30 && a.fill === '#ffffff',
    windowInterior: (a) => a.fill === '#0a2a52', roofGlowOuter: (a) => a['stroke-width'] === '26', windowGlow: (a) => a.stroke === '#c92ecf',
    chimney: (a) => a.fill === '#5fe757', chimneyDot: (a) => a.filter && a.fill === '#ffffff',
  }
  roles.forEach((r, i) => { if (expect[r] && !expect[r](paths[i])) throw new Error(`${file}: path ${i + 1} doesn't look like ${r}`) })
}

// --- snow: the 71 subpaths are snowflakes (several pieces each) and specks; keep the big flakes ---
function keepBigFlakes(d) {
  const subs = d.split('M').filter(Boolean)
  const boxes = subs.map((s) => {
    const nums = s.match(/-?\d+(\.\d+)?/g).map(Number)
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  const gap = 25
  const near = (a, b) => a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1
  const cluster = boxes.map(() => -1)
  let n = 0
  for (let i = 0; i < boxes.length; i++) {
    if (cluster[i] >= 0) continue
    const stack = [i]
    cluster[i] = n
    while (stack.length) {
      const a = stack.pop()
      boxes.forEach((b, j) => { if (cluster[j] < 0 && near(boxes[a], b)) { cluster[j] = n; stack.push(j) } })
    }
    n++
  }
  const kept = [], sizes = []
  for (let c = 0; c < n; c++) {
    const idx = boxes.map((_, i) => i).filter((i) => cluster[i] === c)
    const w = Math.max(...idx.map((i) => boxes[i].x1)) - Math.min(...idx.map((i) => boxes[i].x0))
    const h = Math.max(...idx.map((i) => boxes[i].y1)) - Math.min(...idx.map((i) => boxes[i].y0))
    if (Math.max(w, h) >= KEEP_FLAKE_MIN) { kept.push(...idx); sizes.push(`${Math.round(w)}x${Math.round(h)}`) }
  }
  return { d: kept.sort((a, b) => a - b).map((i) => 'M' + subs[i]).join(''), flakes: sizes, dropped: n - sizes.length }
}

// --- build one cottage group for a size and a look ---
function cottageGroup({ paths, roles }, size, look, log) {
  const need = minUnits(SIZES[size])
  const out = []
  for (let i = 0; i < paths.length; i++) {
    const role = roles[i]
    const a = { ...paths[i] }
    if (role === 'specks') continue
    if (size === 'chest' && DROP_AT_CHEST[look === 'white' ? 'white' : 'color'].includes(role)) { log.dropped.push(role); continue }
    if (role === 'snow') {
      const r = keepBigFlakes(a.d)
      a.d = r.d
      log.flakes = r.flakes
    }
    if (a.filter && look === 'flat') { // blurred glow: solid instead
      delete a.filter
      delete a.opacity
      if (FLAT_STROKE[role]) a['stroke-width'] = String(FLAT_STROKE[role])
    }
    if (a.fill === 'none') { // a stroke (the neon lines)
      const w = Number(a['stroke-width'])
      if (look !== 'glow' && w < need) { a['stroke-width'] = fmt(need); log.thickened.push(`${role} ${w}→${fmt(need)}`) }
    } else if (THICKNESS[role] && THICKNESS[role] < need) {
      const extra = need - THICKNESS[role]
      Object.assign(a, { stroke: a.fill, 'stroke-width': fmt(extra), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
      log.thickened.push(`${role} ${THICKNESS[role]}→${fmt(need)}`)
    }
    out.push(tag(a))
  }
  return '<g transform="translate(565.0 0)">' + out.join('\n') + '</g>'
}

function letteringGroups(lettering, size) {
  return lettering.map((g) => {
    const open = g.match(/<g [^>]*>/)[0]
    const scale = Number(open.match(/scale\(([\d.]+)/)[1])
    const extra = LETTER_EXTRA[size][scale] || 0
    if (!extra) return g
    const fill = open.match(/fill="([^"]*)"/)[1]
    return g.replace(open, open.replace('>', ` stroke="${fill}" stroke-width="${fmt(extra / scale)}" stroke-linejoin="round">`))
  })
}

// --- the site and phone under the back lockup, Inter Bold caps as outlines ---
const textCache = {}
function glyphs(text) {
  textCache[text] ??= JSON.parse(execFileSync('python', [TEXT_PY, FONT, '700', text], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  return textCache[text]
}
// Lays out one line centred in the viewBox. em in units (or fitWidth: as big as fits); tracking as a fraction of em.
// Returns the line's cap height and width, and at(baseline) gives the SVG with the baseline at that y.
function textLine(text, { em, fitWidth, tracking = 0.06, fill = '#ffffff' }) {
  const { upem, capHeight, glyphs: gs } = glyphs(text)
  const advEm = gs.reduce((s, g) => s + g.advance, 0) / upem + tracking * (gs.length - 1)
  if (fitWidth) em = fitWidth / advEm
  const s = em / upem
  const width = advEm * em
  let x = VB_W / 2 - width / 2
  const parts = []
  for (const g of gs) {
    if (g.d) parts.push(`<path transform="translate(${fmt(x)} 0) scale(${s} ${-s})" d="${g.d}"/>`)
    x += g.advance * s + tracking * em
  }
  const cap = (capHeight / upem) * em
  return { width, cap, em, at: (baseline) => `<g transform="translate(0 ${fmt(baseline)})" fill="${fill}">${parts.join('')}</g>` }
}

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
const color = parseLogo('clc-logo-stacked-color.svg')
checkRoles(color.paths, COLOR_ROLES, 'clc-logo-stacked-color.svg')
const white = parseLogo('clc-logo-stacked-one-color-white.svg')
checkRoles(white.paths, WHITE_ROLES, 'clc-logo-stacked-one-color-white.svg')

const made = [] // for the console table and the sheet
for (const [name, size, look] of [
  ['front-chest', 'chest', 'glow'], ['front-chest-flat', 'chest', 'flat'], ['front-chest-one-color-white', 'chest', 'white'],
  ['back-full', 'back', 'glow'], ['back-full-flat', 'back', 'flat'], ['back-full-one-color-white', 'back', 'white'],
]) {
  const src = look === 'white' ? { ...white, roles: WHITE_ROLES } : { ...color, roles: COLOR_ROLES }
  const log = { thickened: [], dropped: [], flakes: [] }
  const body = [cottageGroup(src, size, look, log), ...letteringGroups(src.lettering, size)]
  let bottom = 1752 + VB_TOP // the lockup's own bottom edge
  const notes = []
  if (size === 'back') {
    const site = textLine(SITE, { fitWidth: VB_W - 120 })
    const siteBase = 1634 + 100 + site.cap // tagline baseline + gap + cap height
    const phone = textLine(PHONE, { em: 182 })
    const phoneBase = siteBase + 55 + phone.cap
    body.push(site.at(siteBase), phone.at(phoneBase))
    bottom = phoneBase + 45
    const inch = 1 / unitsPerInch(SIZES.back)
    notes.push(`site caps ${(site.cap * inch).toFixed(2)} in tall, ${(site.width * inch).toFixed(1)} in wide; phone caps ${(phone.cap * inch).toFixed(2)} in tall, ${(phone.width * inch).toFixed(1)} in wide`)
  }
  const vbH = bottom - VB_TOP
  const widthPx = SIZES[size] * DPI
  const heightPx = Math.round((vbH * widthPx) / VB_W)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${VB_TOP} ${VB_W} ${fmt(vbH)}" width="${widthPx}" height="${heightPx}">${look === 'glow' ? color.defs : ''}${body.join('\n')}</svg>`
  const png = await raster(svg, widthPx, heightPx, { haze: look === 'glow' })
  writeFileSync(`${OUT}${name}.png`, png)
  await preview(name, png, size === 'back' ? 0.5 : 1)
  made.push({ name, size, look, png, widthPx, heightPx })
  console.log(`${name}.png  ${widthPx}x${heightPx} px = ${SIZES[size]} x ${(heightPx / DPI).toFixed(2)} in at ${DPI} dpi, ${Math.round(png.length / 1024)} KB`)
  console.log(`   min line ${MIN_PT} pt = ${fmt(minUnits(SIZES[size]))} units; thickened: ${log.thickened.join(', ') || 'nothing'}; dropped: ${['specks', ...log.dropped].join(', ')}; snowflakes kept: ${log.flakes.join(', ')}`)
  for (const n of notes) console.log('   ' + n)
}

// Same-scale sheet: chest and back side by side at 100 px per inch, so the proportion on a shirt is visible.
{
  const PPI = 100, pad = 60
  const items = made.filter((m) => m.look !== 'glow')
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
