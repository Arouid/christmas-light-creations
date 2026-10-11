import { Img, staticFile } from 'remotion'

// The cottage logo, dark or lit. on: 0 (dark silhouette) to 1 (full colour, neon glow).
// Used by the 5-second ad, the story's "timer set for dusk" beat, and the end card.
export function Cottage({ x, y, height, on = 1, dark = 0.22, glow = 1, style }) {
  const width = height * 0.886
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, ...style }}>
      <Img src={staticFile('logo/clc-cottage-one-color-white.svg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark * (1 - on) }} />
      <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: on, filter: `drop-shadow(0 0 ${28 * glow * on}px rgba(240,56,238,0.55)) drop-shadow(0 0 ${70 * glow * on}px rgba(255,207,77,0.35))` }} />
    </div>
  )
}
