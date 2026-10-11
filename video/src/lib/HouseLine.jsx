import { useCurrentFrame, interpolate } from 'remotion'
import { useFmt, alongPolyline } from './format.js'

// An illustrated street at night: house silhouettes with a C9 light string that comes on bulb by
// bulb along each roofline, with a soft glow. A graphic stand-in where a photo would be weak.
// Rooflines are in a 1000 × 400 box (x right, y down) and are scaled to the frame width.
const HOUSES = [
  // left house: gable + garage
  [[0, 300], [60, 300], [60, 220], [150, 120], [240, 220], [240, 300]],
  [[240, 300], [250, 300], [250, 230], [340, 230], [340, 300]],
  // middle house: two gables
  [[360, 300], [380, 300], [380, 200], [470, 90], [560, 200], [560, 300]],
  [[560, 300], [575, 300], [575, 180], [650, 110], [725, 180], [725, 300]],
  // right house: long low roof
  [[745, 300], [760, 300], [760, 215], [880, 150], [1000, 215], [1000, 300]],
]

export function HouseLine({ from = 0, speed = 1, opacity = 1, y: yPos, height, bulbEvery = 22, color = '#fff2c6' }) {
  const frame = useCurrentFrame()
  const { w, h, tall } = useFmt()
  const H = height ?? (tall ? 520 : 400)
  const s = w / 1000
  const top = yPos ?? h - H
  const sy = H / 400
  const t = Math.max(0, (frame - from) * speed)
  const items = []
  let order = 0
  HOUSES.forEach((pl, hi) => {
    const pts = pl.map(([x, y]) => [x * s, y * sy])
    const { points, total } = alongPolyline(pts, bulbEvery * s)
    items.push(<polyline key={`wall${hi}`} points={pts.map((p) => p.join(',')).join(' ')} fill="rgba(14,26,58,0.98)" stroke="rgba(140,160,210,0.45)" strokeWidth="2.5" />)
    points.forEach((p, i) => {
      const k = order++
      const age = t - k * 1.6 // frames since this bulb came on
      if (age < 0) return
      const on = Math.min(1, age / 4)
      const tw = 0.85 + 0.15 * Math.sin((frame + k * 13) / 7)
      items.push(
        <g key={`b${hi}-${i}`} transform={`translate(${p.x} ${p.y})`} opacity={on * tw}>
          <circle r={7 * s} fill={color} opacity="0.35" filter="url(#hlGlow)" />
          <circle r={3 * s} fill={color} />
        </g>,
      )
    })
    void total
  })
  const ground = interpolate(t, [0, 60], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} style={{ position: 'absolute', left: 0, top, opacity, pointerEvents: 'none' }}>
      <defs>
        <filter id="hlGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation={4 * s} /></filter>
        <linearGradient id="hlGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(255,224,138,0.18)" /><stop offset="1" stopColor="rgba(255,224,138,0)" /></linearGradient>
      </defs>
      <rect x="0" y={300 * sy} width={w} height={H - 300 * sy} fill="rgba(8,16,38,1)" />
      <rect x="0" y={300 * sy} width={w} height={60 * sy} fill="url(#hlGround)" opacity={ground} />
      {items}
    </svg>
  )
}
