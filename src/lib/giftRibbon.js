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

// A gold satin edge for the green-papered "Wrapped by us" box, where the evergreen one sinks into
// the paper (owner 2026-10-15: "make the ouutlined red green bar all gold").
export const goldX = { backgroundImage: 'linear-gradient(to bottom, #8a6420, #c9a043 25%, #f6e3a1 50%, #c9a043 75%, #8a6420)' }

// The home page's gift-wrapping card keeps a red satin edge: the evergreen ribbon would sink into
// the night-blue home page.
const SATIN = '#6d1016, #9b1c22 28%, #c63a3c 50%, #9b1c22 72%, #6d1016'
export const redRibbonY = { backgroundImage: `linear-gradient(to right, ${SATIN})` }
