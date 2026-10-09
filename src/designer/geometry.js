// Polyline geometry for strands: length, evenly spaced points along a line,
// nearest point/segment for selecting. Points are [x, y] arrays.

export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])

export function length(points) {
  let L = 0
  for (let i = 1; i < points.length; i++) L += dist(points[i - 1], points[i])
  return L
}

// Points every `step` pixels along the line, starting at the first point.
// Each comes with its direction (unit vector) for drawing icicles etc.
export function sampleAlong(points, step) {
  if (points.length < 2 || !(step > 0)) return points.length === 1 ? [{ x: points[0][0], y: points[0][1], dx: 1, dy: 0 }] : []
  const out = []
  let carry = 0 // distance into the current segment where the next bulb goes
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = dist(a, b)
    if (!seg) continue
    const dx = (b[0] - a[0]) / seg
    const dy = (b[1] - a[1]) / seg
    let t = carry
    while (t <= seg + 1e-9) {
      out.push({ x: a[0] + dx * t, y: a[1] + dy * t, dx, dy })
      t += step
    }
    carry = t - seg
  }
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
    for (let i = 1; i < s.points.length; i++) {
      const { d } = toSegment(p, s.points[i - 1], s.points[i])
      if (d <= tol && (!best || d < best.d)) best = { id: s.id, segment: i, d }
    }
  }
  return best
}
