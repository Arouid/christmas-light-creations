// Polyline geometry for strands: length, evenly spaced points along a line,
// nearest point/segment for selecting. Points are [x, y] arrays.

export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])

// The path bulbs follow: closed strands (rectangles drawn as 4 free corners)
// run from the last pin back to the first.
export const pathOf = (s) => (s.closed && s.points.length > 2 ? [...s.points, s.points[0]] : s.points)

export function length(points) {
  let L = 0
  for (let i = 1; i < points.length; i++) L += dist(points[i - 1], points[i])
  return L
}

// Points every `step` pixels along the line, starting at the first point.
// Each comes with its direction (unit vector) for drawing icicles etc. and
// its distance along the line (s).
export function sampleAlong(points, step, closed = false) {
  if (points.length < 2 || !(step > 0)) return points.length === 1 ? [{ x: points[0][0], y: points[0][1], dx: 1, dy: 0 }] : []
  const out = []
  let carry = 0 // distance into the current segment where the next bulb goes
  let before = 0 // path length before the current segment
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = dist(a, b)
    if (!seg) continue
    const dx = (b[0] - a[0]) / seg
    const dy = (b[1] - a[1]) / seg
    let t = carry
    while (t <= seg + 1e-9) {
      // s = distance along the whole line (used for erased sections)
      out.push({ x: a[0] + dx * t, y: a[1] + dy * t, dx, dy, s: before + t })
      t += step
    }
    carry = t - seg
    before += seg
  }
  // Closed outline: don't put a second bulb on top of the first.
  if (closed && out.length > 1 && dist([out[0].x, out[0].y], [out.at(-1).x, out.at(-1).y]) < step / 2) out.pop()
  return out
}

// Distance from point p to segment ab, and the closest point on it.
export function toSegment(p, a, b) {
  const vx = b[0] - a[0]
  const vy = b[1] - a[1]
  const L2 = vx * vx + vy * vy
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2)) : 0
  const q = [a[0] + vx * t, a[1] + vy * t]
  return { d: dist(p, q), q, t }
}

// Closest strand to p within `tol` pixels: { id, segment, pointIndex? }.
export function hitStrand(strands, p, tol) {
  let best = null
  for (const s of strands) {
    s.points.forEach((pt, i) => {
      const d = dist(p, pt)
      if (d <= tol && (!best || d < best.d)) best = { id: s.id, pointIndex: i, d }
    })
  }
  if (best) return best
  for (const s of strands) {
    const path = pathOf(s)
    for (let i = 1; i < path.length; i++) {
      const { d } = toSegment(p, path[i - 1], path[i])
      if (d <= tol && (!best || d < best.d)) best = { id: s.id, segment: i, d }
    }
  }
  return best
}

// Shapes (rectangles, ovals) are stored as a box and turned into a closed
// outline for drawing bulbs: { type: 'rect' | 'oval', x, y, w, h }.
export function shapePoints(shape) {
  const { x, y, w, h } = shape
  if (shape.type === 'rect') return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]
  const n = 72
  const cx = x + w / 2
  const cy = y + h / 2
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 // start at the top
    return [cx + (w / 2) * Math.cos(a), cy + (h / 2) * Math.sin(a)]
  })
}

// Box from two corner points; `lock` keeps it square (or a circle).
export function boxFrom(a, b, lock = false) {
  let w = b[0] - a[0]
  let h = b[1] - a[1]
  if (lock) {
    const s = Math.max(Math.abs(w), Math.abs(h))
    w = Math.sign(w || 1) * s
    h = Math.sign(h || 1) * s
  }
  return { x: Math.min(a[0], a[0] + w), y: Math.min(a[1], a[1] + h), w: Math.abs(w), h: Math.abs(h) }
}

// The 4 corners of a shape's box, for resize handles (clockwise from top-left).
export const boxCorners = ({ x, y, w, h }) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]

// Where a selected strand's "move all" handle sits: the middle of its pins,
// pushed `below` pixels down so it never covers a pin or the line.
export function strandCenter(points, below = 0) {
  const n = points.length || 1
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n + below]
}
export const MOVE_HANDLE_OFFSET = 34 // screen pixels below the middle of the pins

// For one strand: is p on a pin (index) or on the line between pins i-1 and i?
export function hitOnStrand(points, p, tol) {
  let best = null
  points.forEach((pt, i) => { const d = dist(p, pt); if (d <= tol && (!best || d < best.d)) best = { pointIndex: i, d } })
  if (best) return best
  for (let i = 1; i < points.length; i++) {
    const { d, q } = toSegment(p, points[i - 1], points[i])
    if (d <= tol && (!best || d < best.d)) best = { segment: i, at: q, d }
  }
  return best
}

// Erased sections ("gaps") are stored per strand as [from, to] fractions of
// the line's length, so they stay put when the line is moved or bent a little.
export const inGap = (gaps, frac) => (gaps ?? []).some(([a, b]) => frac >= a && frac <= b)

// Add a gap and merge overlapping ones.
export function addGap(gaps, a, b) {
  const all = [...(gaps ?? []), [Math.max(0, Math.min(a, b)), Math.min(1, Math.max(a, b))]].sort((x, y) => x[0] - y[0])
  const out = []
  for (const g of all) {
    const last = out.at(-1)
    if (last && g[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], g[1])
    else out.push([...g])
  }
  return out
}
export const gapFraction = (gaps) => (gaps ?? []).reduce((t, [a, b]) => t + (b - a), 0)
