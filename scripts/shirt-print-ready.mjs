// Every print-ready shirt design, copied into one folder per shirt colour, with an index (owner, 2026-10-16: "what
// designs do we have ready to go on gold/blue/cream/white? can you take the print ready designs and organize them into
// folders"). The list below is the inventory: a design goes in every colour it prints well on. Superseded files are
// left out (the glow and plain flat crew logos, which print faded on navy; the pink Install Crew).
// Run: node scripts/shirt-print-ready.mjs → assets-source/shirts/print-ready/<colour>/ (copies, not in git: the
// Recraft art stays on this computer) and print-ready/README.md (the index, in git). Run it again after a design
// changes; it only replaces its own copies.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SHIRTS = fileURLToPath(new URL('../assets-source/shirts/', import.meta.url))
const OUT = SHIRTS + 'print-ready/'
const DPI = 300

// [file without extension (from assets-source/shirts/), what it is, extra files]
const crew = (place) => [`front-chest-${place}`, `back-full-${place}`]
const D = (name, what) => [`designs/${name}`, what]
const R = (name, what, extra = []) => [`recraft/${name}`, what, extra]
const POLO = ['wordmark', 'caps', 'logo', 'icon-1', 'icon-2']
// scripts/shirt-new-art.mjs: the owner's new artwork combined, a navy and a gold version of each.
const NEW = [['lit-house', 'the bulb cottage over the wordmark and PEARLAND, TX — EST. 2011 with the wreath'], ['wreath-2011', 'LIGHTING UP PEARLAND SINCE 2011 (wreath as the 0) over the wordmark'],
  ['services', 'six service icons with labels over the wordmark (back)'], ['chest', 'the bulb cottage beside the wordmark (left chest)']]
const FOLDERS = {
  navy: {
    title: 'Navy (blue) shirts',
    items: [
      ...crew('flat-knockout').map((f) => [f, 'the crew logo, full colour, wall knocked out to the shirt: the navy upload (DTG)']),
      ...crew('one-color-white').map((f) => [f, 'the crew logo in white only: screen print, 12+ shirts']),
      ...['scene', 'varsity', 'badge', 'badge-chest', 'sign', 'treepair', 'sunburst', 'crew', 'bulbs'].map((d) => D(`${d}-on-navy`, `${d} design (scripts/shirt-designs.mjs)`)),
      R('collegiate-on-navy', 'CHRISTMAS LIGHT CREATIONS EST. 2011, collegiate, gold ink'),
      R('holiday-lights-badge-on-navy', 'Holiday Lights badge (Recraft), navy knocked out'),
      R('install-crew-red-on-navy', 'Install Crew back print, red neon roofline'),
      R('lit-2011-on-navy', 'LIT SINCE 2011 with our cottage, cream and gold'),
      R('mascot-line-on-navy', 'Bradley line art, white ink'),
      R('mascot-gold-on-navy', 'Bradley in his flat cap, gold ink'),
      R('mascot-medal-on-navy', 'Brad Medel medal, white and gold'),
      R('mascot-medal-color', 'Brad Medel medal as drawn (any shirt, DTG/DTF)'),
      ...NEW.map(([n, what]) => R(`new-${n}-on-navy`, what)),
      ...POLO.map((m) => D(`polo-${m}-on-navy`, `navy polo, left chest ${m} (embroidery)`)),
    ],
  },
  gold: {
    title: 'Gold or mustard shirts',
    items: [
      ...['varsity', 'badge', 'badge-chest', 'treepair', 'sunburst', 'crew', 'bulbs'].map((d) => D(`${d}-on-gold`, `${d} design in navy ink (scripts/shirt-designs.mjs)`)),
      R('collegiate-on-gold', 'CHRISTMAS LIGHT CREATIONS EST. 2011, collegiate, navy ink'),
      R('retro-clc-on-gold', 'Retro CLC rainbow, set up for gold (navy ring, cream shadows and snow)'),
      R('mascot-gold-on-gold', 'Bradley in his flat cap, navy ink'),
      R('mascot-line-on-light', 'Bradley line art, navy ink'),
      R('mascot-medal-color', 'Brad Medel medal as drawn (DTG/DTF)'),
      ...NEW.map(([n, what]) => R(`new-${n}-on-gold`, what)),
      R('install-crew-on-gold', 'Install Crew back print set up for gold: navy lettering and sky, red neon (scripts/shirt-install-crew-gold.mjs)'),
      R('big-cottage-mustard-limited-dtg', 'big cottage, 12 in, for a mustard shirt (DTG)', ['recraft/big-cottage-mustard-limited-snow.svg']),
      R('big-cottage-mustard-dtf', 'big cottage to the hem, transparent (DTF transfer on mustard)'),
      R('big-cottage-mustard-allover', 'big cottage, mustard edge to edge (all-over sublimation; the exact look)'),
    ],
  },
  cream: {
    title: 'Cream (natural) shirts',
    items: [
      R('retro-clc-color', 'Retro CLC rainbow as drawn (DTG/DTF)'),
      R('retro-clc-5-color', 'Retro CLC rainbow in five spot colours (screen print)'),
      R('lit-2011-on-white', 'LIT SINCE 2011 with our cottage, navy and gold'),
      R('2011-ornament', '2011 with an ornament, gold numbers, PEARLAND, TX — EST. 2011'),
      R('mascot-line-on-light', 'Bradley line art, navy ink'),
      R('mascot-medal-on-white', 'Brad Medel medal, navy and gold'),
      R('mascot-medal-color', 'Brad Medel medal as drawn (DTG/DTF)'),
    ],
  },
  white: {
    title: 'White or light grey shirts',
    items: [
      R('retro-clc-color', 'Retro CLC rainbow as drawn (DTG/DTF)'),
      R('retro-clc-5-color', 'Retro CLC rainbow in five spot colours (screen print)'),
      R('lit-2011-on-white', 'LIT SINCE 2011 with our cottage, navy and gold'),
      R('2011-ornament', '2011 with an ornament, gold numbers, PEARLAND, TX — EST. 2011'),
      R('mascot-line-on-light', 'Bradley line art, navy ink'),
      R('mascot-medal-on-white', 'Brad Medel medal, navy and gold'),
      R('mascot-medal-color', 'Brad Medel medal as drawn (DTG/DTF)'),
      ...POLO.map((m) => D(`polo-${m}-on-white`, `white polo, left chest ${m} (embroidery)`)),
    ],
  },
  'hats-and-patches': {
    title: 'Hats and patches',
    items: [
      R('mascot-medal-patch', 'Brad Medel patch, 3.5 in, five threads'),
      R('mascot-hat-patch', 'arched front patch for the trucker hat, Bradley line art'),
      R('mascot-hat-leather', 'leather side patch, cottage and EST. 2011'),
      R('mascot-hat-leather-engrave', 'the leather patch as a laser file (black art, red cut line)'),
    ],
  },
}

const missing = []
for (const { items } of Object.values(FOLDERS)) for (const [f, , extra = []] of items) {
  if (!existsSync(SHIRTS + f + '.png')) missing.push(f + '.png')
  for (const e of extra) if (!existsSync(SHIRTS + e)) missing.push(e)
}
if (missing.length) throw new Error(`missing: ${missing.join(', ')} (rebuild with its script first)`)

const index = ['# Print-ready shirt designs', '', 'Made by `node scripts/shirt-print-ready.mjs` (copies, kept on this computer; this index is in git). One folder',
  'per shirt colour; a design that prints well on several colours is in each. For every design: the `.png` is the',
  'upload (300 dpi, transparent, print size); the `.svg` / `.pdf`, where there is one, is the vector for a screen',
  'printer or embroiderer. Sizes are the PNG at 300 dpi. Notes on each design: `../README.md` and `../designs/README.md`.', '']
for (const [folder, { title, items }] of Object.entries(FOLDERS)) {
  rmSync(OUT + folder, { recursive: true, force: true })
  mkdirSync(OUT + folder, { recursive: true })
  index.push(`## ${title}: \`${folder}/\` (${items.length})`, '', '| File | Size | What |', '|---|---|---|')
  for (const [f, what, extra = []] of items) {
    const files = ['.png', '.svg', '.pdf'].map((x) => f + x).filter((p) => existsSync(SHIRTS + p)).concat(extra)
    for (const p of files) copyFileSync(SHIRTS + p, `${OUT}${folder}/${basename(p)}`)
    const { width, height } = await sharp(SHIRTS + f + '.png').metadata()
    const kinds = files.map((p) => p.split('.').pop()).join(', ')
    index.push(`| \`${basename(f)}\` (${kinds}) | ${(width / DPI).toFixed(1)} x ${(height / DPI).toFixed(1)} in | ${what} |`)
  }
  index.push('')
  console.log(`${folder}/: ${items.length} designs`)
}
writeFileSync(OUT + 'README.md', index.join('\n'))
console.log('print-ready/README.md written')
