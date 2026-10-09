// What a design adds up to: feet of lights, bulbs per color, a ballpark price.
import { length } from './geometry.js'
import { COLORS, pxPerFoot } from './model.js'

// Color of the i-th bulb: colors repeat in groups (groupSize 2 = 2 red, 2 white…).
export function bulbColor(strand, i) {
  const colors = strand.colors?.length ? strand.colors : ['warm']
  const g = Math.max(1, strand.groupSize || 1)
  return colors[Math.floor(i / g) % colors.length]
}

export function strandFeet(strand, design) {
  return length(strand.points) / pxPerFoot(design)
}

export function designStats(design) {
  const perStrand = design.strands.map((s) => {
    const feet = strandFeet(s, design)
    // Closed shapes end where they start: no extra bulb at the end.
    const bulbs = s.points.length > 1 ? Math.floor((feet * 12) / (s.spacingIn || 12)) + (s.shape ? 0 : 1) : 0
    return { id: s.id, feet, bulbs }
  })
  const feet = perStrand.reduce((t, s) => t + s.feet, 0)
  const byColor = {}
  design.strands.forEach((s, k) => {
    for (let i = 0; i < perStrand[k].bulbs; i++) {
      const c = bulbColor(s, i)
      byColor[c] = (byColor[c] ?? 0) + 1
    }
  })
  const price = design.pricePerFoot ? Math.round(feet * design.pricePerFoot) : null
  return {
    perStrand,
    feet,
    bulbs: perStrand.reduce((t, s) => t + s.bulbs, 0),
    byColor: Object.entries(byColor).map(([key, n]) => ({ key, label: COLORS[key]?.label ?? key, n })),
    measured: Boolean(design.scale?.pxPerFt),
    price,
  }
}

// Set the scale from a line drawn over something of known length.
export function scaleFrom(a, b, feet) {
  const px = Math.hypot(b[0] - a[0], b[1] - a[1])
  return feet > 0 && px > 0 ? { pxPerFt: px / feet, ref: { a, b, feet } } : null
}
