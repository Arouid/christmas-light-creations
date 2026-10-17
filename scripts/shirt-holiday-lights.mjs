// The owner's Recraft "Holiday Lights" badge (recraft/holiday-lights-svg2.svg, not in git: HOLIDAY LIGHTS arched over
// the cottage in a starry ring, PEARLAND, TX under it) as a navy-shirt print, its hand-drawn lettering set in real
// fonts (owner, 2026-10-16: "start replacing the letters with actual font in all the designs"; scripts/lib/
// lettering.mjs): HOLIDAY LIGHTS and PEARLAND, TX in Passion One Bold on arcs fitted to the old letters. The navies are
// knocked out (the shirt is the badge's navy), the greys print white, the golds and white as drawn.
// Run: node scripts/shirt-holiday-lights.mjs → recraft/holiday-lights-fonts.svg and holiday-lights-badge-on-navy.png
// (10 in, 300 dpi).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { reletter } from './lib/lettering.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const HEAVY = fileURLToPath(new URL('../assets-source/brand/fonts/passion-one/PassionOne-Bold.ttf', import.meta.url))
const CENTRE = [2065, 1990] // the badge's gold ring (shape 8): the lettering runs round it, the cottage and stars inside
const outer = (s) => Math.hypot((s.box[0] + s.box[2]) / 2 - CENTRE[0], (s.box[1] + s.box[3]) / 2 - CENTRE[1]) > 1100

const src = readFileSync(DIR + 'holiday-lights-svg2.svg', 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '')
const re = reletter(src, [
  { text: 'HOLIDAY LIGHTS', colours: ['#BA994F'], box: [600, 500, 3500, 1830], count: 13, where: outer, font: HEAVY, arc: 'top' },
  { text: 'PEARLAND, TX', colours: ['white'], box: [740, 2450, 3400, 3500], count: 11, where: outer, font: HEAVY, arc: 'bottom', skipSmallest: 1, fill: '#FFFFFF' },
])
for (const n of re.notes) console.log(n)
writeFileSync(DIR + 'holiday-lights-fonts.svg', re.svg)
execFileSync('node', [fileURLToPath(new URL('shirt-knockout.mjs', import.meta.url)), DIR + 'holiday-lights-fonts.svg', DIR + 'holiday-lights-badge-on-navy.png', '10',
  '1A2742,131C35,1D2C46', '--drop-bg', '--map', 'B3B7C0=FFFFFF,758093=FFFFFF,F0F5F5=FFFFFF'], { stdio: 'inherit' })
