// Area pages (/christmas-light-installation/<slug>/), built as static HTML by
// scripts/build-areas.mjs. A few real, distinct pages, not one per town:
// near-identical town pages count as "doorway pages" to Google.
// No customer counts on purpose (owner's call): confident, not specific.
//
// Photos: 3 or 5 per page (the first spans two columns), each with the
// caption and alt text of its `gallery` entry in content.js, where the owner
// named every photo's neighborhood (2026-10-13). A page leads with its own
// local photos; where we have none (Alvin), fillers from nearby keep their
// true caption and `photosNote` says so. Never caption from a file name.
import { gallery } from './content.js'

const pics = (...files) => files.map((file) => {
  const g = gallery.find((p) => p.src.endsWith(`/images/gallery/${file}`))
  if (!g) throw new Error(`area photo missing from the gallery in content.js: ${file}`)
  return { file, alt: g.alt, place: g.place }
})

export const areas = [
  {
    slug: 'pearland',
    name: 'Pearland',
    towns: ['Pearland', 'Shadow Creek Ranch', 'Silverlake', 'Lakes of Highland Glen', 'Stonebridge', 'Cobblestone', 'Southwyck', 'Cabot Cove', 'Towne Lake Estates', 'Green Tee', 'Brookside Village'],
    photos: pics('shadow-creek-ranch-pearland-02.jpg', 'stonebridge-pearland-04.jpg', 'silverlake-pearland.jpg', 'villages-marys-creek-pearland.jpg', 'southern-trails-pearland-christmas-install.jpg'),
    intro: 'Pearland is home. It’s where Christmas Light Creations started in 2011, and more of our customers live here than anywhere else. Many of them have had us back every season for years.',
    local: [
      'Being close means fast help: a bulb out or a tripped GFCI in Pearland is usually fixed the same day, and service calls never cost extra.',
      'We know the master-planned neighborhoods, from Shadow Creek Ranch, Silverlake and Lakes of Highland Glen to the older streets off Broadway, including the gates. Keep your gate code on file and we’ll handle the rest.',
      'Early installs start October 15th and book up first in Pearland. Booking before the end of October earns an early-install discount.',
    ],
  },
  {
    slug: 'league-city',
    name: 'League City',
    towns: ['League City', 'Tuscan Lakes', 'South Shore', 'The Lakefront Preserve', 'Westover Park', 'Victory Lakes'],
    photos: pics('lakefront-preserve-league-city-01.jpg', 'victory-lakes-league-city-02.jpg', 'centerpointe-league-city.jpg', 'westover-park-league-city.jpg', 'tightends-league-city-commercial.jpg'),
    intro: 'League City is one of our busiest areas, full of tall two-story homes where a ladder-free weekend sounds pretty good.',
    local: [
      'Taller rooflines are where a professional install shows: every run is measured with a wheel and custom-fit, so there are no extra strands hanging off the roof.',
      'Being close to the bay means more wind; we use commercial clips made for it, not tape or nails, and we come back free if anything comes loose.',
      'Service calls in League City are typically handled within a day, 48 hours at most in the busiest weeks.',
    ],
  },
  {
    slug: 'manvel',
    name: 'Manvel',
    towns: ['Manvel', 'Shadow Creek Ranch (west of 288)', 'Iowa Colony', 'Rosharon'],
    photos: pics('meridiana-manvel-iowa-colony.jpg', 'rodeo-palms-manvel.jpg', 'northfork-manvel.jpg', 'iowa-colony-clear-led-gables.jpg', 'pomona-pearland.jpg'),
    photosNote: 'Meridiana, Rodeo Palms, Northfork and Iowa Colony, plus one Pearland install just across 288: the same crew, lights and clips come to Manvel.',
    intro: 'Manvel and the newer neighborhoods west of 288 have grown fast, and so has our customer list there. More Manvel families leave their lights to us every season.',
    local: [
      'New construction often means big, simple rooflines that look sharp with one clean color. Ask about warm white versus multicolor LED at your estimate.',
      'You don’t need to be home for the estimate. We measure from the ground, so it takes about 30 minutes and we send the price by phone or email.',
      'Same team as Pearland, minutes away, so service calls are quick.',
    ],
  },
  {
    slug: 'friendswood',
    name: 'Friendswood',
    towns: ['Friendswood', 'West Ranch', 'Sterling Creek', 'The Forest of Friendswood'],
    photos: pics('west-ranch-friendswood.jpg', 'friendswood-lakes-friendswood.jpg', 'autumn-creek-friendswood.jpg', 'eagle-lakes-friendswood.jpg', 'the-forest-of-friendswood-friendswood.jpg'),
    intro: 'Friendswood’s tree-lined streets are made for Christmas lights. We light homes from West Ranch to Sterling Creek and the established neighborhoods in between.',
    local: [
      'Right next door to Pearland, where we started in 2011, so a bulb out mid-season is a short drive for the crew, and service calls are always free.',
      'Every install is all-inclusive: lights, clips, cords, timers, service calls, and removal in January, then we store your lights labeled in a bin for next year.',
      'Returning customers re-install at 50% of the original price every year after.',
    ],
  },
  {
    slug: 'clear-lake-bay-area',
    name: 'Clear Lake & the Bay Area',
    towns: ['Clear Lake', 'Webster', 'Seabrook', 'Kemah', 'El Lago', 'Pasadena', 'La Porte', 'Deer Park'],
    photos: pics('bay-oaks-clear-lake-city.jpg', 'nassau-bay-clear-lake-city.jpg', 'lakefront-preserve-league-city-03.jpg'),
    photosNote: 'Clear Lake City and League City, just down the road: the same crew, lights and clips come to Webster, Seabrook and Kemah.',
    intro: 'From Clear Lake and Webster to Seabrook and Kemah, we light homes all around the bay every season.',
    local: [
      'Bay breezes and salt air are hard on store-bought lights. We install professional-grade bulbs and commercial clips that hold up better near the water.',
      'LED bulbs are sealed in plastic, so they don’t shatter. That’s worth it on windy, exposed rooflines.',
      'We don’t install on clay or tile roofs. Everything else we can usually light.',
    ],
  },
  {
    slug: 'alvin-galveston-county',
    name: 'Alvin, Santa Fe & Galveston County',
    towns: ['Alvin', 'Santa Fe', 'Texas City', 'La Marque', 'Dickinson', 'Bacliff', 'San Leon', 'Galveston'],
    photos: pics('alvin-christmas-light-install.jpg', 'santa-fe-christmas-light-install.jpg', 'dickinson-christmas-light-install.jpg', 'east-beach-galveston.jpg', 'league-city-christmas-light-install.jpg'),
    photosNote: 'Alvin, Santa Fe, Dickinson and Galveston, plus one League City install: the same crew, lights and clips come to the whole county.',
    intro: 'South of Pearland, we light homes from Alvin and Santa Fe down through Texas City, Dickinson, Bacliff, San Leon and Galveston.',
    local: [
      'Farther out doesn’t mean second in line: service calls here are covered just like in Pearland, free, within 48 hours at the most.',
      'Bigger lots and longer runs? Every estimate is measured to the foot, so the price fits your home, not a guess.',
      'Removal starts January 3rd and is done by the 13th, so you’re never left with lights up into February.',
    ],
  },
]
