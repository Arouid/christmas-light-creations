// Designs homeowners send from /design/ (leadDesigns, docs/specs/public-designer.md):
// the server rebuilds the design from known fields only (anything else is
// dropped; nonsense makes it refused) and decides when an upload is old enough
// to delete. Pure, so tests can run it. The pictures themselves are re-encoded
// in index.js (sharp). Field lists match src/designer/model.js (tested).

export const KEEP_DAYS = 30
export const MAX_SIDE = 1280
export const STYLE_KEYS = ['c9', 'c7', 'mini', 'icicle', 'permanent']
export const COLOR_KEYS = ['warm', 'cool', 'red', 'green', 'blue', 'gold', 'orange', 'purple', 'pink', 'teal']
export const DECORATION_KEYS = ['wreath', 'bow', 'star', 'snowflake']
const LIMITS = { strands: 150, points: 300, gaps: 100, decorations: 60, colors: 10 }

const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null)
// Text without control characters or angle brackets.
const str = (v, max) => (typeof v === 'string' ? [...v].filter((c) => c >= ' ' && c !== '<' && c !== '>').join('').slice(0, max) : '')

// Designer JSON (string) -> cleaned JSON string, or null if it isn't a design.
export function cleanDesign(json) {
  let d
  try { d = JSON.parse(json) } catch { return null }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  const width = num(d.photo?.width, 100, MAX_SIDE)
  const height = num(d.photo?.height, 100, MAX_SIDE)
  if (!width || !height) return null
  const inX = (x) => num(x, -width, 2 * width)
  const inY = (y) => num(y, -height, 2 * height)
  const point = (p) => (Array.isArray(p) && inX(p[0]) != null && inY(p[1]) != null ? [p[0], p[1]] : null)

  const strands = []
  for (const s of Array.isArray(d.strands) ? d.strands.slice(0, LIMITS.strands) : []) {
    if (!s || typeof s !== 'object' || !STYLE_KEYS.includes(s.style)) continue
    const points = (Array.isArray(s.points) ? s.points.slice(0, LIMITS.points) : []).map(point)
    if (points.length < 2 || points.some((p) => !p)) continue
    const colors = (Array.isArray(s.colors) ? s.colors : []).filter((c) => COLOR_KEYS.includes(c)).slice(0, LIMITS.colors)
    const out = {
      id: str(s.id, 40) || `s${strands.length}`, style: s.style, colors: colors.length ? colors : ['warm'],
      groupSize: num(s.groupSize, 1, 4) ?? 1, spacingIn: num(s.spacingIn, 2, 48) ?? 12, size: num(s.size, 0.3, 3) ?? 1, points,
    }
    if (s.closed === true) out.closed = true
    const sh = s.shape
    if (sh && sh.type === 'oval' && inX(sh.x) != null && inY(sh.y) != null && num(sh.w, 1, 2 * width) && num(sh.h, 1, 2 * height)) {
      out.shape = { type: 'oval', x: sh.x, y: sh.y, w: sh.w, h: sh.h, ...(sh.lock === true ? { lock: true } : {}) }
    }
    const gaps = (Array.isArray(s.gaps) ? s.gaps.slice(0, LIMITS.gaps) : []).filter((g) => Array.isArray(g) && num(g[0], 0, 1) != null && num(g[1], 0, 1) != null).map((g) => [g[0], g[1]])
    if (gaps.length) out.gaps = gaps
    strands.push(out)
  }

  const decorations = []
  for (const x of Array.isArray(d.decorations) ? d.decorations.slice(0, LIMITS.decorations) : []) {
    if (!x || !DECORATION_KEYS.includes(x.type) || inX(x.x) == null || inY(x.y) == null) continue
    decorations.push({ id: str(x.id, 40) || `d${decorations.length}`, type: x.type, x: x.x, y: x.y, size: num(x.size, 0.2, 4) ?? 1, rotation: num(x.rotation, -180, 180) ?? 0 })
  }

  // Homeowners can't measure or price: scale and price are always empty.
  return JSON.stringify({
    version: 1, name: str(d.name, 80), photo: { width, height }, scale: null, night: num(d.night, 0, 1) ?? 0.75,
    strands, decorations, pricePerFoot: null,
  })
}

// "data:image/jpeg;base64,…" -> bytes, or null.
export function jpegBytes(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ''))
  return m ? Buffer.from(m[1], 'base64') : null
}

// Uploads are deleted KEEP_DAYS after they arrive (owner, 2026-10-10).
export const expired = (createdMs, now = Date.now(), days = KEEP_DAYS) => Number.isFinite(createdMs) && now - createdMs >= days * 24 * 60 * 60 * 1000
export const cutoff = (now = Date.now(), days = KEEP_DAYS) => new Date(now - days * 24 * 60 * 60 * 1000)
