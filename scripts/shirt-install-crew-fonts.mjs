// Install Crew's lettering in real fonts (owner, 2026-10-16: "the fonts in Install Crew all need replaced with actual
// fonts"; the AI drew every letter by hand, lumpy and uneven). The drawn letters come out and the same words go back in
// the same places, sizes and colours, as outlines (no fonts needed to print):
// - INSTALL CREW in Passion One Bold, on the same arc (a circle fitted to the old letters), over the same span;
// - PEARLAND, TX in Barlow Condensed Bold, on its own gentle arc;
// - CHRISTMAS LIGHT CREATIONS in Barlow Condensed Bold, straight, between its two stars.
// The ornaments (diamonds, stars, the line under PEARLAND) stay as drawn. Both fonts: SIL Open Font License,
// assets-source/brand/fonts/.
// Run: node scripts/shirt-install-crew-fonts.mjs → recraft/install-crew-fonts.svg (the art with the new lettering),
// install-crew-fonts-red-on-navy.png (navy knocked out, the neon red, as install-crew-red-on-navy.png) and
// install-crew-fonts-on-gold.png (scripts/shirt-install-crew-gold.mjs). Then scripts/shirt-install-crew-fixed.mjs
// lays the owner's roofline fix over both.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fmt, glyphs } from './lib/logoArt.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SCRIPTS = fileURLToPath(new URL('./', import.meta.url))
const FONT_DIR = fileURLToPath(new URL('../assets-source/brand/fonts/', import.meta.url))
const HEAVY = FONT_DIR + 'passion-one/PassionOne-Bold.ttf'
const CONDENSED = FONT_DIR + 'barlow-condensed/BarlowCondensed-Bold.ttf'
// The AI's pink neon to red, as on the other Install Crew prints (scripts/shirt-install-crew-gold.mjs).
const PINK = 'FEB9BD=E7555B,FE9FA9=E04047,FB7E88=D7262E,FFCBC9=EC6468,FE9EA2=E04046,FFAFB4=E54D53,FDD8DD=F06E72,FF999F=DF3C42,FFBBC0=E8575C,FF9DA0=E03F45,FFC5C7=EB5F64,FF9DA3=E03F45,FFCBCE=EC6468,FF9BA1=DF3D44,FFC9C8=EC6267,FF979A=DE3A41,FFBDBF=E9585E'

const src = readFileSync(DIR + 'install-crew-v2-pearland-white.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const tags = [...src.matchAll(/<path [^>]*\/>/g)].map((m) => m[0])
if (tags.length !== 372) throw new Error('install-crew-v2: not the 372-shape drawing any more')
// Each shape's points in file units (its scale transform applied) and fill.
const shapes = tags.map((t, i) => {
  const sc = (t.match(/scale\(([0-9.]+) ([0-9.]+)\)/) || [0, 1, 1]).slice(1).map(Number)
  const n = t.match(/ d="([^"]*)"/)[1].match(/-?[0-9.]+/g).map(Number)
  const pts = []
  for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k] * sc[0], n[k + 1] * sc[1]])
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  return { i, tag: t, fill: ((t.match(/fill="([^"]*)"/) || [])[1] || '').toUpperCase(), opacity: +((t.match(/fill-opacity="([^"]*)"/) || [])[1] ?? 1), pts,
    box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
})
const centre = (s) => [(s.box[0] + s.box[2]) / 2, (s.box[1] + s.box[3]) / 2]

// The drawn letters, by colour and place (checked counts, so a changed file stops here).
const pick = (name, count, test) => {
  const list = shapes.filter(test)
  if (list.length !== count) throw new Error(`install-crew-v2: ${name} is ${list.length} shapes, not ${count}`)
  return list
}
const arched = pick('INSTALL CREW', 11, (s) => s.fill === '#C79A3E' && s.box[3] < 1310 && s.box[2] - s.box[0] < 500)
const city = pick('PEARLAND, TX', 11, (s) => s.fill === '#FFFFFF' && s.box[1] > 3100 && s.box[3] < 3400)
const name = pick('CHRISTMAS LIGHT CREATIONS', 24, (s) => ['#C3923A', '#C79A3E', '#C69C57'].includes(s.fill) && s.box[1] > 3540 && s.box[0] > 1000 && s.box[2] < 3100)
const comma = city.reduce((a, b) => (b.box[3] - b.box[1] < a.box[3] - a.box[1] ? b : a)) // the smallest: the comma
// The faint vectorizer specks inside the lettering's areas go too (they would print as dots once the letters move).
const inside = (s, list) => list.some((l) => s.box[0] >= l.box[0] - 20 && s.box[2] <= l.box[2] + 20 && s.box[1] >= l.box[1] - 20 && s.box[3] <= l.box[3] + 20)
const letters = [...arched, ...city, ...name]
const specks = shapes.filter((s) => s.fill === '#FEFDFD' && s.opacity < 0.5 && inside(s, letters))
const drop = new Set([...letters, ...specks].map((s) => s.i))

// A circle through the old letters' centres (least squares: x² + y² + Dx + Ey + F = 0).
function fitCircle(points) {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0]
  for (const [x, y] of points) {
    const row = [x, y, 1], rhs = -(x * x + y * y)
    for (let r = 0; r < 3; r++) { b[r] += row[r] * rhs; for (let c = 0; c < 3; c++) A[r][c] += row[r] * row[c] }
  }
  for (let c = 0; c < 3; c++) for (let r = c + 1; r < 3; r++) { // Gaussian elimination
    const f = A[r][c] / A[c][c]
    for (let k = c; k < 3; k++) A[r][k] -= f * A[c][k]
    b[r] -= f * b[c]
  }
  const z = [0, 0, 0]
  for (let r = 2; r >= 0; r--) z[r] = (b[r] - A[r].slice(r + 1).reduce((s, v, k) => s + v * z[r + 1 + k], 0)) / A[r][r]
  const cx = -z[0] / 2, cy = -z[1] / 2
  return { cx, cy }
}

// Lays text on an arc round (cx, cy), letters standing outward, over the old letters' angular span, centred between
// their radii rIn (baseline) and rOut (cap height). Letters as tall as the old ones, spaced to fill the span; when a
// wide font would have to touch to fit, it keeps `minGap` (em) between letters and is set a little smaller instead.
function arcText(text, font, fill, old, { skipForSize = [], minGap = 0.04 } = {}) {
  const { cx, cy } = fitCircle(old.filter((s) => !skipForSize.includes(s)).map(centre))
  const radii = old.filter((s) => !skipForSize.includes(s)).map((s) => s.pts.map(([x, y]) => Math.hypot(x - cx, y - cy)))
  const median = (a) => a.sort((p, q) => p - q)[a.length >> 1]
  const rIn = median(radii.map((r) => Math.min(...r))), rOut = median(radii.map((r) => Math.max(...r)))
  const angle = ([x, y]) => Math.atan2(x - cx, cy - y) // 0 straight up, clockwise positive
  const angles = old.flatMap((s) => s.pts.map(angle))
  const [a0, a1] = [Math.min(...angles), Math.max(...angles)]
  const { upem, capHeight, glyphs: gs } = glyphs(text, font, {})
  const rMid = (rIn + rOut) / 2, span = (a1 - a0) * rMid, advEm = gs.reduce((t, g) => t + g.advance, 0) / upem
  const em = Math.min(((rOut - rIn) * upem) / capHeight, span / (advEm + minGap * (gs.length - 1))), s = em / upem
  const cap = (capHeight / upem) * em
  const gap = (span - advEm * em) / (gs.length - 1) // even spacing between letters, in file units at rMid
  let at = a0 * rMid
  const parts = gs.map((g) => {
    const w = g.advance * s, phi = (at + w / 2) / rMid
    at += w + gap
    if (!g.d) return ''
    const x = cx + rMid * Math.sin(phi), y = cy - rMid * Math.cos(phi)
    return `<path fill="${fill}" transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt((phi * 180) / Math.PI)}) translate(${fmt(-w / 2)} ${fmt(cap / 2)}) scale(${s} ${-s})" d="${g.d}"/>`
  })
  console.log(`${text}: arc centre ${Math.round(cx)},${Math.round(cy)}, radius ${Math.round(rIn)}–${Math.round(rOut)} (cap ${Math.round(cap)}), ${Math.round(((a1 - a0) * 180) / Math.PI)}°, letter gap ${(gap / em).toFixed(3)} em`)
  return parts.join('') // the colour on each letter: shirt-install-crew-gold.mjs recolours shapes by their own fill
}

// Straight text: baseline and cap from the old letters (medians), spaced to fill their width.
function straightText(text, font, fill, old) {
  const median = (a) => a.sort((p, q) => p - q)[a.length >> 1]
  const base = median(old.map((s) => s.box[3])), top = median(old.map((s) => s.box[1]))
  const x0 = Math.min(...old.map((s) => s.box[0])), x1 = Math.max(...old.map((s) => s.box[2]))
  const { upem, capHeight, glyphs: gs } = glyphs(text, font, {})
  const em = ((base - top) * upem) / capHeight, s = em / upem
  const gap = (x1 - x0 - gs.reduce((t, g) => t + g.advance * s, 0)) / (gs.length - 1)
  let x = x0
  const parts = gs.map((g) => {
    const p = g.d ? `<path fill="${fill}" transform="translate(${fmt(x)} ${fmt(base)}) scale(${s} ${-s})" d="${g.d}"/>` : ''
    x += g.advance * s + gap
    return p
  })
  console.log(`${text}: baseline ${Math.round(base)}, cap ${Math.round(base - top)}, ${Math.round(x0)}–${Math.round(x1)}, letter gap ${(gap / em).toFixed(3)} em`)
  return parts.join('') // the colour on each letter: shirt-install-crew-gold.mjs recolours shapes by their own fill
}

const lettering = arcText('INSTALL CREW', HEAVY, '#C79A3E', arched) + arcText('PEARLAND, TX', CONDENSED, '#FFFFFF', city, { skipForSize: [comma] }) +
  straightText('CHRISTMAS LIGHT CREATIONS', CONDENSED, '#C3923A', name)
let i = 0
const svg = src.replace(/<path [^>]*\/>/g, (t) => (drop.has(i++) ? '' : t)).replace(/<\/svg>\s*$/, lettering + '</svg>')
writeFileSync(DIR + 'install-crew-fonts.svg', svg)
console.log(`install-crew-fonts.svg: ${letters.length} drawn letters and ${specks.length} specks out, the three lines set in fonts`)

execFileSync('node', [SCRIPTS + 'shirt-knockout.mjs', DIR + 'install-crew-fonts.svg', DIR + 'install-crew-fonts-red-on-navy.png', '12', '1F2742,141A39,25263C,23202A', '--drop-bg', '--map', PINK], { stdio: 'inherit' })
execFileSync('node', [SCRIPTS + 'shirt-install-crew-gold.mjs', 'install-crew-fonts.svg', 'install-crew-fonts-on-gold.png'], { stdio: 'inherit' })
