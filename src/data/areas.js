// Area pages (/christmas-light-installation/<slug>/), built as static HTML by
// scripts/build-areas.mjs. A few real, distinct pages, not one per town:
// near-identical town pages count as "doorway pages" to Google.
// Home counts are from the customer list (2026), rounded down.

export const areas = [
  {
    slug: 'pearland',
    name: 'Pearland',
    towns: ['Pearland', 'Shadow Creek Ranch', 'Silverlake', 'Brookside Village'],
    homes: '40+',
    photos: ['Classic-Highland-Glen.jpg', 'Colored-RW-Pearland.jpg', 'Classic-Silverlake.jpg', 'Colored-LED-MULTI-Pearland.jpg'],
    intro: 'Pearland is home. It’s where Christmas Light Creations started in 2011, and more of our customers live here than anywhere else: over 40 Pearland households have us back season after season.',
    local: [
      'Being close means fast help: a bulb out or a tripped GFCI in Pearland is usually fixed the same day, and service calls never cost extra.',
      'We know the master-planned neighborhoods, from Shadow Creek Ranch and Silverlake to the older streets off Broadway, including the gates. Keep your gate code on file and we’ll handle the rest.',
      'Early installs start October 15th and book up first in Pearland. Booking before the end of October earns an early-install discount.',
    ],
  },
  {
    slug: 'league-city',
    name: 'League City',
    towns: ['League City', 'Tuscan Lakes', 'South Shore'],
    homes: '15+',
    photos: ['Classic-League-City.jpg', 'Classic-Highland-Glen-6.jpg'],
    intro: 'League City is our second-biggest area, with more than 15 homes on our list, many of them tall two-story houses where a ladder-free weekend sounds pretty good.',
    local: [
      'Taller rooflines are where a professional install shows: every run is measured with a wheel and custom-fit, so there are no extra strands hanging off the roof.',
      'Being close to the bay means more wind; we use commercial clips made for it, not tape or nails, and we come back free if anything comes loose.',
      'Service calls in League City are typically handled within a day, 48 hours at most in the busiest weeks.',
    ],
  },
  {
    slug: 'manvel',
    name: 'Manvel',
    towns: ['Manvel', 'Shadow Creek Ranch (west of 288)', 'Rosharon'],
    homes: '15+',
    photos: ['Classic-West-Ranch.jpg', 'Classic-Highland-Glen-3.jpg'],
    intro: 'Manvel and the newer neighborhoods west of 288 have grown fast, and so has our list there: more than 15 Manvel households now leave their lights to us.',
    local: [
      'New construction often means big, simple rooflines that look sharp with one clean color. Ask about warm white versus multicolor LED at your estimate.',
      'You don’t need to be home for the estimate. We measure from the ground, so it takes about 30 minutes and we send the price by phone or email.',
      'Same team as Pearland, minutes away, so service calls are quick.',
    ],
  },
  {
    slug: 'friendswood',
    name: 'Friendswood',
    towns: ['Friendswood', 'West Ranch', 'Sterling Creek'],
    homes: '9+',
    photos: ['Classic-West-Ranch.jpg', 'Classic-2-Ivy-Front.jpg'],
    intro: 'Friendswood’s tree-lined streets are made for Christmas lights. We light homes from West Ranch to Sterling Creek and the established neighborhoods in between.',
    local: [
      'Mature trees are half the show in Friendswood. We can wrap trunks and light trees and walkways along with the roofline.',
      'Every install is all-inclusive: lights, clips, cords, timers, service calls, and removal in January, then we store your lights labeled in a bin for next year.',
      'Returning customers re-install at 50% of the original price every year after.',
    ],
  },
  {
    slug: 'clear-lake-bay-area',
    name: 'Clear Lake & the Bay Area',
    towns: ['Clear Lake', 'Webster', 'Seabrook', 'Kemah', 'El Lago', 'Pasadena', 'La Porte', 'Deer Park'],
    homes: '10+',
    photos: ['Classic-Highland-Glen-4.jpg', 'lights.jpg'],
    intro: 'From Clear Lake and Webster to Seabrook and Kemah, we light homes all around the bay, about a dozen of them every season.',
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
    homes: '14+',
    photos: ['Classic-Highland-Glen-5.jpg', '20161128_183305-1.jpg'],
    intro: 'South of Pearland, we light homes from Alvin and Santa Fe down through Texas City, Dickinson, Bacliff, San Leon and Galveston.',
    local: [
      'Farther out doesn’t mean second in line: service calls here are covered just like in Pearland, free, within 48 hours at the most.',
      'Bigger lots and longer runs? Every estimate is measured to the foot, so the price fits your home, not a guess.',
      'Removal starts January 3rd and is done by the 13th, so you’re never left with lights up into February.',
    ],
  },
]
