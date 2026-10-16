// "2011" with a Christmas ornament as the 0: the top of the owner's Recraft design (assets-source/shirts/recraft/
// 2011-light.svg, shapes 1–7; its lettering below is left out), recoloured and captioned. Owner, 2026-10-16: "use this
// part of the vector image we have. Numbers to gold, bulb to navy. Pearland, TX --- Est. 2011. bump the font size up
// on it so we can see". The ornament's highlight and ring hole are cut out (the shirt shows through); the caption is
// in Outfit (the brand-match sans, assets-source/brand/fonts/outfit/), as wide as the numbers.
// Run: node scripts/shirt-2011.mjs → recraft/2011-ornament.{png,svg,pdf} (11 in wide, 300 dpi, transparent) and
// 2011-ornament-preview.png (on cream, white and light grey).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { fmt, glyphs, textLine, unifyNavy } from './lib/logoArt.mjs'
import { svgToPdf } from './lib/pdf.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const OUTFIT = fileURLToPath(new URL('../assets-source/brand/fonts/outfit/Outfit-Variable.ttf', import.meta.url))
const GOLD = '#D4AF63', NAVY = '#1F304B' // the magnets' gold and navy
const WIDTH_IN = 11, DPI = 300
const ART = [1, 2, 3, 4, 5, 6, 7], ORNAMENT = 1, DIGITS = [5, 6, 7] // the rest (2, 3, 4) are cream: cut out
const ART_BOX = [72, 364, 952, 776] // checked below, in the file's units before its scale

const src = readFileSync(DIR + '2011-light.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const scale = src.match(/transform="scale\(([^)]*)\)"/)[1].split(/[ ,]+/).map(Number)
const paths = [...src.matchAll(/<path ([^>]*)\/>/g)].map((m) => m[1].match(/ d="([^"]*)"/)[1])
{
  const n = ART.flatMap((i) => paths[i].match(/-?[0-9.]+/g).map(Number))
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round)
  if (b.some((v, i) => Math.abs(v - ART_BOX[i]) > 2)) throw new Error(`2011-light.svg: shapes 1–7 are not the 2011 any more (box ${b})`)
}
// In the file's scaled units, with a margin for the caption.
const [x0, y0, x1, y1] = [ART_BOX[0] * scale[0], ART_BOX[1] * scale[1], ART_BOX[2] * scale[0], ART_BOX[3] * scale[1]]
const artW = x1 - x0, unit = WIDTH_IN / artW // inches per file unit

const ink = (i) => (i === ORNAMENT ? NAVY : DIGITS.includes(i) ? GOLD : null)
const mask = ART.map((i) => `<path fill="${ink(i) ? '#fff' : '#000'}" d="${paths[i]}"/>`).join('')
const shapes = ART.filter(ink).map((i) => `<path fill="${ink(i)}" d="${paths[i]}"/>`).join('')
const g = (body) => `<g transform="scale(${scale.join(' ')})">${body}</g>`
// The caption, as wide as the numbers, a gap of 0.3 of its height under them.
const caption = 'PEARLAND, TX  —  EST. 2011'
const gl = glyphs(caption, OUTFIT, { wght: 600 })
const line = textLine(caption, { font: OUTFIT, location: { wght: 600 }, fitWidth: artW, tracking: 0.14, fill: NAVY })
const capH = line.cap, gap = Math.max(capH * 1.1, 0.35 / unit)
const h = y1 - y0 + gap + capH + 2
const area = `x="${x0}" y="${y0}" width="${artW}" height="${y1 - y0}"`
const body = `<defs><mask id="cut" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#000"/>${g(mask)}</mask></defs>` +
  `<g mask="url(#cut)">${g(shapes)}</g>${line.svg(x0 + artW / 2, y1 + gap + capH, 'middle')}`
const hIn = h * unit
const svg = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_IN}in" height="${fmt(hIn)}in" viewBox="${fmt(x0)} ${fmt(y0)} ${fmt(artW)} ${fmt(h)}">${body}</svg>`)
writeFileSync(DIR + '2011-ornament.svg', svg)
svgToPdf(svg, WIDTH_IN, hIn, DIR + '2011-ornament.pdf')
// librsvg reads the inch size at `density` dpi and sharp scales by density/72 again: density²/72 px per inch.
const png = await sharp(Buffer.from(svg), { density: Math.sqrt(72 * DPI * 1.5) }).resize({ width: WIDTH_IN * DPI, kernel: 'lanczos3' })
  .withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(DIR + '2011-ornament.png', png)
console.log(`2011-ornament: ${WIDTH_IN} x ${fmt(hIn)} in, caption ${fmt(capH * unit)} in tall (${gl.glyphs.length} glyphs)`)
// Preview on the light shirt colours it suits.
const tiles = await Promise.all(['#FEFCF1', '#FFFFFF', '#D9DCE1'].map(async (bg) => {
  const art = await sharp(png).resize({ width: 600 }).toBuffer()
  const { height } = await sharp(art).metadata()
  return sharp({ create: { width: 700, height: height + 100, channels: 3, background: bg } }).composite([{ input: art, left: 50, top: 50 }]).png().toBuffer()
}))
const th = (await sharp(tiles[0]).metadata()).height
await sharp({ create: { width: 2120, height: th, channels: 3, background: '#888' } })
  .composite(tiles.map((input, i) => ({ input, left: i * 710, top: 0 }))).png().toFile(DIR + '2011-ornament-preview.png')
