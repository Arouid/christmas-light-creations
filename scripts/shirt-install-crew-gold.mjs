// Install Crew (the owner's Recraft back print, assets-source/shirts/recraft/install-crew-v2-pearland-white.svg, not in
// git) set up for a gold shirt (owner, 2026-10-16: "an install crew cottage shirt setup for gold"). On navy the sky,
// outlines and banner are knocked out to the shirt; on gold they print navy. Its gold would vanish into the shirt, so:
// the gold lettering, rings and ornaments go navy, the white PEARLAND, TX goes navy (it sits on the shirt), and the
// second gold (#C69C57) goes navy below the house (the ribbon's edge, the M of CHRISTMAS, the ornament line) but stays
// on the window panes. The pink neon roofline is red, as on the navy print.
// Run: node scripts/shirt-install-crew-gold.mjs [source.svg] [out.png] → recraft/install-crew-on-gold.png by default (12 in,
// 300 dpi, transparent).
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unifyNavy } from './lib/logoArt.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const KNOCKOUT = fileURLToPath(new URL('shirt-knockout.mjs', import.meta.url))
const NAVY = '#1F2742' // made the one print navy by unifyNavy below
const BELOW_HOUSE = 2850 // file units: the ribbon starts below this
// The AI's pink neon to red (same as the navy print, assets-source/shirts/README.md).
const PINK = 'FEB9BD=E7555B,FE9FA9=E04047,FB7E88=D7262E,FFCBC9=EC6468,FE9EA2=E04046,FFAFB4=E54D53,FDD8DD=F06E72,FF999F=DF3C42,FFBBC0=E8575C,FF9DA0=E03F45,FFC5C7=EB5F64,FF9DA3=E03F45,FFCBCE=EC6468,FF9BA1=DF3D44,FFC9C8=EC6267,FF979A=DE3A41,FFBDBF=E9585E'
const TO_NAVY = ['#C3923A', '#C79A3E', '#FFFFFF']

// allGold: the second gold to navy everywhere (v3 has no old window panes to keep gold).
const [SRC = 'install-crew-v2-pearland-white.svg', OUT = 'install-crew-on-gold.png', allGold] = process.argv.slice(2)
let n = 0
const svg = readFileSync(DIR + SRC, 'utf8').replace(/<path ([^>]*)\/>/g, (tag, attrs) => {
  const fill = (attrs.match(/fill="([^"]*)"/) || [])[1]?.toUpperCase()
  if (TO_NAVY.includes(fill)) { n++; return tag.replace(/fill="[^"]*"/, `fill="${NAVY}"`) }
  if (fill === '#C69C57') {
    const ys = attrs.match(/ d="([^"]*)"/)[1].match(/-?[0-9.]+/g).map(Number).filter((_, i) => i % 2 === 1)
    if (allGold === 'all' || (Math.min(...ys) + Math.max(...ys)) / 2 > BELOW_HOUSE) { n++; return tag.replace(/fill="[^"]*"/, `fill="${NAVY}"`) }
  }
  return tag
})
const tmp = DIR + 'install-crew-gold-prep.svg'
writeFileSync(tmp, unifyNavy(svg))
// Nothing is knocked out (000001 is no colour in the file): on gold every shape prints.
execFileSync('node', [KNOCKOUT, tmp, DIR + OUT, '12', '000001', '--drop-bg', '--map', PINK], { stdio: 'inherit' })
rmSync(tmp)
console.log(`${OUT}: ${n} shapes to navy`)
