import { Img, staticFile } from 'remotion'
import { cutName, cutOffName } from './gemini.js'

// The cottage, dark or lit. on: 0 (dark) to 1 (lit, glowing). Two sources:
// - image: the photoreal render's cut-out (prepare-assets keys the cottage and its snow mound off
//   the render's sky), lit over its "lights off" copy, so the flicker pops the lights on while the
//   cottage stays put, and the scene's own sky shows around it. A soft glow sits behind it.
// - otherwise the vector logo (one-colour white silhouette under the colour version).
// Used by the 5-second ad, the end card, the banner and the profile picture.
export function Cottage({ x, y, height, on = 1, dark = 0.22, glow = 1, style, image, aspect = 1, feather = true }) {
  if (image) {
    const width = height * aspect
    void feather
    return (
      <div style={{ position: 'absolute', left: x, top: y, width, height, ...style }}>
        <div style={{ position: 'absolute', inset: '12% 8% 4% 8%', borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 70%, rgba(240,56,238,0.28) 0%, rgba(255,207,77,0.1) 40%, transparent 70%)', filter: 'blur(30px)', opacity: glow * on * 0.9 }} />
        <Img src={staticFile(`gemini/${cutOffName(image)}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        <Img src={staticFile(`gemini/${cutName(image)}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: on }} />
      </div>
    )
  }
  const width = height * 0.886
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, ...style }}>
      <Img src={staticFile('logo/clc-cottage-one-color-white.svg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark * (1 - on) }} />
      <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: on, filter: `drop-shadow(0 0 ${28 * glow * on}px rgba(240,56,238,0.55)) drop-shadow(0 0 ${70 * glow * on}px rgba(255,207,77,0.35))` }} />
    </div>
  )
}
