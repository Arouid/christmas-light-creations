import { Img, staticFile } from 'remotion'
import { offName } from './gemini.js'

// The cottage, dark or lit. on: 0 (dark) to 1 (lit, glowing). Two sources:
// - image: the photoreal render (assets-source/Gemini/, copied to public/gemini/), feathered into
//   the scene. Under it sits its "lights off" copy (prepare-assets darkens only the neon, door,
//   window and chimney), so the flicker pops the lights on while the cottage stays put.
// - otherwise the vector logo (one-colour white silhouette under the colour version).
// Used by the 5-second ad, the end card, the banner and the profile picture.
export function Cottage({ x, y, height, on = 1, dark = 0.22, glow = 1, style, image, aspect = 1, feather = true }) {
  if (image) {
    const width = height * aspect
    const mask = feather ? 'radial-gradient(ellipse at 50% 58%, black 40%, transparent 64%)' : 'none'
    return (
      <div style={{ position: 'absolute', left: x, top: y, width, height, ...style }}>
        <Img src={staticFile(`gemini/${offName(image)}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', WebkitMaskImage: mask, maskImage: mask }} />
        <Img src={staticFile(`gemini/${image}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', WebkitMaskImage: mask, maskImage: mask, opacity: on }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 62%, rgba(240,56,238,0.35) 0%, rgba(255,207,77,0.12) 35%, transparent 60%)', mixBlendMode: 'screen', opacity: glow * on * 0.9 }} />
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
