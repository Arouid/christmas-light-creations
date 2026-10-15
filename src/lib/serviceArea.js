// Is a place in our service area? The towns are `serviceAreas` in content.js
// (the Google Business Profile's list, exactly); the ZIP codes for each are
// here, so staff lists can leave out people we can't serve. Pure, tested
// (tests/oldEstimates.test.mjs). A town added to content.js needs its ZIPs
// here too, or the test fails.
import { serviceAreas } from '../data/content.js'

export const AREA_ZIPS = {
  Pearland: ['77581', '77584', '77588'],
  Friendswood: ['77546', '77549'],
  'Brookside Village': ['77581'],
  'League City': ['77573', '77574'],
  Webster: ['77598'],
  'Clear Lake': ['77058', '77059', '77062'],
  Pasadena: ['77501', '77502', '77503', '77504', '77505', '77506', '77507', '77508'],
  'Deer Park': ['77536'],
  'La Porte': ['77571', '77572'],
  Seabrook: ['77586'],
  'El Lago': ['77586'],
  Kemah: ['77565'],
  Alvin: ['77511', '77512'],
  Manvel: ['77578'],
  Dickinson: ['77539'],
  'Santa Fe': ['77510', '77517'],
  'Texas City': ['77590', '77591', '77592'],
  Bacliff: ['77518'],
  'San Leon': ['77539'],
  Galveston: ['77550', '77551', '77552', '77553', '77554', '77555'],
}
const ZIPS = new Set(Object.values(AREA_ZIPS).flat())
// Other ways people write our towns (neighborhoods inside them, spellings).
const ALIASES = ['laporte', 'shadow creek', 'silverlake', 'nassau bay', 'taylor lake']
const TOWN = new RegExp(`\\b(${[...serviceAreas, ...ALIASES].map((t) => t.toLowerCase().replace(/ /g, '\\s+')).join('|')})\\b`, 'i')
// Texas ZIPs (75xxx–79xxx), not house numbers like "12302 Main".
const ZIP = /\b(7[5-9]\d{3})(?:-\d{4})?\b/g

// 'in', 'out' or '' (can't tell). `address` is where they live; `other` is
// free text (their messages), read only when the address says nothing.
// A ZIP of ours or one of our towns in the address → in; any other Texas ZIP
// → out; our town named in a message → in.
export function areaOf(address = '', other = '') {
  const zips = (s) => [...String(s ?? '').matchAll(ZIP)].map((m) => m[1])
  const home = zips(address)
  if (home.some((z) => ZIPS.has(z)) || TOWN.test(address)) return 'in'
  if (home.length) return 'out'
  const said = zips(other)
  if (said.some((z) => ZIPS.has(z))) return 'in'
  if (said.length) return 'out'
  return TOWN.test(other) ? 'in' : ''
}
