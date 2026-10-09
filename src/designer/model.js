import { shapePoints } from './geometry.js'

// Design data model for the light designer. A design is plain JSON, so it can
// be saved anywhere (Firestore here, a file or another app later).
//
// Coordinates are in the photo's own pixels (natural size), so a design keeps
// lining up with its photo at any screen size.

export const DESIGN_VERSION = 1

export const COLORS = {
  warm: { label: 'Warm white', hex: '#ffcf70' },
  cool: { label: 'Cool white', hex: '#e9f3ff' },
  red: { label: 'Red', hex: '#ff2b2b' },
  green: { label: 'Green', hex: '#1fd65f' },
  blue: { label: 'Blue', hex: '#2f7dff' },
  gold: { label: 'Gold', hex: '#ffb300' },
  orange: { label: 'Orange', hex: '#ff7a1a' },
  purple: { label: 'Purple', hex: '#a64dff' },
  pink: { label: 'Pink', hex: '#ff5fb4' },
  teal: { label: 'Teal', hex: '#19d3c5' },
}

// Ready-made color sets (any list of COLORS keys works).
export const COLOR_SETS = {
  'warm white': ['warm'],
  'cool white': ['cool'],
  multicolor: ['red', 'green', 'blue', 'gold', 'orange'],
  'red & white': ['red', 'cool'],
  'red & green': ['red', 'green'],
  'blue & white': ['blue', 'cool'],
  'red, white & blue': ['red', 'cool', 'blue'],
  purple: ['purple'],
  'orange & purple': ['orange', 'purple'],
}

// Bulb styles. spacingIn = default inches between bulbs (CLC hangs bulbs
// 12" apart and prices by the foot); size = bulb diameter in inches.
export const STYLES = {
  c9: { label: 'C9 bulbs', spacingIn: 12, size: 2.2 },
  c7: { label: 'C7 bulbs', spacingIn: 12, size: 1.7 },
  mini: { label: 'Mini lights', spacingIn: 4, size: 0.9 },
  icicle: { label: 'Icicles', spacingIn: 3, size: 0.8 },
  permanent: { label: 'Permanent track', spacingIn: 12, size: 1.4 },
}

export const DECORATIONS = {
  wreath: { label: 'Wreath', sizeFt: 3 },
  bow: { label: 'Bow', sizeFt: 1.5 },
  star: { label: 'Star', sizeFt: 2 },
  snowflake: { label: 'Snowflake', sizeFt: 2 },
}

let seq = 0
export const newId = (p = 'x') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

export function newDesign({ width, height, name = '', pricePerFoot = null } = {}) {
  return {
    version: DESIGN_VERSION,
    name,
    photo: { width, height },
    // Pixels per foot. Unset until someone measures a known length; until
    // then feet are estimated (assume the photo spans ~60 ft).
    scale: null,
    night: 0.75, // 0 = daytime photo, 1 = full night
    strands: [],
    decorations: [],
    pricePerFoot,
  }
}

export function newStrand(style = 'c9', colors = ['warm']) {
  const s = STYLES[style] ?? STYLES.c9
  return { id: newId('s'), style, colors, groupSize: 1, spacingIn: s.spacingIn, size: 1, points: [] }
}

export function newDecoration(type, x, y) {
  return { id: newId('d'), type, x, y, size: 1, rotation: 0 }
}

// Older/other saved designs -> current shape (missing fields filled in).
export function normalize(d) {
  const base = newDesign(d?.photo ?? {})
  return {
    ...base,
    ...d,
    version: DESIGN_VERSION,
    strands: (d?.strands ?? []).map((s) => ({
      ...newStrand(s.style, s.colors),
      ...s,
      // Shapes rebuild their outline from the box; lines keep their points.
      points: s.shape ? shapePoints(s.shape) : (s.points ?? []).filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1])),
    })),
    decorations: d?.decorations ?? [],
  }
}

export const pxPerFoot = (design) => design.scale?.pxPerFt || (design.photo?.width ? design.photo.width / 60 : 10)
