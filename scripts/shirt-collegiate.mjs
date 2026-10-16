// The owner's collegiate design from Recraft (CHRISTMAS LIGHT / CREATIONS / EST. 2011) made print-ready in two
// inks: gold on a navy shirt, navy on a gold or mustard shirt. Two versions for the owner to pick from:
// - traced ("collegiate-…"): the download's own letters. It traced them well but filled the gaps between them
//   with dark slivers (the shirt) and some pieces with part opacity, so the slivers go and every letter is one
//   solid ink; the hand-traced edges keep a slight wobble.
// - font ("collegiate-font-…"): the same words, sizes and places set in Graduate, a collegiate block face
//   (Google Fonts, SIL Open Font License, assets-source/brand/fonts/graduate/), as outlines: straight edges.
// In both, EST. 2011 (traced as lumpy blobs) is set in Inter ExtraBold at the mockup's size.
// Run: node scripts/shirt-collegiate.mjs   (reads and writes assets-source/shirts/recraft/, which is not in git)
// Output per version and shirt: <name>-on-<shirt>.png (300 dpi, transparent, print size), .svg and .pdf (vector,
// for a screen printer); collegiate-preview.png: traced on top, font below, on navy, gold and mustard.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COLORS, fmt, FONTS, glyphs, textLine, unifyNavy } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SRC = DIR + 'CLC-collegiate-svg.svg'
const GRADUATE = fileURLToPath(new URL('../assets-source/brand/fonts/graduate/Graduate-Regular.ttf', import.meta.url))
const WIDTH_IN = 11 // across the front, like the varsity design
const LETTERS = '#A67C37' // the traced gold; every other fill is the shirt showing between letters
// In the download's drawing units: its two big lines are 120 tall with baselines at 377 and 522, centred on 640.5.
const BIG = { lines: ['CHRISTMAS LIGHT', 'CREATIONS'], cap: 120, baselines: [377, 522], cx: 640.5, tracking: 0.03 }
const EST = { text: 'EST. 2011', cap: 34, baseline: 597, minY: 550, tracking: 0.12 } // sized like the mockup's line (the trace's was 22 tall)
const PAD = 4 // room for round letters' overshoot
const INKS = { navy: COLORS.gold, gold: COLORS.navyDeep }
const TEES = { navy: '#152040', gold: '#f2b63a', mustard: '#C9911F' }

const sized = (text, font, location, cap, tracking) => {
  const g = glyphs(text, font, location)
  return textLine(text, { font, location, em: (cap * g.upem) / g.capHeight, tracking })
}
const est = sized(EST.text, FONTS.inter, { wght: 800 }, EST.cap, EST.tracking)
const estSvg = est.svg(BIG.cx, EST.baseline, 'middle')

function traced() {
  const src = readFileSync(SRC, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
  const paths = [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => ({ fill: m[1].match(/fill="([^"]*)"/)[1], d: m[1].match(/ d="([^"]*)"/)[1] }))
  const box = (d) => {
    const n = d.match(/-?[0-9.]+/g).map(Number)
    const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys) }
  }
  // The two big lines only: the traced EST. 2011 sits below EST.minY.
  const letters = paths.filter((p) => p.fill === LETTERS && box(p.d).y0 < EST.minY)
  const b = letters.map((p) => box(p.d)).reduce((a, c) => ({ x0: Math.min(a.x0, c.x0), x1: Math.max(a.x1, c.x1), y0: Math.min(a.y0, c.y0) }))
  return { body: letters.map((p) => `<path d="${p.d}"/>`).join(''), left: b.x0, right: b.x1, top: b.y0 }
}

function font() {
  const lines = BIG.lines.map((t) => sized(t, GRADUATE, {}, BIG.cap, BIG.tracking))
  const half = Math.max(...lines.map((l) => l.width)) / 2
  return { body: lines.map((l, i) => l.svg(BIG.cx, BIG.baselines[i], 'middle')).join(''), left: BIG.cx - half, right: BIG.cx + half, top: BIG.baselines[0] - BIG.cap }
}

const previews = { collegiate: [], 'collegiate-font': [] }
for (const [name, make] of [['collegiate', traced], ['collegiate-font', font]]) {
  const v = make()
  const left = v.left - PAD, top = v.top - PAD, w = v.right - v.left + 2 * PAD, h = EST.baseline + PAD - top
  const hIn = (WIDTH_IN * h) / w
  for (const [shirt, ink] of Object.entries(INKS)) {
    const svg = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(WIDTH_IN)}in" height="${fmt(hIn)}in" viewBox="${fmt(left)} ${fmt(top)} ${fmt(w)} ${fmt(h)}">` +
      `<g fill="${ink}">${(v.body + estSvg).replace(/ fill="[^"]*"/g, '')}</g></svg>`)
    const file = `${name}-on-${shirt}`
    writeFileSync(DIR + file + '.svg', svg)
    svgToPdf(svg, WIDTH_IN, hIn, DIR + file + '.pdf')
    const px = Math.round(WIDTH_IN * 300)
    // librsvg reads the inch size at `density` dpi and sharp then scales by density/72, so pixels per inch come out
    // as density²/72: 180 gives 450 per inch, 1.5x the print's 300 (sized down after, crisper than sizing up).
    const r = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * 300 * 1.5) }).resize({ width: px, kernel: 'lanczos3' })
      .withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(DIR + file + '.png')
    console.log(`${file}.png: ${r.width}x${r.height} px = ${(r.width / 300).toFixed(2)} x ${(r.height / 300).toFixed(2)} in`)
    for (const tee of shirt === 'navy' ? ['navy'] : ['gold', 'mustard']) previews[name].push({ tee, file: DIR + file + '.png' })
  }
}
// Preview: each print on its shirt colour, traced row above the font row.
const PW = 900, pad = 90
const tile = async ({ tee, file }) => {
  const art = await sharp(file).resize({ width: PW - 2 * pad }).toBuffer()
  const { height } = await sharp(art).metadata()
  return sharp({ create: { width: PW, height: height + 2 * pad, channels: 3, background: TEES[tee] } })
    .composite([{ input: art, left: pad, top: pad }]).png().toBuffer()
}
const rows = await Promise.all(Object.values(previews).map((row) => Promise.all(row.map(tile))))
const heights = await Promise.all(rows.map(async (row) => (await sharp(row[0]).metadata()).height))
const composite = rows.flatMap((row, j) => row.map((input, i) => ({ input, left: i * PW, top: heights.slice(0, j).reduce((a, b) => a + b + 12, 0) })))
await sharp({ create: { width: PW * 3, height: heights.reduce((a, b) => a + b + 12, -12), channels: 3, background: '#ffffff' } })
  .composite(composite).png().toFile(DIR + 'collegiate-preview.png')
console.log('collegiate-preview.png: traced (top) and font (bottom) on navy, gold and mustard')
