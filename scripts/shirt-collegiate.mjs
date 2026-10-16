// The owner's collegiate design from Recraft (CHRISTMAS LIGHT / CREATIONS / EST. 2011) made print-ready in two
// inks: gold on a navy shirt, navy on a gold or mustard shirt.
// Run: node scripts/shirt-collegiate.mjs   (reads and writes assets-source/shirts/recraft/, which is not in git)
//
// The download traced the letters well, but filled the gaps between them with dark slivers (the shirt) and some
// letter pieces with part opacity; EST. 2011 came out as lumpy blobs. So: the dark slivers go, every letter path
// is one solid ink, and EST. 2011 is set again in Inter ExtraBold at the traced line's size and place.
// Output: collegiate-on-<shirt>.png (300 dpi, transparent, print size), .svg and .pdf (vector, for a screen
// printer), and collegiate-preview.png (the print on navy, gold and mustard).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COLORS, FONTS, fmt, glyphs, textLine } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SRC = DIR + 'CLC-collegiate-svg.svg'
const WIDTH_IN = 11 // across the front, like the varsity design
const LETTERS = '#A67C37' // the traced gold; every other fill is the shirt showing between letters
const EST = { text: 'EST. 2011', cap: 34, baseline: 597, minY: 550, tracking: 0.12 } // drawing units; sized like the mockup's line (the trace's was 22 tall)
const INKS = { navy: COLORS.gold, gold: COLORS.navyDeep }
const TEES = { navy: '#152040', gold: '#f2b63a', mustard: '#C9911F' }

const src = readFileSync(SRC, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const paths = [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => ({
  fill: m[1].match(/fill="([^"]*)"/)[1],
  d: m[1].match(/ d="([^"]*)"/)[1],
}))
const box = (d) => {
  const n = d.match(/-?[0-9.]+/g).map(Number)
  const ys = n.filter((_, i) => i % 2 === 1), xs = n.filter((_, i) => i % 2 === 0)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}
// The two big lines only: the traced EST. 2011 sits below EST.minY.
const letters = paths.filter((p) => p.fill === LETTERS && box(p.d).y0 < EST.minY)
const bounds = letters.map((p) => box(p.d)).reduce((a, b) => ({
  x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1),
}))
const g = glyphs(EST.text, FONTS.inter, { wght: 800 })
const est = textLine(EST.text, { font: FONTS.inter, location: { wght: 800 }, em: (EST.cap * g.upem) / g.capHeight, tracking: EST.tracking })
const cx = (bounds.x0 + bounds.x1) / 2
const top = bounds.y0, bottom = EST.baseline, left = bounds.x0, right = bounds.x1
const w = right - left, h = bottom - top
const hIn = (WIDTH_IN * h) / w

function design(ink) {
  const body = letters.map((p) => `<path d="${p.d}"/>`).join('') + est.svg(cx, EST.baseline, 'middle')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(WIDTH_IN)}in" height="${fmt(hIn)}in" viewBox="${fmt(left)} ${fmt(top)} ${fmt(w)} ${fmt(h)}">` +
    `<g fill="${ink}">${body.replace(/fill="[^"]*"/g, '')}</g></svg>`
}

const previews = []
for (const [shirt, ink] of Object.entries(INKS)) {
  const svg = design(ink)
  const name = `collegiate-on-${shirt}`
  writeFileSync(DIR + name + '.svg', svg)
  svgToPdf(svg, WIDTH_IN, hIn, DIR + name + '.pdf')
  const px = Math.round(WIDTH_IN * 300)
  // librsvg reads the inch size at `density` dpi and sharp then scales by density/72, so pixels per inch come out
  // as density²/72: 180 gives 450 per inch, 1.5x the print's 300 (sized down after, crisper than sizing up).
  const r = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 300 * 1.5) }).resize({ width: px, kernel: 'lanczos3' })
    .withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(DIR + name + '.png')
  console.log(`${name}.png: ${r.width}x${r.height} px = ${(r.width / 300).toFixed(2)} x ${(r.height / 300).toFixed(2)} in`)
  for (const tee of shirt === 'navy' ? ['navy'] : ['gold', 'mustard']) previews.push({ tee, file: DIR + name + '.png' })
}
// Preview: each print on its shirt colour, side by side.
const PW = 900, pad = 90
const tiles = await Promise.all(previews.map(async ({ tee, file }) => {
  const art = await sharp(file).resize({ width: PW - 2 * pad }).toBuffer()
  const { height } = await sharp(art).metadata()
  return sharp({ create: { width: PW, height: height + 2 * pad, channels: 3, background: TEES[tee] } })
    .composite([{ input: art, left: pad, top: pad }]).png().toBuffer()
}))
const th = (await sharp(tiles[0]).metadata()).height
await sharp({ create: { width: PW * tiles.length, height: th, channels: 3, background: '#ffffff' } })
  .composite(tiles.map((input, i) => ({ input, left: i * PW, top: 0 }))).png().toFile(DIR + 'collegiate-preview.png')
console.log('collegiate-preview.png: navy, gold and mustard')
