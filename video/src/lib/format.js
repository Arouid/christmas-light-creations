import { useVideoConfig } from 'remotion'

// Which shape we're rendering. All three have a 1080 px short side, so sizes are in plain px.
export function useFmt() {
  const { width, height, fps } = useVideoConfig()
  return { w: width, h: height, fps, tall: height > width, square: width === height, wide: width > height }
}

// Height of the photo window in the tall (9:16) cut: a 4:5 picture at the top; text below it.
export const TALL_WINDOW = 1350

// Where an image drawn with object-fit: cover and a focus point actually lands inside a box.
export function coverRect(aspect, boxW, boxH, focus = [0.5, 0.5]) {
  const scale = Math.max(boxW / aspect, boxH) // drawn height
  const h = scale
  const w = scale * aspect
  const x = clamp(boxW / 2 - focus[0] * w, boxW - w, 0)
  const y = clamp(boxH / 2 - focus[1] * h, boxH - h, 0)
  return { x, y, w, h }
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Points every `step` px along a polyline, plus the total length (for stroke-dash drawing).
export function alongPolyline(points, step) {
  const out = []
  let total = 0
  const segs = []
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    const len = Math.hypot(x1 - x0, y1 - y0)
    segs.push({ x0, y0, x1, y1, len, start: total })
    total += len
  }
  for (let d = step / 2; d < total; d += step) {
    const s = segs.find((g) => d >= g.start && d <= g.start + g.len) || segs[segs.length - 1]
    const t = (d - s.start) / s.len
    out.push({ x: s.x0 + (s.x1 - s.x0) * t, y: s.y0 + (s.y1 - s.y0) * t, d })
  }
  return { points: out, total }
}
