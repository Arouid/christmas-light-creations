// Install Crew with a thin red roofline (owner, 2026-10-16, with his own MS Paint sketch: "why cant we just fix it like
// this?"): its own roof and house, the thick pink neon band (17 pinks in fills and gradients, as the AI drew it) turned
// to snow, and one red line along the band's lower edge, where the eave meets the walls, drawn over everything (shapes
// drawn after the band covered it in places; owner: "now we don't have the red neon line", "we need the line we don't
// need the bleed everywhere"). The neon's dark plum shadow side above the line goes to snow as well, so the snow and
// its icicles fill solid down to the line (owner: "gotta fill in the icicles too"); the same plums lower down are the
// corner posts' shading and stay.
// Run: node scripts/shirt-install-crew-thin.mjs → recraft/install-crew-thin-on-navy.png (the navies knocked out) and
// recraft/install-crew-thin-on-gold.png (scripts/shirt-install-crew-gold.mjs), 12 in wide, 300 dpi.
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SCRIPTS = fileURLToPath(new URL('./', import.meta.url))
const SNOW = '#FEFDFD' // the roof's own white
const RED = '#D7262E', LINE = 26, RAISE = 9 // the line: colour, width and how far above the band's lower edge (file units)
const PINKS = ['FEB9BD', 'FE9FA9', 'FB7E88', 'FFCBC9', 'FE9EA2', 'FFAFB4', 'FDD8DD', 'FF999F', 'FFBBC0', 'FF9DA0', 'FFC5C7', 'FF9DA3', 'FFCBCE', 'FF9BA1', 'FFC9C8', 'FF979A', 'FFBDBF',
  '59263D', '3E2C40'] // the last two: gradient_12's stops, a plum patch at the roof's foot
const PLUMS = ['763043', '4E2840', '942E3E', '622D3B'] // the neon's shadow side (above the line) and the posts' shading (below)

const src = readFileSync(DIR + 'install-crew-v2-pearland-white.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const head = src.match(/<svg[^>]*>/)[0]
const tags = [...src.matchAll(/<path [^>]*\/>/g)].map((m) => m[0])
const BAND = 218
if (tags.length !== 372 || !/fill="#FE9EA2"/i.test(tags[BAND])) throw new Error('install-crew-v2: shape 218 is not the neon band any more')

// The band's lower edge, column by column (1 px per unit).
const { data, info } = await sharp(Buffer.from(head + tags[BAND].replace(/fill="[^"]*"/, 'fill="#000"') + '</svg>'), { density: 72 })
  .flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true })
const low = new Array(info.width).fill(-1)
for (let x = 0; x < info.width; x++) for (let y = 0; y < info.height; y++) if (data[y * info.width + x] < 128) low[x] = y
const cols = low.map((v, x) => (v >= 0 ? x : -1)).filter((x) => x >= 0)
// The edge has drips (the old neon's icicle-like bumps): a running median takes them out, a running mean smooths the
// rest, so the line is one clean wave.
const window = (arr, i, r) => arr.slice(Math.max(0, i - r), i + r + 1)
const edge = cols.map((x) => low[x])
const median = edge.map((_, i) => window(edge, i, 40).sort((a, b) => a - b)[window(edge, i, 40).length >> 1])
const smooth = median.map((_, i) => { const w = window(median, i, 30); return w.reduce((a, b) => a + b, 0) / w.length })
const smoothAt = Object.fromEntries(cols.map((x, i) => [x, Math.round(smooth[i])]))
const lineAt = (x) => smoothAt[Math.max(cols[0], Math.min(cols[cols.length - 1], Math.round(x)))] - RAISE
const pts = cols.filter((x) => x % 6 === 0).map((x) => `${x},${lineAt(x)}`)
const line = `<polyline points="${pts.join(' ')}" fill="none" stroke="${RED}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round"/>`

// Pinks to snow (fills and gradient stops); plums above the line to snow; the line last.
let svg = src.replace(/(fill|stop-color)="#([0-9A-Fa-f]{6})"/g, (m, attr, hex) => (PINKS.includes(hex.toUpperCase()) ? `${attr}="${SNOW}"` : m))
let plums = 0
svg = svg.replace(/<path ([^>]*)\/>/g, (t, a) => {
  const fill = (a.match(/fill="#([0-9A-Fa-f]{6})"/) || [])[1]?.toUpperCase()
  if (!PLUMS.includes(fill)) return t
  const n = a.match(/ d="([^"]*)"/)[1].match(/-?[0-9.]+/g).map(Number)
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
  if ((Math.min(...ys) + Math.max(...ys)) / 2 >= lineAt((Math.min(...xs) + Math.max(...xs)) / 2)) return t
  plums++
  return t.replace(/fill="[^"]*"/, `fill="${SNOW}"`)
})
svg = svg.replace(/<\/svg>\s*$/, line + '</svg>')
const prep = DIR + 'install-crew-thin.svg'
writeFileSync(prep, svg)
console.log(`install-crew-thin.svg: neon to snow (and ${plums} of its shadow shapes), a ${LINE}-unit red line over everything`)

execFileSync('node', [SCRIPTS + 'shirt-knockout.mjs', prep, DIR + 'install-crew-thin-on-navy.png', '12', '1F2742,141A39,25263C,23202A', '--drop-bg'], { stdio: 'inherit' })
execFileSync('node', [SCRIPTS + 'shirt-install-crew-gold.mjs', 'install-crew-thin.svg', 'install-crew-thin-on-gold.png'], { stdio: 'inherit' })
rmSync(prep)
