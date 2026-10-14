// Repaints the SVG Repo holiday icons in assets-source/stock/svg-repo-icons into the
// site's palette (src/lib/holidayIcons.js) and writes them to
// public/images/holiday/<name>.svg, plus a contact sheet in dist/ to look at.
//   node scripts/holiday-icons.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { repaint } from '../src/lib/holidayIcons.js'

const src = 'assets-source/stock/svg-repo-icons'
const out = 'public/images/holiday'
mkdirSync(out, { recursive: true })
mkdirSync('dist', { recursive: true })
const files = readdirSync(src).filter((f) => f.endsWith('.svg')).sort()
const tiles = []
for (const [i, f] of files.entries()) {
  const name = f.replace(/^christmas-/, '')
  const svg = repaint(readFileSync(`${src}/${f}`, 'utf8'))
  writeFileSync(`${out}/${name}`, svg)
  const png = await sharp(Buffer.from(svg), { density: 72 }).resize(180, 180, { fit: 'contain', background: { r: 5, g: 11, b: 26, alpha: 1 } }).png().toBuffer()
  tiles.push({ input: png, left: (i % 4) * 200 + 10, top: Math.floor(i / 4) * 200 + 10 })
}
const rows = Math.ceil(files.length / 4)
await sharp({ create: { width: 4 * 200 + 10, height: rows * 200 + 10, channels: 4, background: { r: 5, g: 11, b: 26, alpha: 1 } } })
  .composite(tiles).png().toFile('dist/holiday-icons-sheet.png')
console.log(`${files.length} icons → ${out}/ (and dist/holiday-icons-sheet.png)`)
