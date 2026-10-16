// The truck magnet with the owner's 3D cottage (assets-source/shirts/recraft/door-magnet-clc.png, an AI render,
// 4096 x 2286, not in git). Owner, 2026-10-16, picked it ("number 2 in 4k") after the critique: lovely cottage, but
// its words were baked into the picture and the phone was about an inch tall. So only the cottage is used, cut out
// and faded into a flat background of its own colour, and the words are set in our fonts as vectors, the phone the
// biggest thing on the door. Two versions:
// - navy: the whole magnet the render's night colour, words in cream and gold (light trucks).
// - cream (owner: "can we do a cream background version of the magnets?"): a cream magnet with the cottage in a
//   round night window, words in navy and dark gold (dark trucks, or simply a lighter look).
// Run: node scripts/print-magnet-art.mjs   → recraft/vehicle-magnet-24x12-cottage-3d[-cream].{pdf,png,svg}
// (24 x 12 in, 0.75-in rounded corners; the picture embedded at about 150 dpi, the text vector).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { FONTS, fmt, glyphs, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SRC = DIR + 'door-magnet-clc.png'
const W = 24, H = 12, U = 100 // inches; SVG units per inch
// The cottage in the render (fractions of its width and height): between the baked-in title and the bottom rule.
const CROP = { x0: 0.285, x1: 0.715, y0: 0.19, y1: 0.835 } // y0 below the title's descenders
const MARGIN = 1.3, GUTTER = 1.0 // outer margin, gap between the cottage and the words
const PHONE = '281-819-0163', SITE = 'christmas-light-creations.com'
const THEMES = {
  navy: { file: 'vehicle-magnet-24x12-cottage-3d', houseH: 6.6, name: '#F3E6C8', accent: '#E2B65C', phone: '#E2B65C', site: '#F3E6C8' }, // the render's cream and gold
  cream: { file: 'vehicle-magnet-24x12-cottage-3d-cream', paper: '#F7F1E3', window: 5.0, houseH: 5.6, name: '#0C2341', accent: '#9A7020', phone: '#0C2341', site: '#3C4A63' },
}

const meta = await sharp(SRC).metadata()
const crop = { left: Math.round(CROP.x0 * meta.width), top: Math.round(CROP.y0 * meta.height), width: Math.round((CROP.x1 - CROP.x0) * meta.width), height: Math.round((CROP.y1 - CROP.y0) * meta.height) }
const cut = await sharp(SRC).extract(crop).png().toBuffer()
// The night colour: the median of the crop's top and side edges (the bottom edge is snow), so the fade meets it
// without a seam.
const edge = await sharp(cut).resize(40, 40, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
const ring = []
for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (x < 3 || y < 3 || x > 36) ring.push([0, 1, 2].map((c) => edge.data[(y * 40 + x) * 3 + c]))
const median = [0, 1, 2].map((c) => ring.map((p) => p[c]).sort((a, b) => a - b)[ring.length >> 1])
const NIGHT = '#' + median.map((v) => v.toString(16).padStart(2, '0')).join('')
// Fade: an ellipse, solid in the middle, clear at the crop's edges.
const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}"><defs><radialGradient id="f" cx="50%" cy="54%" r="54%">` +
  `<stop offset="0.62" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`)
// and a second fade over the bottom seventh, so the snow melts into the night with no edge where the picture ends.
const floor = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#b)"/></svg>`)
const art = await sharp(await sharp(cut).ensureAlpha().composite([{ input: await sharp(fade).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer())
  .composite([{ input: await sharp(floor).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer()
const href = `data:image/png;base64,${art.toString('base64')}`
// Where the cottage really is inside the crop (its snow and neon, not the dark around it), so it is placed and
// balanced by what the eye sees, not by the picture's box.
const probe = await sharp(art).resize({ width: 200 }).raw().toBuffer({ resolveWithObject: true })
let vx0 = Infinity, vy0 = Infinity, vx1 = -1, vy1 = -1
for (let y = 0; y < probe.info.height; y++) for (let x = 0; x < probe.info.width; x++) {
  const i = (y * probe.info.width + x) * 4, d = probe.data
  if ((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * (d[i + 3] / 255) > 70) { vx0 = Math.min(vx0, x); vx1 = Math.max(vx1, x); vy0 = Math.min(vy0, y); vy1 = Math.max(vy1, y) }
}
const k = crop.width / probe.info.width // probe px → crop px
// The picture sized so the cottage itself is houseH inches tall, with the cottage's centre at (cx, cy) or its left
// edge at left.
function place(houseH, { cx, left, cy }) {
  const artH = (houseH * crop.height) / ((vy1 - vy0 + 1) * k), inch = artH / crop.height
  const x = left !== undefined ? left - vx0 * k * inch : cx - ((vx0 + vx1 + 1) / 2) * k * inch
  const y = cy - ((vy0 + vy1 + 1) / 2) * k * inch
  return { x, y, w: crop.width * inch, h: artH, right: x + (vx1 + 1) * k * inch, dpi: Math.round(crop.height / artH) }
}

const T = (s, { font = FONTS.inter, location = { wght: 800 }, cap, fit, tracking = 0.02, fill }) => {
  const g = glyphs(s, font, location)
  return textLine(s, { font, location, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
}
// The words, one calm centred block (owner, of the first layout: "some of the fonts are offputting and things kind
// of just clash"): the name in Fraunces at a lighter weight; FREE ESTIMATES small between thin rules; the phone in
// Inter (Fraunces' hairline numerals vanish at a distance), the biggest thing; the site on its own line, big enough
// to read when parked (owner: "website might as well not be on there" at 0.2 in). Centred on the door's middle line.
function words(th, col) {
  const colW = W - MARGIN - col, cx = col + colW / 2
  const serif = { font: FONTS.fraunces, location: { opsz: 144, wght: 600 }, tracking: 0, fill: th.name }
  const name1 = T('Christmas Light', { ...serif, fit: colW * 0.92 })
  const name2 = T('Creations', { ...serif, cap: name1.cap / U })
  const tag = T('FREE ESTIMATES', { location: { wght: 600 }, cap: 0.3, tracking: 0.26, fill: th.accent })
  const phone = T(PHONE, { location: { wght: 600 }, fit: colW * 0.94, tracking: 0.01, fill: th.phone })
  const foot = T(SITE, { location: { wght: 600 }, fit: colW * 0.88, tracking: 0.01, fill: th.site })
  const r1 = name1.cap / U, r2 = r1 + (name1.cap / U) * 1.38, rTag = r2 + 1.05, rPhone = rTag + 0.55 + phone.cap / U, rFoot = rPhone + 0.6 + foot.cap / U
  const top = H / 2 - rFoot / 2
  const [b1, b2, bTag, bPhone, bFoot] = [r1, r2, rTag, rPhone, rFoot].map((r) => top + r)
  const half = tag.width / U / 2, gap = 0.3
  const rule = (x0, x1) => `<rect x="${fmt(x0 * U)}" y="${fmt((bTag - 0.165) * U)}" width="${fmt((x1 - x0) * U)}" height="${fmt(0.03 * U)}" fill="${th.accent}"/>`
  return [name1.svg(cx * U, b1 * U, 'middle'), name2.svg(cx * U, b2 * U, 'middle'),
    rule(col + 0.4, cx - half - gap), tag.svg(cx * U, bTag * U, 'middle'), rule(cx + half + gap, col + colW - 0.4),
    phone.svg(cx * U, bPhone * U, 'middle'), foot.svg(cx * U, bFoot * U, 'middle')]
}
const image = (p) => `<image x="${fmt(p.x * U)}" y="${fmt(p.y * U)}" width="${fmt(p.w * U)}" height="${fmt(p.h * U)}" href="${href}"/>`

for (const [theme, th] of Object.entries(THEMES)) {
  let body, p, col
  if (theme === 'navy') {
    p = place(th.houseH, { left: MARGIN, cy: H / 2 })
    col = p.right + GUTTER
    body = [`<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${NIGHT}"/>`, image(p), ...words(th, col)]
  } else {
    // The round night window: a circle of the render's night colour, the cottage inside it, clipped to it.
    const r = th.window, wx = MARGIN + r - 0.3, wy = H / 2
    p = place(th.houseH, { cx: wx, cy: wy + 0.15 })
    col = wx + r + GUTTER
    body = [`<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${th.paper}"/>`,
      `<defs><clipPath id="window"><circle cx="${fmt(wx * U)}" cy="${fmt(wy * U)}" r="${fmt(r * U)}"/></clipPath></defs>`,
      `<circle cx="${fmt(wx * U)}" cy="${fmt(wy * U)}" r="${fmt(r * U)}" fill="${NIGHT}"/>`, `<g clip-path="url(#window)">${image(p)}</g>`,
      `<circle cx="${fmt(wx * U)}" cy="${fmt(wy * U)}" r="${fmt((r + 0.12) * U)}" fill="none" stroke="${th.accent}" stroke-width="${fmt(0.05 * U)}"/>`,
      ...words(th, col)]
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">${body.join('')}</svg>`
  const out = DIR + th.file
  writeFileSync(out + '.svg', svg)
  svgToPdf(svg, W, H, out + '.pdf')
  // librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
  const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).png().toBuffer()
  await sharp(png).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
  // A drive-by check: the magnet at 1/40 size, about how it reads from 50 feet.
  await sharp(png).resize({ width: Math.round((W * 150) / 40) }).png().toFile(out + '-50ft.png')
  console.log(`${th.file}: ${W} x ${H} in, night ${NIGHT}, cottage ${fmt(p.w)} x ${fmt(p.h)} in at ${p.dpi} dpi, words from ${fmt(col)} in`)
}

// --- the flat magnets (owner: "Lets try a just flat gold and blue magnet with that font", "use one of the flat blue
// cottages we have now"): the flat cottage from his Recraft logo batch (recraft/navy-cottage.svg, its shapes 1–7; the
// file's lettering below is left out), the name as the exact lettering of his Recraft wordmark (recraft/
// minimal-clc-name.svg, owner: "you have this exact image vector you can use"; its gold dot kept), the other lines in
// Outfit, the Google Font closest to it (OFL, assets-source/brand/fonts/outfit/): gold on blue or blue on gold (two
// inks; the cottage's snow band, a
// gap in the drawing, and its window panes show the ground), and cream (owner: "my truck is red and I just think the
// cream color will look a lot nicer"): blue on cream with the window panes gold, the small line in a deeper gold.
const OUTFIT = fileURLToPath(new URL('../assets-source/brand/fonts/outfit/Outfit-Variable.ttf', import.meta.url))
const FLAT = { blue: '#1F304B', gold: '#D4AF63' } // the flat cottage's own navy and window gold
const flatSrc = readFileSync(DIR + 'navy-cottage.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const flatPaths = [...flatSrc.matchAll(/<path ([^>]*)\/>/g)].map((m) => ({ fill: m[1].match(/fill="([^"]*)"/)[1].toUpperCase(), d: m[1].match(/ d="([^"]*)"/)[1] }))
const HOUSE_PATHS = [1, 2, 3, 4, 5, 6, 7], HOUSE_BOX = [217, 276, 705, 740] // checked below
{
  const n = HOUSE_PATHS.flatMap((i) => flatPaths[i].d.match(/-?[0-9.]+/g).map(Number))
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round)
  if (b.some((v, i) => Math.abs(v - HOUSE_BOX[i]) > 2)) throw new Error(`navy-cottage.svg: shapes 1–7 are not the cottage any more (box ${b})`)
}
// A cottage drawing (paths in order, its box) h inches tall at x, centred on cy: inkOf gives each shape its ink, or
// null to cut it out (drawn over the shapes under it, so the ground shows through).
function cottageArt(paths, [x0, y0, x1, y1], inkOf, { x, cy, h }) {
  const w = (h * (x1 - x0)) / (y1 - y0)
  const area = `x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"`
  const mask = paths.map((p) => `<path fill="${inkOf(p) ? '#fff' : '#000'}" d="${p.d}"/>`).join('')
  const shapes = paths.filter(inkOf).map((p) => `<path fill="${inkOf(p)}" d="${p.d}"/>`).join('')
  return { w, svg: `<svg x="${fmt(x * U)}" y="${fmt((cy - h / 2) * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">` +
    `<defs><mask id="flat" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${mask}</mask></defs><g mask="url(#flat)">${shapes}</g></svg>` }
}
// Its navy in the ink; its gold panes in windows, or cut out.
const flatCottage = (ink, o) => cottageArt(HOUSE_PATHS.map((i) => flatPaths[i]), HOUSE_BOX, (p) => (p.fill === '#1F304B' ? ink : o.windows), o)
// The second flat cottage (owner: "just added blue-navy-cottage-vector to the folder too", "take a look at that one"):
// C9 bulbs along the eave, a gold window, white highlights, door and drift line. Its navy in the ink, its gold bulbs
// and window in windows, its white cut out (the cream shows); the full-page white square left out.
const bulbSrc = readFileSync(DIR + 'blue-navy-cottage-vector.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const BULB_PATHS = [...bulbSrc.matchAll(/<path ([^>]*)\/>/g)].map((m) => {
  const d = m[1].match(/ d="([^"]*)"/)[1], n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return { fill: m[1].match(/fill="([^"]*)"/)[1].toUpperCase(), d, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
}).filter((p) => !(p.box[2] - p.box[0] >= 1000 && p.box[3] - p.box[1] >= 1000))
const BULB_GOLD = '#FCC84A'
if (BULB_PATHS.filter((p) => p.fill === BULB_GOLD).length !== 14) throw new Error('blue-navy-cottage-vector.svg: not the bulb cottage any more (new download?)')
const BULB_BOX = [0, 1, 2, 3].map((k) => (k < 2 ? Math.min : Math.max)(...BULB_PATHS.filter((p) => p.fill !== 'WHITE').map((p) => p.box[k])))
const bulbCottage = (ink, o) => cottageArt(BULB_PATHS, BULB_BOX, (p) => (p.fill === BULB_GOLD ? o.windows : p.fill === 'WHITE' ? null : ink), o)
// The wordmark: "christmas light" and "creations" with their letter holes (drawn in the page cream over the navy) and
// the gold dot, in the file's own units after its scale; the PEARLAND TX — EST 2011 line under them is left out.
const wmSrc = readFileSync(DIR + 'minimal-clc-name.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const WM_SCALE = wmSrc.match(/transform="scale\(([^)]*)\)"/)[1].split(/[ ,]+/).map(Number)
const wmPaths = [...wmSrc.matchAll(/<path ([^>]*)\/>/g)].map((m) => {
  const d = m[1].match(/ d="([^"]*)"/)[1], n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return { fill: m[1].match(/fill="([^"]*)"/)[1].toUpperCase(), d, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
})
const WM_NAVY = '#012753', WM_GOLD = '#C99E38', WM_LINE_END = 700 // the tagline starts below 700 (file units)
const wordmark = wmPaths.filter((p, i) => i > 0 && p.box[1] < WM_LINE_END)
if (wordmark.filter((p) => p.fill === WM_NAVY).length !== 25 || wordmark.filter((p) => p.fill === WM_GOLD).length !== 1) throw new Error('minimal-clc-name.svg: not the wordmark any more (new download?)')
const WM_BOX = (() => {
  const ink = wordmark.filter((p) => p.fill !== '#FEFDF4')
  const [x0, y0, x1, y1] = [0, 1, 2, 3].map((k) => (k < 2 ? Math.min : Math.max)(...ink.map((p) => p.box[k])))
  return { x: x0 * WM_SCALE[0], y: y0 * WM_SCALE[1], w: (x1 - x0) * WM_SCALE[0], h: (y1 - y0) * WM_SCALE[1] }
})()
// The wordmark w inches wide, centred on cx, its top at y: navy in ink, the dot in dot, the letter holes cut out.
function flatWordmark(ink, dot, { cx, y, w }) {
  const h = (w * WM_BOX.h) / WM_BOX.w
  const area = `x="${WM_BOX.x}" y="${WM_BOX.y}" width="${WM_BOX.w}" height="${WM_BOX.h}"`
  const paint = (p) => (p.fill === WM_NAVY ? ink : p.fill === WM_GOLD ? dot : null)
  const mask = wordmark.map((p) => `<path fill="${paint(p) ? '#fff' : '#000'}" d="${p.d}"/>`).join('')
  const shapes = wordmark.filter(paint).map((p) => `<path fill="${paint(p)}" d="${p.d}"/>`).join('')
  const g = (body) => `<g transform="scale(${WM_SCALE.join(' ')})">${body}</g>`
  return { h, svg: `<svg x="${fmt((cx - w / 2) * U)}" y="${fmt(y * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${WM_BOX.x} ${WM_BOX.y} ${WM_BOX.w} ${WM_BOX.h}">` +
    `<defs><mask id="wm" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${g(mask)}</mask></defs><g mask="url(#wm)">${g(shapes)}</g></svg>` }
}

// accent: the gold touches (rules and the band's line); band: the website's band across the bottom, its text in
// bandText (owner: "lay the website across the bottom of it in larger font? with gold accents where we can").
const FLAT_THEMES = {
  blue: { bg: FLAT.blue, ink: FLAT.gold, accent: FLAT.gold, band: FLAT.gold, bandText: FLAT.blue },
  gold: { bg: FLAT.gold, ink: FLAT.blue, accent: FLAT.blue, band: FLAT.blue, bandText: FLAT.gold },
  cream: { bg: '#FEFCF1', ink: FLAT.blue, windows: FLAT.gold, small: '#9A7428', accent: FLAT.gold, band: FLAT.blue, bandText: FLAT.gold }, // the flat cottage file's own cream (owner: "this is the background color")
  'cream-bulbs': { bg: '#FEFCF1', ink: FLAT.blue, windows: FLAT.gold, small: '#9A7428', accent: FLAT.gold, band: FLAT.blue, bandText: FLAT.gold, cottage: bulbCottage },
}
const BAND = 2.4 // inches: the website's band along the bottom edge
for (const [ground, { bg, ink, windows, small = ink, accent, band, bandText, cottage = flatCottage }] of Object.entries(FLAT_THEMES)) {
  const topH = H - BAND, cy = topH / 2 + 0.15 // the area above the band, and its middle line
  const house = cottage(ink, { x: MARGIN, cy, h: 6.4, windows })
  const col = MARGIN + house.w + GUTTER + 0.2, colW = W - MARGIN - col, cx = col + colW / 2
  const sans = (wght, rest) => ({ font: OUTFIT, location: { wght }, fill: ink, ...rest })
  const wmW = colW * 0.96, wmH = (wmW * WM_BOX.h) / WM_BOX.w
  const tag = T('FREE ESTIMATES  ·  PEARLAND, TX', sans(600, { cap: 0.27, tracking: 0.28, fill: small }))
  const phone = T(PHONE, sans(600, { fit: colW * 0.96, tracking: 0 }))
  const rTag = wmH + 0.85, rPhone = rTag + 0.55 + phone.cap / U
  const top = cy - rPhone / 2
  // Gold rules either side of the tag line.
  const half = tag.width / U / 2, gap = 0.28, ry = top + rTag - 0.15
  const rule = (x0, x1) => `<rect x="${fmt(x0 * U)}" y="${fmt(ry * U)}" width="${fmt((x1 - x0) * U)}" height="${fmt(0.035 * U)}" fill="${accent}"/>`
  // The band: the magnet's own rounded shape clips it, so its bottom corners follow the magnet's.
  const site = T(SITE.toUpperCase(), sans(600, { fit: W - 2 * 1.5, tracking: 0.06, fill: bandText }))
  const siteBase = topH + BAND / 2 + 0.12 + site.cap / U / 2
  const shape = `<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}"/>`
  const bandSvg = `<defs><clipPath id="magnet">${shape}</clipPath></defs><g clip-path="url(#magnet)">` +
    `<rect y="${fmt(topH * U)}" width="${W * U}" height="${fmt(BAND * U)}" fill="${band}"/>` +
    `<rect x="${fmt(1.5 * U)}" y="${fmt((topH + 0.32) * U)}" width="${fmt((W - 3) * U)}" height="${fmt(0.035 * U)}" fill="${band === FLAT.gold ? FLAT.blue : FLAT.gold}"/></g>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">` +
    `<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${bg}"/>${bandSvg}${house.svg}` +
    flatWordmark(ink, windows || ink, { cx, y: top, w: wmW }).svg +
    rule(col + 0.3, cx - half - gap) + tag.svg(cx * U, (top + rTag) * U, 'middle') + rule(cx + half + gap, col + colW - 0.3) +
    phone.svg(cx * U, (top + rPhone) * U, 'middle') + site.svg((W / 2) * U, siteBase * U, 'middle') + '</svg>'
  const out = `${DIR}vehicle-magnet-24x12-flat-${ground}`
  writeFileSync(out + '.svg', svg)
  svgToPdf(svg, W, H, out + '.pdf')
  await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
  console.log(`vehicle-magnet-24x12-flat-${ground}: ${W} x ${H} in, ${ink} on ${bg}, website ${fmt(site.cap / U)} in tall in the band, all vector`)
}
// The cream magnets on a red truck door (owner's truck is red), for a look before ordering.
for (const name of ['cream', 'cream-bulbs']) {
  const art = await sharp(`${DIR}vehicle-magnet-24x12-flat-${name}.png`).resize({ width: 820 }).png().toBuffer()
  const door = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560"><rect width="1000" height="560" fill="#b3191f"/><rect width="1000" height="40" fill="#8e1218"/>' +
    '<path d="M960 0 L960 560" stroke="#7a0f14" stroke-width="6"/><rect x="880" y="250" width="60" height="16" rx="8" fill="#cfd3d8"/></svg>'
  await sharp(Buffer.from(door)).composite([{ input: art, left: 40, top: 70 }]).png().toFile(`${DIR}vehicle-magnet-24x12-flat-${name}-on-red.png`)
}
