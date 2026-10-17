// Install Crew's lettering in real fonts (owner, 2026-10-16: "the fonts in Install Crew all need replaced with actual
// fonts"; the AI drew every letter by hand, lumpy and uneven). The drawn letters come out and the same words go back in
// the same places, sizes and colours, as outlines (no fonts needed to print; scripts/lib/lettering.mjs):
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
import { arcText, parseShapes, pick, relettered, specksIn, straightText } from './lib/lettering.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const SCRIPTS = fileURLToPath(new URL('./', import.meta.url))
const FONT_DIR = fileURLToPath(new URL('../assets-source/brand/fonts/', import.meta.url))
const HEAVY = FONT_DIR + 'passion-one/PassionOne-Bold.ttf'
const CONDENSED = FONT_DIR + 'barlow-condensed/BarlowCondensed-Bold.ttf'
// The AI's pink neon to red, as on the other Install Crew prints (scripts/shirt-install-crew-gold.mjs).
const PINK = 'FEB9BD=E7555B,FE9FA9=E04047,FB7E88=D7262E,FFCBC9=EC6468,FE9EA2=E04046,FFAFB4=E54D53,FDD8DD=F06E72,FF999F=DF3C42,FFBBC0=E8575C,FF9DA0=E03F45,FFC5C7=EB5F64,FF9DA3=E03F45,FFCBCE=EC6468,FF9BA1=DF3D44,FFC9C8=EC6267,FF979A=DE3A41,FFBDBF=E9585E'

const src = readFileSync(DIR + 'install-crew-v2-pearland-white.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const shapes = parseShapes(src)
if (shapes.length !== 372) throw new Error('install-crew-v2: not the 372-shape drawing any more')

// The drawn letters, by colour and place (checked counts, so a changed file stops here).
const arched = pick(shapes, 'INSTALL CREW', 11, (s) => s.fill === '#C79A3E' && s.box[3] < 1310 && s.box[2] - s.box[0] < 500)
const city = pick(shapes, 'PEARLAND, TX', 11, (s) => s.fill === '#FFFFFF' && s.box[1] > 3100 && s.box[3] < 3400)
const name = pick(shapes, 'CHRISTMAS LIGHT CREATIONS', 24, (s) => ['#C3923A', '#C79A3E', '#C69C57'].includes(s.fill) && s.box[1] > 3540 && s.box[0] > 1000 && s.box[2] < 3100)
const comma = city.reduce((a, b) => (b.box[3] - b.box[1] < a.box[3] - a.box[1] ? b : a)) // the smallest: the comma
const letters = [...arched, ...city, ...name]
const specks = specksIn(shapes, letters).filter((s) => s.fill === '#FEFDFD')

const lines = [
  arcText('INSTALL CREW', { font: HEAVY, fill: '#C79A3E', old: arched }),
  arcText('PEARLAND, TX', { font: CONDENSED, fill: '#FFFFFF', old: city, skipForSize: [comma] }),
  straightText('CHRISTMAS LIGHT CREATIONS', { font: CONDENSED, fill: '#C3923A', old: name }),
]
for (const l of lines) console.log(l.note)
writeFileSync(DIR + 'install-crew-fonts.svg', relettered(src, [...letters, ...specks], lines.map((l) => l.svg).join('')))
console.log(`install-crew-fonts.svg: ${letters.length} drawn letters and ${specks.length} specks out, the three lines set in fonts`)

execFileSync('node', [SCRIPTS + 'shirt-knockout.mjs', DIR + 'install-crew-fonts.svg', DIR + 'install-crew-fonts-red-on-navy.png', '12', '1F2742,141A39,25263C,23202A', '--drop-bg', '--map', PINK], { stdio: 'inherit' })
execFileSync('node', [SCRIPTS + 'shirt-install-crew-gold.mjs', 'install-crew-fonts.svg', 'install-crew-fonts-on-gold.png'], { stdio: 'inherit' })
