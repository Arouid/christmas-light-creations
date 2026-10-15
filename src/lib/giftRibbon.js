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

// Running across (its edges top and bottom) and running down (left and right).
export const ribbonX = { backgroundImage: `linear-gradient(to bottom, ${BAND})` }
export const ribbonY = { backgroundImage: `linear-gradient(to right, ${BAND})` }
