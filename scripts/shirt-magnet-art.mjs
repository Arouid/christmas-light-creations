// The owner's three Recraft truck-magnet artworks as shirt prints: a back piece (11 in) and a sleeve piece (3.5 in), for
// navy and gold shirts (owner, 2026-10-16: "set this one up to be a sleeve/back piece. gold/navy", "these two as well").
// - badge: the cottage over a ribbon name in a gold-framed navy rounded panel (its white page dropped).
// - panel: the cottage beside CHRISTMAS / LIGHT / CREATIONS on navy.
// - lights: a C9 string over the name, the cottage, PEARLAND, TX · EST. 2011 on cream.
// Their near-black navies (lettering, outlines, panels) become the one print navy (unifyNavy). On a navy shirt the navy
// panels are knocked out, so the shirt is the panel; on a gold shirt they print, as a badge. The cream panel prints on
// both. Full-bleed panels get the magnets' rounded corners.
// Run: node scripts/shirt-magnet-art.mjs → recraft/magnet-<design>-<back|sleeve>-on-<navy|gold>.png and
// magnet-art-mockups.png (the backs on tees). Sources: recraft/vector-recraft-images/ (not in git).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { reletter } from './lib/lettering.mjs'
import { PRINT_NAVY, unifyNavy } from './lib/logoArt.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SRC = DIR + 'vector-recraft-images/'
const KNOCKOUT = fileURLToPath(new URL('shirt-knockout.mjs', import.meta.url))
// The AI's hand-drawn lettering, set again in Barlow Condensed (owner: "start replacing the letters with actual font
// in all the designs"; scripts/lib/lettering.mjs): each line's old letters (colour, the box they lie in, how many
// shapes) give way to the same words in the same place and size; the big words ExtraBold, the small lines Bold.
const FONTS_DIR = fileURLToPath(new URL('../assets-source/brand/fonts/barlow-condensed/', import.meta.url))
const BIG = FONTS_DIR + 'BarlowCondensed-ExtraBold.ttf', SMALL = FONTS_DIR + 'BarlowCondensed-Bold.ttf'
const DESIGNS = {
  badge: { file: 'a-landscape-truck-door-magnet-design--flat-artwork.svg', page: '#FEFEFE', knockOnNavy: true, lines: [
    { text: 'PEARLAND, TX • EST. 2011', colours: ['#FECD43'], box: [280, 40, 900, 100], count: 20, font: SMALL },
    { text: 'CHRISTMAS LIGHT CREATIONS', colours: ['#021934'], box: [120, 695, 1065, 812], count: 23, font: BIG, arc: 'top' },
  ] },
  panel: { file: 'a-landscape-truck-door-magnet-design--flat-artwork (1).svg', page: '#031A3D', round: true, knockOnNavy: true, lines: [
    { text: 'CHRISTMAS', colours: ['#FECB4E'], box: [590, 150, 1160, 280], count: 9, font: BIG },
    { text: 'LIGHT', colours: ['#F9E5C0'], box: [600, 280, 1160, 495], count: 5, font: BIG },
    { text: 'CREATIONS', colours: ['#FECB4E'], box: [590, 500, 1160, 660], count: 9, font: BIG },
    { text: 'PEARLAND, TX • EST. 2011', colours: ['#F7FBFD'], box: [620, 665, 1140, 720], count: 20, font: SMALL },
  ] },
  lights: { file: 'a-landscape-truck-door-magnet-design--flat-artwork (2).svg', page: '#F9E5C1', round: true, knockOnNavy: false, lines: [
    { text: 'CHRISTMAS', colours: ['#011531'], box: [50, 180, 1140, 360], count: 9, font: BIG },
    { text: 'LIGHT CREATIONS', colours: ['#011531'], box: [40, 365, 1160, 520], count: 14, font: BIG },
    { text: 'PEARLAND, TX', colours: ['#011531'], box: [635, 665, 1155, 765], count: 10, font: SMALL },
    { text: 'EST. 2011', colours: ['#011531', '#0C152C'], box: [745, 772, 1040, 835], count: 8, font: SMALL, fill: '#011531' },
  ] },
}
const SIZES = { back: 11, sleeve: 3.5 }
const RADIUS = 40 // viewBox units: the panels' rounded corners (the magnets' 0.75 in at 24 in wide, in proportion)

const tmp = mkdtempSync(join(tmpdir(), 'clc-magnet-art-'))
const made = []
for (const [name, d] of Object.entries(DESIGNS)) {
  let svg = readFileSync(SRC + d.file, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
  const first = svg.match(/<path [^>]*\/>/)[0]
  if (!first.toUpperCase().includes(`FILL="${d.page}"`)) throw new Error(`${d.file}: its first shape is not the ${d.page} page any more`)
  const re = reletter(svg, d.lines)
  svg = re.svg
  for (const n of re.notes) console.log(`${name}: ${n}`)
  const [, , vw, vh] = svg.match(/viewBox="([^"]*)"/)[1].split(/[ ,]+/).map(Number)
  if (d.round) {
    // the page stays as the panel, every shape clipped to a rounded rectangle
    svg = svg.replace(/(<svg[^>]*>)/, `$1<defs><clipPath id="rounded"><rect width="${vw}" height="${vh}" rx="${RADIUS}"/></clipPath></defs><g clip-path="url(#rounded)">`)
      .replace(/<\/svg>\s*$/, '</g></svg>')
  } else svg = svg.replace(first, '') // the white page outside the frame
  svg = unifyNavy(svg)
  const prep = join(tmp, `${name}.svg`)
  writeFileSync(prep, svg)
  for (const shirt of ['navy', 'gold']) {
    // 000001 is no colour in the file: nothing knocked out
    const knock = shirt === 'navy' && d.knockOnNavy ? PRINT_NAVY.slice(1) : '000001'
    for (const [place, inches] of Object.entries(SIZES)) {
      const out = `${DIR}magnet-${name}-${place}-on-${shirt}.png`
      execFileSync('node', [KNOCKOUT, prep, out, String(inches), knock], { stdio: 'inherit' })
      made.push({ name, place, shirt, out })
    }
  }
}
rmSync(tmp, { recursive: true, force: true })

// The backs on tees, navy then gold.
const PPI = 40
const TEE = 'M2.6 1.6 L8.4 0.9 Q11 3.3 13.6 0.9 L19.4 1.6 L21.8 6.6 L19.2 8.4 L18 6.9 L18 26.9 Q18 27.3 17.6 27.3 L4.4 27.3 Q4 27.3 4 26.9 L4 6.9 L2.8 8.4 L0.2 6.6 Z'
const TEES = { navy: ['#152040', '#0b1430'], gold: ['#EAA92B', '#c48d1f'] }
const tiles = []
for (const m of made.filter((x) => x.place === 'back')) {
  const [fill, edge] = TEES[m.shirt]
  const tee = `<svg xmlns="http://www.w3.org/2000/svg" width="${22 * PPI}" height="${20 * PPI}" viewBox="0 0 22 20"><rect width="22" height="20" fill="#e9ebf0"/><path d="${TEE}" fill="${fill}" stroke="${edge}" stroke-width="0.06"/></svg>`
  const art = await sharp(m.out).resize({ width: 11 * PPI }).toBuffer()
  tiles.push(await sharp(await sharp(Buffer.from(tee)).composite([{ input: art, left: Math.round(5.5 * PPI), top: Math.round(3.6 * PPI) }]).png().toBuffer()).resize({ width: 440 }).png().toBuffer())
}
const th = (await sharp(tiles[0]).metadata()).height
await sharp({ create: { width: 450 * 3 - 10, height: th * 2 + 10, channels: 3, background: '#3b3f4b' } })
  .composite(tiles.map((input, i) => ({ input, left: Math.floor(i / 2) * 450, top: (i % 2) * (th + 10) }))).png().toFile(`${DIR}magnet-art-mockups.png`)
console.log('magnet-art-mockups.png: badge, panel, lights (columns) on navy (top) and gold (bottom)')
