// The gift-wrapping page's ribbon (docs/specs/gift-wrapping.md), drawn in CSS so it is solid and
// runs the full width on every screen. Owner 2026-10-15: "try thyer red bow with the black ribbon
// strips for the top", then "change the black to something more christmasy" and "go" on deep
// evergreen: an evergreen satin band with a thin gold line and a red edge on each side (like the
// band in his Vecteezy file 48804124), under his own top bow (top-bow.png), whose holly it
// matches. It goes across the top of the page, down its middle (the same ribbon, tied round the
// present) and along the top of each section box.
const BAND = [
  '#9e0d1c 0', '#d9182c 6%', '#d9182c 9%', '#b98a2f 9%', '#f0d27a 11%', '#b98a2f 13%',
  '#0d3b24 13%', '#1b5e3b 50%', '#0d3b24 87%',
  '#b98a2f 87%', '#f0d27a 89%', '#b98a2f 91%', '#d9182c 91%', '#d9182c 94%', '#9e0d1c 100%',
].join(', ')

// Running across (its edges top and bottom) and running down (left and right). Running down it
// also has a thin gold line down its middle, the whole way (owner 2026-10-15: "finish the gold line
// down the middle of the ribbon"); at the price tag that line becomes the cord the tag hangs from.
const CENTRE = 'linear-gradient(to right, transparent calc(50% - 1px), #b98a2f calc(50% - 1px), #f0d27a 50%, #b98a2f calc(50% + 1px), transparent calc(50% + 1px))'
export const ribbonX = { backgroundImage: `linear-gradient(to bottom, ${BAND})` }
export const ribbonY = { backgroundImage: `${CENTRE}, linear-gradient(to right, ${BAND})` }

// The ribbon wrapped in a string of C9 Christmas lights (owner 2026-10-15: "i wanna wrap that ribbon in
// C9 christmas lights", "can we trun them on and off?", "the christmas lights lost their wire?", then
// a switch for visitors and "theres not much ribbon exposed near the top ... were not getting a
// dramatic effect", so the top ribbon has them too): a green wire crossing the ribbon on the
// diagonal, as if it winds round it, with big cone bulbs in red, green, blue and amber.
// ribbonDown / ribbonAcross draw the wire and every bulb switched off (dark) over the ribbon;
// lightsDown / lightsAcross are the two sets switched on, with a highlight and a soft glow, laid over
// it and blinked in turn (.twinkle in index.css). Each is one tile the ribbon's width (down) or height
// (across), scaling with it and repeating along it, so the layers line up.
const tileOf = (svg) => `url("data:image/svg+xml,${svg}")`
const DOWN = { backgroundSize: '100% auto', backgroundRepeat: 'repeat-y' }
const ACROSS = { backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x' }
export const ribbonDown = {
  backgroundImage: `${tileOf("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 160' width='60' height='160'><path d='M-4 6Q30 46 64 66' fill='none' stroke='%230b1f12' stroke-width='3.4' stroke-linecap='round'/><path d='M-4 6Q30 46 64 66' fill='none' stroke='%234e9a5c' stroke-width='1.9' stroke-linecap='round'/><path d='M-4 6Q30 46 64 66' fill='none' stroke='%23a7dcb0' stroke-width='.6' stroke-opacity='.7' transform='translate(0 -.5)'/><path d='M-4 86Q30 126 64 146' fill='none' stroke='%230b1f12' stroke-width='3.4' stroke-linecap='round'/><path d='M-4 86Q30 126 64 146' fill='none' stroke='%234e9a5c' stroke-width='1.9' stroke-linecap='round'/><path d='M-4 86Q30 126 64 146' fill='none' stroke='%23a7dcb0' stroke-width='.6' stroke-opacity='.7' transform='translate(0 -.5)'/><rect x='13.799999999999999' y='28.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M16.4 33.2C21.599999999999998 33.2 22 40.2 16.4 47.7C10.799999999999999 40.2 11.2 33.2 16.4 33.2Z' fill='%236b1d17'/><rect x='42.4' y='53.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M45 58.2C50.2 58.2 50.6 65.2 45 72.7C39.4 65.2 39.8 58.2 45 58.2Z' fill='%2317502a'/><rect x='13.799999999999999' y='108.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M16.4 113.2C21.599999999999998 113.2 22 120.2 16.4 127.7C10.799999999999999 120.2 11.2 113.2 16.4 113.2Z' fill='%231a3570'/><rect x='42.4' y='133.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M45 138.2C50.2 138.2 50.6 145.2 45 152.7C39.4 145.2 39.8 138.2 45 138.2Z' fill='%237a531a'/></svg>")}, ${ribbonY.backgroundImage}`,
  backgroundSize: '100% auto, 100% 100%, 100% 100%',
  backgroundRepeat: 'repeat-y, no-repeat, no-repeat',
}
export const ribbonAcross = {
  backgroundImage: `${tileOf("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 60' width='160' height='60'><path d='M6 -4Q46 30 66 64' fill='none' stroke='%230b1f12' stroke-width='3.4' stroke-linecap='round'/><path d='M6 -4Q46 30 66 64' fill='none' stroke='%234e9a5c' stroke-width='1.9' stroke-linecap='round'/><path d='M6 -4Q46 30 66 64' fill='none' stroke='%23a7dcb0' stroke-width='.6' stroke-opacity='.7' transform='translate(0 -.5)'/><path d='M86 -4Q126 30 146 64' fill='none' stroke='%230b1f12' stroke-width='3.4' stroke-linecap='round'/><path d='M86 -4Q126 30 146 64' fill='none' stroke='%234e9a5c' stroke-width='1.9' stroke-linecap='round'/><path d='M86 -4Q126 30 146 64' fill='none' stroke='%23a7dcb0' stroke-width='.6' stroke-opacity='.7' transform='translate(0 -.5)'/><rect x='22.2' y='13' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M24.8 18C30 18 30.4 25 24.8 32.5C19.200000000000003 25 19.6 18 24.8 18Z' fill='%236b1d17'/><rect x='38.4' y='30' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M41 35C46.2 35 46.6 42 41 49.5C35.4 42 35.8 35 41 35Z' fill='%2317502a'/><rect x='102.2' y='13' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M104.8 18C110 18 110.39999999999999 25 104.8 32.5C99.2 25 99.6 18 104.8 18Z' fill='%231a3570'/><rect x='118.4' y='30' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M121 35C126.2 35 126.6 42 121 49.5C115.4 42 115.8 35 121 35Z' fill='%237a531a'/></svg>")}, ${ribbonX.backgroundImage}`,
  backgroundSize: 'auto 100%, 100% 100%',
  backgroundRepeat: 'repeat-x, no-repeat',
}
export const lightsDown = [
  { ...DOWN, backgroundImage: tileOf("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 160' width='60' height='160'><defs><radialGradient id='r'><stop offset='0' stop-color='%23e23b2e' stop-opacity='.6'/><stop offset='1' stop-color='%23e23b2e' stop-opacity='0'/></radialGradient><radialGradient id='b'><stop offset='0' stop-color='%232f6fe0' stop-opacity='.6'/><stop offset='1' stop-color='%232f6fe0' stop-opacity='0'/></radialGradient></defs><circle cx='16.4' cy='41.2' r='13' fill='url(%23r)'/><rect x='13.799999999999999' y='28.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M16.4 33.2C21.599999999999998 33.2 22 40.2 16.4 47.7C10.799999999999999 40.2 11.2 33.2 16.4 33.2Z' fill='%23e23b2e'/><ellipse cx='14.799999999999999' cy='37.7' rx='1.3' ry='3' fill='white' fill-opacity='.6'/><circle cx='16.4' cy='121.2' r='13' fill='url(%23b)'/><rect x='13.799999999999999' y='108.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M16.4 113.2C21.599999999999998 113.2 22 120.2 16.4 127.7C10.799999999999999 120.2 11.2 113.2 16.4 113.2Z' fill='%232f6fe0'/><ellipse cx='14.799999999999999' cy='117.7' rx='1.3' ry='3' fill='white' fill-opacity='.6'/></svg>") },
  { ...DOWN, backgroundImage: tileOf("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 160' width='60' height='160'><defs><radialGradient id='g'><stop offset='0' stop-color='%232fa84f' stop-opacity='.6'/><stop offset='1' stop-color='%232fa84f' stop-opacity='0'/></radialGradient><radialGradient id='a'><stop offset='0' stop-color='%23f5a623' stop-opacity='.6'/><stop offset='1' stop-color='%23f5a623' stop-opacity='0'/></radialGradient></defs><circle cx='45' cy='66.2' r='13' fill='url(%23g)'/><rect x='42.4' y='53.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M45 58.2C50.2 58.2 50.6 65.2 45 72.7C39.4 65.2 39.8 58.2 45 58.2Z' fill='%232fa84f'/><ellipse cx='43.4' cy='62.7' rx='1.3' ry='3' fill='white' fill-opacity='.6'/><circle cx='45' cy='146.2' r='13' fill='url(%23a)'/><rect x='42.4' y='133.2' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M45 138.2C50.2 138.2 50.6 145.2 45 152.7C39.4 145.2 39.8 138.2 45 138.2Z' fill='%23f5a623'/><ellipse cx='43.4' cy='142.7' rx='1.3' ry='3' fill='white' fill-opacity='.6'/></svg>") },
]
export const lightsAcross = [
  { ...ACROSS, backgroundImage: tileOf("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 60' width='160' height='60'><defs><radialGradient id='r'><stop offset='0' stop-color='%23e23b2e' stop-opacity='.6'/><stop offset='1' stop-color='%23e23b2e' stop-opacity='0'/></radialGradient><radialGradient id='b'><stop offset='0' stop-color='%232f6fe0' stop-opacity='.6'/><stop offset='1' stop-color='%232f6fe0' stop-opacity='0'/></radialGradient></defs><circle cx='24.8' cy='26' r='13' fill='url(%23r)'/><rect x='22.2' y='13' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M24.8 18C30 18 30.4 25 24.8 32.5C19.200000000000003 25 19.6 18 24.8 18Z' fill='%23e23b2e'/><ellipse cx='23.2' cy='22.5' rx='1.3' ry='3' fill='white' fill-opacity='.6'/><circle cx='104.8' cy='26' r='13' fill='url(%23b)'/><rect x='102.2' y='13' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M104.8 18C110 18 110.39999999999999 25 104.8 32.5C99.2 25 99.6 18 104.8 18Z' fill='%232f6fe0'/><ellipse cx='103.2' cy='22.5' rx='1.3' ry='3' fill='white' fill-opacity='.6'/></svg>") },
  { ...ACROSS, backgroundImage: tileOf("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 60' width='160' height='60'><defs><radialGradient id='g'><stop offset='0' stop-color='%232fa84f' stop-opacity='.6'/><stop offset='1' stop-color='%232fa84f' stop-opacity='0'/></radialGradient><radialGradient id='a'><stop offset='0' stop-color='%23f5a623' stop-opacity='.6'/><stop offset='1' stop-color='%23f5a623' stop-opacity='0'/></radialGradient></defs><circle cx='41' cy='43' r='13' fill='url(%23g)'/><rect x='38.4' y='30' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M41 35C46.2 35 46.6 42 41 49.5C35.4 42 35.8 35 41 35Z' fill='%232fa84f'/><ellipse cx='39.4' cy='39.5' rx='1.3' ry='3' fill='white' fill-opacity='.6'/><circle cx='121' cy='43' r='13' fill='url(%23a)'/><rect x='118.4' y='30' width='5.2' height='5.5' rx='1' fill='%231f4a2c'/><path d='M121 35C126.2 35 126.6 42 121 49.5C115.4 42 115.8 35 121 35Z' fill='%23f5a623'/><ellipse cx='119.4' cy='39.5' rx='1.3' ry='3' fill='white' fill-opacity='.6'/></svg>") },
]

// A gold satin edge for the green-papered "Wrapped by us" box, where the evergreen one sinks into
// the paper (owner 2026-10-15: "make the ouutlined red green bar all gold").
export const goldX = { backgroundImage: 'linear-gradient(to bottom, #8a6420, #c9a043 25%, #f6e3a1 50%, #c9a043 75%, #8a6420)' }

// A plain cream satin edge for the questions box (owner 2026-10-15: "the red outline in the top bar
// ... make it go away. make that small green strip cream coplored").
export const creamX = { backgroundImage: 'linear-gradient(to bottom, #e6dcc0, #fbf7e9 50%, #e6dcc0)' }

// The home page's gift-wrapping card keeps a red satin edge: the evergreen ribbon would sink into
// the night-blue home page.
const SATIN = '#6d1016, #9b1c22 28%, #c63a3c 50%, #9b1c22 72%, #6d1016'
export const redRibbonY = { backgroundImage: `linear-gradient(to right, ${SATIN})` }
