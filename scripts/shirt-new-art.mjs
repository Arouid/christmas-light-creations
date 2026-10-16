// New shirts from the owner's 2026-10-16 artwork, each for a navy and a gold shirt (owner: "create me any other shirts
// I can make with all our new artwork in gold/navy"). The pieces are his Recraft vectors (assets-source/shirts/recraft/,
// not in git): the wordmark (minimal-clc-name.svg), the cottage with C9 bulbs (blue-navy-cottage-vector.svg), the
// solid icon pack (icon-pack-blue-1.svg: house, tree, wreath, ladder, storage box, calendar) and the 2011 digits
// (2011-light.svg) with the pack's wreath as the 0. Text in Outfit (the wordmark's match, assets-source/brand/fonts).
// - lit-house: the bulb cottage over the wordmark and PEARLAND, TX — EST. 2011 (front or back, 11 in).
// - wreath-2011: LIGHTING UP PEARLAND SINCE, a big 2011 with the wreath, the wordmark (front or back, 11 in).
// - services: the six icons with labels over the wordmark (back, 12 in).
// - chest: the bulb cottage beside the wordmark (left chest, 4 in).
// On a navy shirt the art's navy prints cream and its gold stays gold; on a gold shirt the navy stays navy and the
// gold turns red (gold would vanish); the art's cream is cut out (the shirt shows); the bulbs are red, amber, green,
// blue. Run: node scripts/shirt-new-art.mjs → recraft/new-<design>-on-<shirt>.{png,svg,pdf} and new-mockups.png.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { fmt, glyphs, textLine, unifyNavy } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const OUTFIT = fileURLToPath(new URL('../assets-source/brand/fonts/outfit/Outfit-Variable.ttf', import.meta.url))
const U = 100, DPI = 300
const C9 = ['#D7262E', '#F2A93B', '#2E9E5B', '#3E8EDE'] // red, amber, green, blue
const SHIRTS = {
  navy: { tee: '#152040', edge: '#0b1430', ink: '#F7F1E3', accent: '#E2B65C', window: '#E2B65C', digits: '#E2B65C', text: '#F7F1E3', small: '#E2B65C' },
  gold: { tee: '#EAA92B', edge: '#c48d1f', ink: '#1F304B', accent: '#B42320', window: '#F7F1E3', digits: '#1F304B', text: '#1F304B', small: '#B42320' },
}

// --- the pieces: each a list of { d, tf, role } and its box (after tf) ---
const parse = (file) => {
  const src = readFileSync(DIR + file, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
  return [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => {
    const d = m[1].match(/ d="([^"]*)"/)[1], n = d.match(/-?[0-9.]+/g).map(Number)
    const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
    const sc = (m[1].match(/transform="scale\(([^)]*)\)"/) || [])[1]
    return { fill: m[1].match(/fill="([^"]*)"/)[1].toUpperCase(), d, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], scale: sc ? sc.split(/[ ,]+/).map(Number) : [1, 1] }
  })
}
const isPage = (p) => p.box[2] - p.box[0] >= 1000 && p.box[3] - p.box[1] >= 800
const piece = (items) => ({ items, box: [0, 1, 2, 3].map((k) => (k < 2 ? Math.min : Math.max)(...items.filter((i) => i.role !== 'cut').map((i) => i.box[k]))) })
// An item placed with a scale k and an offset (tx, ty) after its own file scale.
const place = (p, role, k = 1, tx = 0, ty = 0) => ({ d: p.d, role, tf: `translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(k * p.scale[0])} ${fmt(k * p.scale[1])})`,
  box: [p.box[0] * p.scale[0] * k + tx, p.box[1] * p.scale[1] * k + ty, p.box[2] * p.scale[0] * k + tx, p.box[3] * p.scale[1] * k + ty] })

const wordmark = piece(parse('minimal-clc-name.svg').filter((p, i) => i > 0 && p.box[1] < 700)
  .map((p) => place(p, { '#012753': 'ink', '#C99E38': 'accent' }[p.fill] || 'cut')))
if (wordmark.items.filter((i) => i.role === 'ink').length !== 25) throw new Error('minimal-clc-name.svg is not the wordmark any more')

const bulbSrc = parse('blue-navy-cottage-vector.svg').filter((p) => !isPage(p))
const tall = (p) => (p.box[3] - p.box[1]) / (p.box[2] - p.box[0]) > 1.15
const bulbOrder = bulbSrc.filter((p) => p.fill === '#FCC84A' && tall(p)).sort((a, b) => a.box[0] - b.box[0])
if (bulbOrder.length !== 10) throw new Error('blue-navy-cottage-vector.svg: not the 10-bulb cottage any more')
const house = piece(bulbSrc.map((p) => place(p, p.fill === 'WHITE' ? 'cut' : p.fill === '#FCC84A' ? (tall(p) ? `bulb${bulbOrder.indexOf(p) % C9.length}` : 'window') : 'ink')))

const iconSrc = parse('icon-pack-blue-1.svg').filter((p) => !isPage(p))
const iconRole = (p) => ({ '#10223E': 'ink', '#E4B149': 'accent' }[p.fill] || 'cut')
const ICON_NAMES = ['house', 'tree', 'wreath', 'ladder', 'storage', 'calendar']
const icons = Object.fromEntries(ICON_NAMES.map((name, n) => {
  const col = n % 3, row = Math.floor(n / 3)
  const inCell = (p) => { const cx = (p.box[0] + p.box[2]) / 2, cy = (p.box[1] + p.box[3]) / 2; return Math.floor(cx / (1264 / 3)) === col && Math.floor(cy / 424) === row }
  return [name, piece(iconSrc.filter(inCell).map((p) => place(p, iconRole(p))))]
}))
if (icons.wreath.items.length !== 30) throw new Error('icon-pack-blue-1.svg: the wreath cell has changed')

// 2011: the digits 2, 1, 1 (shapes 5–7 of 2011-light.svg) and the wreath as the 0, as tall as the digits, where the
// ornament's ball was (x 477 in the file's units before its scale).
const yearSrc = parse('2011-light.svg')
const DIGIT_TOP = 435, BASE = 767
const year = (() => {
  const digits = [5, 6, 7].map((i) => place(yearSrc[i], 'digits'))
  const [sx, sy] = yearSrc[5].scale, w = icons.wreath.box
  const k = ((BASE - DIGIT_TOP) * sy) / (w[3] - w[1])
  const wreath = icons.wreath.items.map((it) => {
    const src = iconSrc.find((p) => p.d === it.d)
    return place(src, it.role, k, 477 * sx - ((w[0] + w[2]) / 2) * k, DIGIT_TOP * sy - w[1] * k)
  })
  return { ...piece([...digits, ...wreath]), base: BASE * sy, digitH: (BASE - DIGIT_TOP) * sy }
})()

// --- drawing ---
let maskId = 0
// A piece in a shirt's colours, w inches wide (or h tall), its top-left at (x, y) inches.
function draw(pc, S, { x, y, w, h }) {
  const [x0, y0, x1, y1] = pc.box, bw = x1 - x0, bh = y1 - y0
  if (!w) w = (h * bw) / bh
  if (!h) h = (w * bh) / bw
  const colour = (role) => (role === 'cut' ? null : role.startsWith('bulb') ? C9[+role.slice(4)] : S[role])
  const id = `m${maskId++}`, area = `x="${fmt(x0)}" y="${fmt(y0)}" width="${fmt(bw)}" height="${fmt(bh)}"`
  const mask = pc.items.map((it) => `<path transform="${it.tf}" fill="${colour(it.role) ? '#fff' : '#000'}" d="${it.d}"/>`).join('')
  const shapes = pc.items.filter((it) => colour(it.role)).map((it) => `<path transform="${it.tf}" fill="${colour(it.role)}" d="${it.d}"/>`).join('')
  return { w, h, svg: `<svg x="${fmt(x * U)}" y="${fmt(y * U)}" width="${fmt(w * U)}" height="${fmt(h * U)}" viewBox="${fmt(x0)} ${fmt(y0)} ${fmt(bw)} ${fmt(bh)}">` +
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${mask}</mask></defs><g mask="url(#${id})">${shapes}</g></svg>` }
}
const T = (s, { cap, fit, wght = 600, tracking = 0.04, fill }) => {
  const g = glyphs(s, OUTFIT, { wght })
  const t = textLine(s, { font: OUTFIT, location: { wght }, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
  return { w: t.width / U, cap: t.cap / U, at: (cx, base) => t.svg(cx * U, base * U, 'middle') }
}
// PEARLAND, TX — EST. 2011 with the year art, `width` inches wide, words and digits the same height; its baseline at base.
function yearLine(S, cx, base, width) {
  const unit = T('PEARLAND, TX — EST.', { cap: 1, tracking: 0.04 }).w, yrPerInch = (year.box[2] - year.box[0]) / year.digitH
  const d = width / (unit + 0.3 + yrPerInch)
  const words = T('PEARLAND, TX — EST.', { cap: d, tracking: 0.04, fill: S.digits })
  const left = cx - width / 2
  const yrTop = base - (year.base - year.box[1]) * (d / year.digitH)
  const art = draw(year, S, { x: left + words.w + 0.3 * d, y: yrTop, h: (year.box[3] - year.box[1]) * (d / year.digitH) })
  return { above: base - yrTop, svg: words.at(left + words.w / 2, base) + art.svg }
}

const designs = {
  'lit-house': (S) => {
    const W = 11, hs = draw(house, S, { x: 0, y: 0, w: 7.2 })
    const h1 = draw(house, S, { x: (W - hs.w) / 2, y: 0, w: hs.w })
    let y = h1.h + 0.55
    const wm = draw(wordmark, S, { x: 0.4, y, w: W - 0.8 })
    y += wm.h + 0.5
    const line = yearLine(S, W / 2, 0, W - 1.6)
    const base = y + line.above
    return { W, H: base + 0.25, body: h1.svg + wm.svg + yearLine(S, W / 2, base, W - 1.6).svg }
  },
  'wreath-2011': (S) => {
    const W = 11, top = T('LIGHTING UP PEARLAND SINCE', { fit: W - 1.2, tracking: 0.22, fill: S.small })
    let y = top.cap
    const yr = draw(year, S, { x: 0, y: y + 0.55, w: W })
    y += 0.55 + yr.h + 0.6
    const wm = draw(wordmark, S, { x: 1.4, y, w: W - 2.8 })
    return { W, H: y + wm.h + 0.05, body: top.at(W / 2, top.cap) + yr.svg + wm.svg }
  },
  services: (S) => {
    const W = 12, cell = W / 3, size = 2.5, labels = ['ROOFLINES', 'TREES', 'WREATHS', 'INSTALL', 'STORAGE', 'ON SCHEDULE']
    let body = ''
    ICON_NAMES.forEach((name, n) => {
      const col = n % 3, row = Math.floor(n / 3), pc = icons[name], [x0, y0, x1, y1] = pc.box
      const fitW = (x1 - x0) / (y1 - y0) > 1 ? size : (size * (x1 - x0)) / (y1 - y0), fitH = (fitW * (y1 - y0)) / (x1 - x0)
      const top = row * 4.2, cx = col * cell + cell / 2
      body += draw(pc, S, { x: cx - fitW / 2, y: top + (size - fitH), w: fitW }).svg
      body += T(labels[n], { cap: 0.28, tracking: 0.18, fill: S.text }).at(cx, top + size + 0.62)
    })
    const wm = draw(wordmark, S, { x: 1.5, y: 2 * 4.2 + 0.2, w: W - 3 })
    return { W, H: 8.6 + wm.h + 0.05, body: body + wm.svg }
  },
  chest: (S) => {
    const W = 4, hh = 1.55, hs = draw(house, S, { x: 0, y: 0, h: hh })
    const wmW = W - hs.w - 0.22, wm = draw(wordmark, S, { x: hs.w + 0.22, y: 0, w: wmW })
    return { W, H: hh, body: hs.svg + draw(wordmark, S, { x: hs.w + 0.22, y: (hh - wm.h) / 2, w: wmW }).svg }
  },
}

// --- output ---
const PPI = 50
const TEE = 'M2.6 1.6 L8.4 0.9 Q11 3.3 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z'
const tiles = []
for (const [key, make] of Object.entries(designs)) for (const [shirt, S] of Object.entries(SHIRTS)) {
  const { W, H, body } = make(S)
  const svg = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}in" height="${fmt(H)}in" viewBox="0 0 ${fmt(W * U)} ${fmt(H * U)}">${body}</svg>`)
  const name = `new-${key}-on-${shirt}`
  writeFileSync(`${DIR}${name}.svg`, svg)
  svgToPdf(svg, W, H, `${DIR}${name}.pdf`)
  // librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
  const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * DPI * 1.5) }).resize({ width: W * DPI, kernel: 'lanczos3' })
    .withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(`${DIR}${name}.png`, png)
  console.log(`${name}: ${W} x ${fmt(H)} in`)
  // A tee with the print 3 in below the collar (the chest one on the left chest), composited, then sized down.
  const chest = key === 'chest'
  const tee = `<svg xmlns="http://www.w3.org/2000/svg" width="${22 * PPI}" height="${24 * PPI}" viewBox="0 0 22 24"><rect width="22" height="24" fill="#e9ebf0"/>` +
    `<path d="${TEE}" fill="${S.tee}" stroke="${S.edge}" stroke-width="0.06" stroke-linejoin="round"/>` +
    `<text x="0.4" y="23.6" font-family="sans-serif" font-size="0.55" fill="#555b6b">${name}: ${W} in wide</text></svg>`
  const art = await sharp(png).resize({ width: W * PPI }).toBuffer()
  const dressed = await sharp(Buffer.from(tee)).composite([{ input: art, left: Math.round((chest ? 14.6 - W / 2 : 11 - W / 2) * PPI), top: Math.round((chest ? 4.2 : 3.6) * PPI) }]).png().toBuffer()
  tiles.push(await sharp(dressed).resize({ width: 440 }).png().toBuffer())
}
const th = (await sharp(tiles[0]).metadata()).height
await sharp({ create: { width: 440 * 4 + 30, height: th * 2 + 10, channels: 3, background: '#3b3f4b' } })
  .composite(tiles.map((input, i) => ({ input, left: Math.floor(i / 2) * 450, top: (i % 2) * (th + 10) }))).png().toFile(`${DIR}new-mockups.png`)
console.log('new-mockups.png: the four designs (columns) on navy (top) and gold (bottom)')
