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
import { setWords } from './lib/lettering.mjs'
import { fmt, FONTS, glyphs, textLine, unifyNavy } from './lib/logoArt.mjs'
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
  const svg = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">${body.join('')}</svg>`)
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
// Its gold shapes are 10 bulbs (tall drops) and 4 window panes (squares). With o.bulbs the bulbs take those colours in
// turn from left to right (owner: "make the lights on the house multicolor"); the window stays in windows.
const isBulb = (p) => (p.box[3] - p.box[1]) / (p.box[2] - p.box[0]) > 1.15
const BULB_ORDER = BULB_PATHS.filter((p) => p.fill === BULB_GOLD && isBulb(p)).sort((a, b) => a.box[0] - b.box[0])
if (BULB_ORDER.length !== 10) throw new Error(`blue-navy-cottage-vector.svg: ${BULB_ORDER.length} bulbs, not 10`)
const bulbCottage = (ink, o) => cottageArt(BULB_PATHS, BULB_BOX, (p) => {
  if (p.fill === 'WHITE') return null
  if (p.fill !== BULB_GOLD) return ink
  return o.bulbs && isBulb(p) ? o.bulbs[BULB_ORDER.indexOf(p) % o.bulbs.length] : o.windows
}, o)
const C9 = ['#D7262E', '#F2A93B', '#2E9E5B', '#3E8EDE'] // red, amber, green, blue
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
// bandText (owner: "lay the website across the bottom of it in larger font? with gold accents where we can"). The
// band's top is a row of snow drifts of random sizes and the cottage stands on it, its own drift melting into the
// band (owner: "lower the house down until it meets up and blends with the blue navy bar; then make that blue navy bar
// have some random sized waves like its snow. Or just take the blue bar off": both made, nobar is the second).
// A line of text sized to a width, the dots of its i's in another colour, like the wordmark's gold dot (owner:
// "website goes to navy. the i get a gold dot"). The font draws each i as one glyph of two outlines: the higher one is
// the dot.
function dottedLine(str, { font, location, fit, tracking, fill, dot }) {
  const g = glyphs(str, font, location)
  const advEm = g.glyphs.reduce((sum, gl) => sum + gl.advance, 0) / g.upem + tracking * (g.glyphs.length - 1)
  const em = (fit * U) / advEm, k = em / g.upem, width = advEm * em
  const lowest = (d) => Math.min(...d.match(/-?[0-9.]+/g).map(Number).filter((_, i) => i % 2 === 1))
  return { cap: (g.capHeight / g.upem) * em, width, svg: (x, y, anchor = 'start') => {
    let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x, nDot = 0
    const parts = [], dots = [].concat(dot) // one colour, or a list taken in turn
    for (const gl of g.glyphs) {
      const at = (d, colour) => `<path transform="translate(${fmt(cx)} 0) scale(${k} ${-k})" d="${d}" fill="${colour}"/>`
      if (gl.d && gl.char === 'i') {
        const outlines = gl.d.split(/(?=M)/).filter(Boolean)
        const top = Math.max(...outlines.map(lowest))
        for (const o of outlines) parts.push(at(o, lowest(o) === top ? dots[nDot % dots.length] : fill))
        nDot++
      } else if (gl.d) parts.push(at(gl.d, fill))
      cx += gl.advance * k + tracking * em
    }
    return `<g transform="translate(0 ${fmt(y)})">${parts.join('')}</g>`
  } }
}

// The year as the 2011-with-an-ornament art (owner: "Numbers to gold, bulb to navy. Pearland, TX --- Est. 2011. bump
// the font size up on it so we can see", then "yea no bar. But do add the est 2011 stuff I asked for"): shapes 1–7 of
// recraft/2011-light.svg, the digits gold, the ornament navy, its highlight and ring hole cut out. It stands on the
// text baseline with its digits digitsH tall.
const yearSrc = readFileSync(DIR + '2011-light.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const YEAR_SCALE = yearSrc.match(/transform="scale\(([^)]*)\)"/)[1].split(/[ ,]+/).map(Number)
const yearPaths = [...yearSrc.matchAll(/<path ([^>]*)\/>/g)].map((m) => m[1].match(/ d="([^"]*)"/)[1])
const YEAR = { art: [1, 2, 3, 4, 5, 6, 7], ornament: 1, digits: [5, 6, 7], box: [72, 364, 952, 776], digitTop: 435, base: 767 }
{
  const n = YEAR.art.flatMap((i) => yearPaths[i].match(/-?[0-9.]+/g).map(Number))
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round)
  if (b.some((v, i) => Math.abs(v - YEAR.box[i]) > 2)) throw new Error(`2011-light.svg: shapes 1–7 are not the 2011 any more (box ${b})`)
}
// festive (owner: "maybe we can do something with that ornament to make it a bit more festive"): the ball in festive.ball,
// its cap and ring gold (the ornament is one outline: above y 465 is the cap and ring); with festive.trim also a gold
// band round the ball's middle with a thin line either side and two small gold sparkles by the ring (at the magnet's
// half-inch line they read as noise, owner: "the ornament still is clashing", so the magnet has the plain ball). In the file's units (before its scale):
// the ball's centre is about (477, 615), radius 150.
const ORN_CAP_END = 465
const sparkle = (cx, cy, r) => `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`
const SPARKLES = [sparkle(578, 392, 26), sparkle(392, 432, 16)]
// wreath (owner: "maybe one of the blue and gold icon wreaths I made instead?"): the 0 is the wreath from his Recraft
// icon pack (recraft/icon-pack-blue-1.svg, top right: navy ring, gold berries and bow, cream leaves and centre), as tall
// as the digits and centred where the ornament's ball was; its navy in navy, its gold in gold, its cream cut out.
const iconSrc = readFileSync(DIR + 'icon-pack-blue-1.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const WREATH_PATHS = [...iconSrc.matchAll(/<path ([^>]*)\/>/g)].map((m) => {
  const d = m[1].match(/ d="([^"]*)"/)[1], n = d.match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  return { fill: m[1].match(/fill="([^"]*)"/)[1].toUpperCase(), d, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
}).filter((p) => p.box[0] >= 840 && p.box[3] <= 440 && p.box[2] - p.box[0] < 1000) // the top-right icon, not the page
const WREATH_BOX = [0, 1, 2, 3].map((k) => (k < 2 ? Math.min : Math.max)(...WREATH_PATHS.map((p) => p.box[k])))
if (WREATH_PATHS.length !== 30 || WREATH_PATHS.filter((p) => p.fill === '#E4B149').length !== 19) throw new Error('icon-pack-blue-1.svg: the top-right icon is not the wreath any more')
const ORNAMENT_PARTS = [1, 2, 3, 4] // the ornament, its little line, highlight and ring hole
function yearArt(digitsH, { gold, navy, festive, wreath }) {
  const [sx, sy] = YEAR_SCALE
  const [x0, y0, x1, y1] = [YEAR.box[0] * sx, YEAR.box[1] * sy, YEAR.box[2] * sx, YEAR.box[3] * sy]
  const u = digitsH / ((YEAR.base - YEAR.digitTop) * sy) // inches per scaled unit
  const w = (x1 - x0) * u, h = (y1 - y0) * u, above = (YEAR.base * sy - y0) * u // height above the baseline
  const ink = (i) => (i === YEAR.ornament ? navy : YEAR.digits.includes(i) ? gold : null)
  const g = (body) => `<g transform="scale(${sx} ${sy})">${body}</g>`
  const area = `x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"`
  const orn = yearPaths[YEAR.ornament], [bx0, , bx1] = YEAR.box
  // The wreath, scaled to the digits' height (file units) and centred on the ornament's ball (x 477); paint(p) gives
  // each of its shapes its ink, or null to cut it out.
  const wreathSvg = (paint) => {
    const [wx0, wy0, wx1, wy1] = WREATH_BOX, k = (YEAR.base - YEAR.digitTop) / (wy1 - wy0)
    const tx = 477 - ((wx0 + wx1) / 2) * k, ty = YEAR.digitTop - wy0 * k
    return `<g transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(k)})">${WREATH_PATHS.map((p) => (paint(p) === undefined ? '' : `<path fill="${paint(p)}" d="${p.d}"/>`)).join('')}</g>`
  }
  const wreathInk = (p) => (p.fill === '#10223E' ? navy : p.fill === '#E4B149' ? gold : null)
  const mask = YEAR.art.filter((i) => !(wreath && ORNAMENT_PARTS.includes(i))).map((i) => `<path fill="${ink(i) ? '#fff' : '#000'}" d="${yearPaths[i]}"/>`).join('') +
    (festive?.trim ? SPARKLES.map((d) => `<path fill="#fff" d="${d}"/>`).join('') : '') +
    (wreath ? wreathSvg((p) => (wreathInk(p) ? '#fff' : '#000')) : '')
  const band = (y, hgt) => `<rect x="${bx0}" y="${y}" width="${bx1 - bx0}" height="${hgt}" fill="${gold}"/>`
  const ornament = wreath
    ? wreathSvg((p) => wreathInk(p) || undefined)
    : festive
    ? `<defs><clipPath id="ycap"><rect x="${bx0}" y="0" width="${bx1 - bx0}" height="${ORN_CAP_END}"/></clipPath>` +
      `<clipPath id="yball"><rect x="${bx0}" y="${ORN_CAP_END}" width="${bx1 - bx0}" height="1000"/></clipPath><clipPath id="yorn"><path d="${orn}"/></clipPath></defs>` +
      `<path clip-path="url(#ycap)" fill="${gold}" d="${orn}"/><path clip-path="url(#yball)" fill="${festive.ball}" d="${orn}"/>` +
      (festive.trim ? `<g clip-path="url(#yorn)">${band(598, 7)}${band(612, 34)}${band(653, 7)}</g>` + SPARKLES.map((d) => `<path fill="${gold}" d="${d}"/>`).join('') : '')
    : `<path fill="${navy}" d="${orn}"/>`
  const shapes = YEAR.art.filter((i) => ink(i) && i !== YEAR.ornament).map((i) => `<path fill="${ink(i)}" d="${yearPaths[i]}"/>`).join('') + ornament
  return { w, above, svg: (x, base) => `<svg x="${fmt(x * U)}" y="${fmt((base - above) * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">` +
    `<defs><mask id="year" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${g(mask)}</mask></defs><g mask="url(#year)">${g(shapes)}</g></svg>` }
}

const FLAT_THEMES = {
  blue: { bg: FLAT.blue, ink: FLAT.gold, accent: FLAT.gold, band: FLAT.gold, bandText: FLAT.blue },
  gold: { bg: FLAT.gold, ink: FLAT.blue, accent: FLAT.blue, band: FLAT.blue, bandText: FLAT.gold },
  cream: { bg: '#FEFCF1', ink: FLAT.blue, windows: FLAT.gold, small: '#9A7428', accent: FLAT.gold, band: FLAT.blue, bandText: FLAT.gold }, // the flat cottage file's own cream (owner: "this is the background color")
  'cream-bulbs': { bg: '#FEFCF1', ink: FLAT.blue, windows: FLAT.gold, small: '#9A7428', accent: FLAT.gold, band: FLAT.blue, bandText: FLAT.gold, cottage: bulbCottage, bulbs: C9 },
  // lineGold: the 2011 line's deeper gold (4.2:1 on the cream; the light gold was 2.0:1, faint in sun); site: the short
  // domain, which 301s to the site (owner: "I do own clcxmas.com thats a 301 redirect to the main site", checked 2026-10-16).
  'cream-bulbs-nobar': { bg: '#FEFCF1', ink: FLAT.blue, windows: FLAT.gold, small: '#9A7428', accent: FLAT.gold, cottage: bulbCottage, bulbs: C9, year: true, frame: true, lineGold: '#9A7428', site: 'clcxmas.com' },
}
const BAND = 2.4 // inches: the website's band along the bottom edge (its flat part; the drifts rise above it)
// The drifts: soft mounds of random width and height along the band's top, from a fixed seed so a rebuild is the same.
function drifts(top, seed = 2011) {
  let t = seed
  const rand = () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
  let x = -0.5, d = `M0 ${fmt(H * U)} L0 ${fmt(top * U)}`
  while (x < W) {
    const w = 1.6 + rand() * 3.2, a = 0.18 + rand() * 0.42, x1 = Math.min(x + w, W + 0.5)
    d += ` L${fmt(x * U)} ${fmt(top * U)} C${fmt((x + w * 0.25) * U)} ${fmt((top - a * 1.33) * U)} ${fmt((x1 - w * 0.25) * U)} ${fmt((top - a * 1.33) * U)} ${fmt(x1 * U)} ${fmt(top * U)}`
    x = x1
  }
  return d + ` L${fmt(W * U)} ${fmt(H * U)} Z`
}
// frame (owner: "should we frame it with a 1px blue border that follows the curvature of the outside edge of the magnet?"):
// a thin line in the ink, inset FRAME_INSET from the edge (a cut can drift about 1/16 in, so a line on the edge would
// look uneven), its corners concentric with the magnet's 0.75-in ones; 2 pt, as thin as prints cleanly.
const FRAME_INSET = 0.35, FRAME_LINE = 2 / 72
for (const [ground, { bg, ink, windows, small = ink, accent, band, bandText, cottage = flatCottage, year, bulbs, frame, lineGold = FLAT.gold, site: shortSite }] of Object.entries(FLAT_THEMES)) {
  const sans = (wght, rest) => ({ font: OUTFIT, location: { wght }, fill: ink, ...rest })
  const topH = band ? H - BAND : H // the area above the band
  const HOUSE = 6.4
  // With a band the cottage stands on it (its bottom 0.25 in into the band); without, it is centred on the door.
  // Inside the frame (owner: "are the elements spaced from each other aesthetically?"), measured on the print: the house and
  // the text block equally far from the frame (about 1.15 in), 1.4 in apart, and level with each other.
  const nudge = frame ? { house: 0.19, text: 0.07, up: 0.01 } : { house: 0, text: 0, up: 0 }
  const house = cottage(ink, { x: MARGIN + nudge.house, cy: band ? topH + 0.25 - HOUSE / 2 : H / 2, h: HOUSE, windows, bulbs })
  const col0 = MARGIN + house.w + GUTTER + 0.2, colW = W - MARGIN - col0, col = col0 + nudge.text, cx = col + colW / 2
  const wmW = colW * 0.96, wmH = (wmW * WM_BOX.h) / WM_BOX.w
  // The line under the name: FREE ESTIMATES · PEARLAND, TX small in gold, or (year) PEARLAND, TX — EST. and the 2011
  // art as the year, all gold but the navy ornament, the words as tall as the digits (owner: "leave everything gold on
  // that line other than the bulb", "match the city size to 2011"), the whole line 0.78 of the column wide (no rules; the
// words and digits about 0.53 in tall).
  const fitYear = (d) => ({ est: T('PEARLAND, TX — EST.', sans(600, { cap: d, tracking: 0.04, fill: lineGold })), yr: yearArt(d, { gold: lineGold, navy: ink, wreath: true }) })
  const unitLine = year && fitYear(1), d = year && (colW * 0.78) / (unitLine.est.width / U + 0.3 + unitLine.yr.w) // owner: "lower the font for the whole gold line"
  const { est, yr } = year ? fitYear(d) : {}
  const yGap = year && 0.3 * d, lineW = year && est.width / U + yGap + yr.w
  const tag = year ? { width: lineW * U, cap: est.cap,
    svg: (x, y) => est.svg(x - (lineW * U) / 2, y) + yr.svg(x / U - lineW / 2 + est.width / U + yGap, y / U) }
    : T('FREE ESTIMATES  ·  PEARLAND, TX', sans(600, { cap: 0.27, tracking: 0.28, fill: small }))
  const phone = T(PHONE, sans(600, { fit: colW * 0.96, tracking: 0 }))
  // Two groups (owner: "is the line spacing where it should be?"): the name with its gold line close under it, then a
  // wider gap, then the phone with the site close under it. Measured on the print: about 0.45, 0.75 and 0.45 in.
  const rTag = year ? wmH + 0.24 + yr.above : wmH + 0.85, rPhone = rTag + (year ? 0.94 : 0.55) + phone.cap / U
  // No band: the site on its own line under the phone, as large as fits.
  // The site's i-dots gold like the wordmark's (owner tried the bulbs' red, green and blue, then "turn the i's back to gold").
  // A short domain is set smaller than the column (it would otherwise rival the phone): 0.6 of it.
  const lineSite = band ? null : dottedLine(shortSite || SITE, { font: OUTFIT, location: { wght: 600 }, fit: colW * (shortSite ? 0.6 : 0.96), tracking: 0.01, fill: ink, dot: windows || accent })
  const rEnd = lineSite ? rPhone + 0.52 + lineSite.cap / U : rPhone
  const top = (band ? (topH - 0.6) / 2 + 0.05 : H / 2) - rEnd / 2 - nudge.up // the block centred above the drifts, or on the door
  // Gold rules either side of the tag line.
  const half = tag.width / U / 2, gap = year ? 0.22 : 0.28, ry = top + rTag - tag.cap / U / 2 - 0.0175
  const rule = (x0, x1) => `<rect x="${fmt(x0 * U)}" y="${fmt(ry * U)}" width="${fmt((x1 - x0) * U)}" height="${fmt(0.035 * U)}" fill="${accent}"/>`
  let bandSvg = '', siteSvg = lineSite ? lineSite.svg(cx * U, (top + rEnd) * U, 'middle') : ''
  if (band) {
    // The band, clipped to the magnet's rounded shape; the site in large capitals, a thin line of the other colour.
    const site = T(SITE.toUpperCase(), sans(600, { fit: W - 2 * 1.5, tracking: 0.06, fill: bandText }))
    const siteBase = topH + BAND / 2 + 0.2 + site.cap / U / 2
    bandSvg = `<defs><clipPath id="magnet"><rect width="${W * U}" height="${H * U}" rx="${0.75 * U}"/></clipPath></defs><g clip-path="url(#magnet)">` +
      `<path d="${drifts(topH)}" fill="${band}"/>` +
      `<rect x="${fmt(1.5 * U)}" y="${fmt((siteBase - site.cap / U - 0.42) * U)}" width="${fmt((W - 3) * U)}" height="${fmt(0.035 * U)}" fill="${bandText}"/></g>`
    siteSvg = site.svg((W / 2) * U, siteBase * U, 'middle')
  }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">` +
    `<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${bg}"/>${bandSvg}${house.svg}` +
    (frame ? `<rect x="${fmt(FRAME_INSET * U)}" y="${fmt(FRAME_INSET * U)}" width="${fmt((W - 2 * FRAME_INSET) * U)}" height="${fmt((H - 2 * FRAME_INSET) * U)}" rx="${fmt((0.75 - FRAME_INSET) * U)}" fill="none" stroke="${ink}" stroke-width="${fmt(FRAME_LINE * U)}"/>` : '') +
    flatWordmark(ink, windows || ink, { cx, y: top, w: wmW }).svg +
    (year ? '' : rule(col + 0.3, cx - half - gap)) + tag.svg(cx * U, (top + rTag) * U, 'middle') + (year ? '' : rule(cx + half + gap, col + colW - 0.3)) +
    phone.svg(cx * U, (top + rPhone) * U, 'middle') + siteSvg + '</svg>'
  svg = unifyNavy(svg)
  const out = `${DIR}vehicle-magnet-24x12-flat-${ground}`
  writeFileSync(out + '.svg', svg)
  svgToPdf(svg, W, H, out + '.pdf')
  await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
  console.log(`vehicle-magnet-24x12-flat-${ground}: ${W} x ${H} in, ${ink} on ${bg}${band ? ', snow-drift band' : ', no band'}, all vector`)
}
// --- the owner's own layout (2026-10-16, his mockup: "update the magnets to look like this. I want my magnets to look
// like a clean elegant piece of artwork", "update the font to outfit"): the bulb cottage on the left with PEARLAND, TX
// under it; on the right one column, centred: the wordmark (now in Outfit, setWords, its gold dot kept), FREE
// ESTIMATES in Oswald, a condensed gold, the phone the biggest thing, its foot level with the cottage's; clcxmas.com, its x red,
// right-aligned to the column at the bottom. Every word real font outlines; positions measured from his mockup.
// Versions of the name: Outfit Bold, Righteous (owner, sending Google Fonts' Righteous: "can we try this for company")
// ADLaM Display (owner: "do this company") and Poetsen One (sent next); and every word in New Amsterdam (owner: "set
// everything to this"): tall narrow capitals only (its lowercase is drawn as capitals), and its i has no dot, so that
// version has no gold dot; its words sized for narrow letters (the phone still the column's width). One weight each,
// SIL Open Font License, assets-source/brand/fonts/. Then every word in Finlandica Headline (owner: "we'll try this one
// next"): the name Bold, the rest SemiBold, the gold dot kept. Then every word in Madimi One (sent next; rounded and
// heavy, one weight, its dotted i keeps the gold dot).
// And the name alone in Fascinate Inline (owner: "business name"; art-deco capitals-style letters with an inline groove).
const FASCINATE = { font: fileURLToPath(new URL('../assets-source/brand/fonts/fascinate-inline/FascinateInline-Regular.ttf', import.meta.url)), location: {} }
// And Princess Sofia (owner: "business name"): a script, set with no extra tracking so its letters join.
const PRINCESS = { font: fileURLToPath(new URL('../assets-source/brand/fonts/princess-sofia/PrincessSofia-Regular.ttf', import.meta.url)), location: {}, tracking: 0 }
// And Elsie Swash Caps Black (owner: "try this the name"): an elegant high-contrast face; Black, the heavier of its two.
const MONTSERRAT = fileURLToPath(new URL('../assets-source/brand/fonts/montserrat/Montserrat-Variable.ttf', import.meta.url))
const ELSIE = { font: fileURLToPath(new URL('../assets-source/brand/fonts/elsie-swash-caps/ElsieSwashCaps-Black.ttf', import.meta.url)), location: {} }
const MADIMI = { font: fileURLToPath(new URL('../assets-source/brand/fonts/madimi-one/MadimiOne-Regular.ttf', import.meta.url)), location: {} }
const FINLANDICA = fileURLToPath(new URL('../assets-source/brand/fonts/finlandica-headline/FinlandicaHeadline-Variable.ttf', import.meta.url))
const NEW_AMSTERDAM = { font: fileURLToPath(new URL('../assets-source/brand/fonts/new-amsterdam/NewAmsterdam-Regular.ttf', import.meta.url)), location: {} }
const NAME_FONTS = {
  'cream-art': { name: { font: OUTFIT, location: { wght: 700 } } },
  'cream-art-righteous': { name: { font: fileURLToPath(new URL('../assets-source/brand/fonts/righteous/Righteous-Regular.ttf', import.meta.url)), location: {} } },
  'cream-art-adlam': { name: { font: fileURLToPath(new URL('../assets-source/brand/fonts/adlam-display/ADLaMDisplay-Regular.ttf', import.meta.url)), location: {} } },
  'cream-art-poetsen': { name: { font: fileURLToPath(new URL('../assets-source/brand/fonts/poetsen-one/PoetsenOne-Regular.ttf', import.meta.url)), location: {} } },
  'cream-art-new-amsterdam': { name: NEW_AMSTERDAM, all: NEW_AMSTERDAM, xh: 1.3, noDot: true, cityCap: 0.62, siteW: 4.6, phoneW: 0.88 },
  'cream-art-finlandica': { name: { font: FINLANDICA, location: { wght: 700 } }, all: { font: FINLANDICA, location: { wght: 600 } }, cityCap: 0.6, siteW: 6.2, estCap: 0.74 },
  'cream-art-madimi': { name: MADIMI, all: MADIMI, cityCap: 0.58, siteW: 6.2, estCap: 0.72 },
  'cream-art-fascinate': { name: FASCINATE },
  'cream-art-princess-sofia': { name: PRINCESS, xh: 0.92 }, // its tall ascenders cleared the frame by a hair at 1.06
  // The owner's pick for the name ("I like elsie for the name. set the font to everything else, what you think will look
  // best"): Elsie with Montserrat for the rest, the classic partner for a high-contrast serif and the family of the
  // town's Montserrat Underline: FREE ESTIMATES SemiBold capitals spaced wide, the phone SemiBold, the site Bold, and the
  // town plain Montserrat SemiBold too (owner: "its still underlined").
  'cream-art-elsie': { name: ELSIE, all: { font: MONTSERRAT, location: { wght: 600 } }, site: { font: MONTSERRAT, location: { wght: 700 } }, cityCap: 0.55, estCap: 0.62, estTracking: 0.14, siteW: 6.6, divider: true, dotLift: 0.06 }, // owner: "the gold i dot. push it up a couple pixels"
}
for (const [variant, v] of Object.entries(NAME_FONTS)) {
  const OSWALD = fileURLToPath(new URL('../assets-source/brand/fonts/oswald/Oswald-Variable.ttf', import.meta.url)) // FREE ESTIMATES: as narrow as his mockup's
  const MONTSERRAT_UNDERLINE = fileURLToPath(new URL('../assets-source/brand/fonts/montserrat-underline/MontserratUnderline-Variable.ttf', import.meta.url))
  const ink = FLAT.blue, gold = FLAT.gold, deep = '#9A7428', red = C9[0], bg = '#FEFCF1'
  const L = { houseX: 1.55, houseH: 6.34, foot: 9.22, cx: 15.95, colW: 12.5, wm: [2.45, 4.05], xh: 1.06, estCap: 0.95, cityGap: 0.18, site: 10.95, siteW: 7.4 }
  const house = bulbCottage(ink, { x: L.houseX, cy: L.foot - L.houseH / 2, h: L.houseH, windows: gold, bulbs: C9 })
  const x0 = L.cx - L.colW / 2, x1 = L.cx + L.colW / 2
  const wm = setWords([{ text: 'christmas light', x0: x0 * U, x1: x1 * U, base: L.wm[0] * U }, { text: 'creations', x0: x0 * U, x1: x1 * U, base: L.wm[1] * U }],
    { ...v.name, xh: (v.xh || L.xh) * U, accent: v.noDot ? undefined : [0, 3], accentScale: 1.45, accentLift: (v.dotLift || 0) * U })
  const wmSvg = wm.map((it) => `<path transform="${it.tf}" fill="${it.role === 'accent' ? gold : ink}" d="${it.d}"/>`).join('')
  const est = T('FREE ESTIMATES', { ...(v.all || { font: OSWALD, location: { wght: 500 } }), cap: v.estCap || L.estCap, tracking: v.estTracking ?? (v.all ? 0.04 : 0.01), fill: deep })
  const phone = T(PHONE, { ...(v.all || { font: OUTFIT, location: { wght: 600 } }), fit: L.colW * (v.phoneW || 1), tracking: v.all ? 0.02 : 0, fill: ink })
  // FREE ESTIMATES the same 0.66 in above the phone in every version (his mockup's gap), however tall the phone sets
  const estBase = L.foot - phone.cap / U - 0.66
  // divider (owner: "add some kind of decorative divider under the business name and above free estimates"): a gold
  // four-point sparkle, like the badges' stars, between two thin rules that taper away from it; deep gold, as wide as
  // FREE ESTIMATES, halfway between the name and FREE ESTIMATES.
  let divider = ''
  if (v.divider) {
    const y = (L.wm[1] + estBase - est.cap / U) / 2, half = est.width / U / 2, r = 0.34, gap = 0.24, t = 0.085
    const rule = (inner, outer) => `<path fill="${deep}" d="M${fmt(outer * U)} ${fmt(y * U)} L${fmt(inner * U)} ${fmt((y - t / 2) * U)} Q${fmt((inner + Math.sign(inner - outer) * t / 2) * U)} ${fmt(y * U)} ${fmt(inner * U)} ${fmt((y + t / 2) * U)} Z"/>`
    divider = rule(L.cx - r - gap, L.cx - half) + rule(L.cx + r + gap, L.cx + half) + `<path fill="${deep}" d="${sparkle(L.cx * U, y * U, r * U)}"/>`
  }
  // The town in Montserrat Underline (owner: "for the city name"; OFL): its underline is drawn into every letter, so
  // the font's own spacing (extra tracking would break the line), as tall as before.
  const city = v.all && !v.keepCity ? T('PEARLAND, TX', { ...v.all, cap: v.cityCap, tracking: 0.1, fill: deep })
    : T('PEARLAND, TX', { font: MONTSERRAT_UNDERLINE, location: { wght: 600 }, cap: 0.55, tracking: 0, fill: deep })
  // The site: navy, its x in the bulbs' red, right edge on the column's.
  const site = (() => {
    const sf = v.site || v.all || { font: OUTFIT, location: { wght: 700 } }, siteW = v.siteW || L.siteW
    const g = glyphs('clcxmas.com', sf.font, sf.location)
    const advEm = g.glyphs.reduce((t, gl) => t + gl.advance, 0) / g.upem + 0.01 * (g.glyphs.length - 1)
    const em = (siteW * U) / advEm, k = em / g.upem
    let x = x1 * U - siteW * U
    return g.glyphs.map((gl, i) => {
      const p = gl.d ? `<path transform="translate(${fmt(x)} ${fmt(L.site * U)}) scale(${k} ${-k})" fill="${i === 3 ? red : ink}" d="${gl.d}"/>` : ''
      x += gl.advance * k + 0.01 * em
      return p
    }).join('')
  })()
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${H}in" viewBox="0 0 ${W * U} ${H * U}">` +
    `<rect width="${W * U}" height="${H * U}" rx="${0.75 * U}" fill="${bg}"/>` +
    `<rect x="${fmt(FRAME_INSET * U)}" y="${fmt(FRAME_INSET * U)}" width="${fmt((W - 2 * FRAME_INSET) * U)}" height="${fmt((H - 2 * FRAME_INSET) * U)}" rx="${fmt((0.75 - FRAME_INSET) * U)}" fill="none" stroke="${ink}" stroke-width="${fmt(FRAME_LINE * U)}"/>` +
    house.svg + city.svg((L.houseX + house.w / 2) * U, (L.foot + L.cityGap) * U + city.cap, 'middle') +
    wmSvg + divider + est.svg(L.cx * U, estBase * U, 'middle') + phone.svg(L.cx * U, L.foot * U, 'middle') + site + '</svg>'
  svg = unifyNavy(svg)
  const out = `${DIR}vehicle-magnet-24x12-flat-${variant}`
  writeFileSync(out + '.svg', svg)
  svgToPdf(svg, W, H, out + '.pdf')
  await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 150) }).withMetadata({ density: 150 }).png({ compressionLevel: 9 }).toFile(out + '.png')
  console.log(`vehicle-magnet-24x12-flat-${variant}: the owner's layout, phone ${(phone.cap / U).toFixed(2)} in tall, FREE ESTIMATES ${(est.width / U).toFixed(2)} in wide, PEARLAND, TX ${(city.width / U).toFixed(2)} in wide (cottage ${house.w.toFixed(2)})`)
}

// The cream magnets on a red truck door (owner's truck is red), for a look before ordering.
for (const name of ['cream', 'cream-bulbs', 'cream-bulbs-nobar', 'cream-art', 'cream-art-righteous', 'cream-art-adlam', 'cream-art-poetsen', 'cream-art-new-amsterdam', 'cream-art-finlandica', 'cream-art-madimi', 'cream-art-fascinate', 'cream-art-princess-sofia', 'cream-art-elsie']) {
  const art = await sharp(`${DIR}vehicle-magnet-24x12-flat-${name}.png`).resize({ width: 820 }).png().toBuffer()
  const door = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560"><rect width="1000" height="560" fill="#b3191f"/><rect width="1000" height="40" fill="#8e1218"/>' +
    '<path d="M960 0 L960 560" stroke="#7a0f14" stroke-width="6"/><rect x="880" y="250" width="60" height="16" rx="8" fill="#cfd3d8"/></svg>'
  await sharp(Buffer.from(door)).composite([{ input: art, left: 40, top: 70 }]).png().toFile(`${DIR}vehicle-magnet-24x12-flat-${name}-on-red.png`)
}
