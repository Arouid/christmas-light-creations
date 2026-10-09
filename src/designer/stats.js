// What a design adds up to: feet of lights, bulbs per color, a ballpark price.
import { gapFraction, inGap, length, sampleAlong } from './geometry.js'
import { COLORS, STYLES, pxPerFoot } from './model.js'

// Color of the i-th bulb: colors repeat in groups (groupSize 2 = 2 red, 2 white…).
export function bulbColor(strand, i) {
  const colors = strand.colors?.length ? strand.colors : ['warm']
  const g = Math.max(1, strand.groupSize || 1)
  return colors[Math.floor(i / g) % colors.length]
}

// Lit feet: erased sections don't count (no bulbs installed there).
export function strandFeet(strand, design) {
  return (length(strand.points) * (1 - gapFraction(strand.gaps))) / pxPerFoot(design)
}

// The bulbs actually drawn on a strand (same positions the renderer uses),
// each with its original index so color patterns don't shift around gaps.
export function strandBulbs(strand, design) {
  const ppf = pxPerFoot(design)
  const step = Math.max(2, ((strand.spacingIn || STYLES[strand.style]?.spacingIn || 12) / 12) * ppf)
  const L = length(strand.points) || 1
  return sampleAlong(strand.points, step, Boolean(strand.shape))
    .map((p, i) => ({ ...p, i }))
    .filter((p) => !inGap(strand.gaps, p.s / L))
}

export function designStats(design) {
  const byColor = {}
  const perStrand = design.strands.map((s) => {
    const lit = s.points.length > 1 ? strandBulbs(s, design) : []
    lit.forEach((b) => { const c = bulbColor(s, b.i); byColor[c] = (byColor[c] ?? 0) + 1 })
    return { id: s.id, feet: strandFeet(s, design), bulbs: lit.length }
  })
  const feet = perStrand.reduce((t, s) => t + s.feet, 0)
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
