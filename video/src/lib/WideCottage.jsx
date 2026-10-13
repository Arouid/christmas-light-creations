import { Img, staticFile } from 'remotion'
import { offName } from './gemini.js'

// The 16:9 photoreal render filling a wide frame: cottage right of centre, a navy gradient over
// the left so words can sit on the sky. on: 0 (lights off) to 1 (lit): the lit render fades in over
// its lights-off copy, so only the neon, door, window and chimney change. scale: the push-in.
export function WideCottage({ image, on = 1, glow = 1, scale = 1, colors }) {
  return (
    <>
      <Img src={staticFile(`gemini/${offName(image)}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%', transform: `translateX(11%) scale(${1.18 * scale})` }} />
      <Img src={staticFile(`gemini/${image}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%', transform: `translateX(11%) scale(${1.18 * scale})`, opacity: on }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 74% 60%, rgba(240,56,238,0.3) 0%, rgba(255,207,77,0.1) 30%, transparent 55%)', mixBlendMode: 'screen', opacity: glow * on * 0.8 }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${colors.navy} 0%, rgba(5,11,26,0.82) 28%, rgba(5,11,26,0.35) 48%, transparent 62%)` }} />
    </>
  )
}
