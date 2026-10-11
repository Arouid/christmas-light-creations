import { useCurrentFrame, interpolate, random } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { Backdrop, SceneFade } from '../lib/Stage.jsx'
import { DISPLAY, BODY } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// Scene 7: a "10% OFF" stamp slams in and shakes; "Installs done by October 31" types in;
// a calendar page flips to OCT 31.
export function Offer({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words } = data
  const stamp = pop(frame, fps, 2, { damping: 9, stiffness: 160, mass: 0.7 })
  const scale = interpolate(stamp, [0, 1], [2.6, 1])
  const shake = frame > 8 && frame < 18 ? (random(`sh${frame}`) - 0.5) * 12 : 0
  const typed = Math.min(words.offerLine.length, Math.max(0, Math.floor((frame - 14) * 1.6)))
  const cal = pop(frame, fps, 26, { damping: 12 })
  const size = tall ? 520 : square ? 400 : 440
  const cx = tall ? w / 2 : square ? w / 2 : w * 0.3
  const cy = tall ? TALL_WINDOW / 2 - 40 : square ? 300 : h / 2 - 40
  const textTop = tall ? TALL_WINDOW - 60 : square ? cy + size / 2 + 50 : h / 2 - 150
  const textLeft = tall || square ? 0 : w * 0.55
  const calSize = tall ? 230 : square ? 170 : 200
  return (
    <SceneFade dur={dur}>
      <Backdrop photo={data.photos.offer} dur={dur} drift="in" brightness={0.25} colors={colors} />
      <div style={{ position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, height: size, transform: `scale(${scale}) rotate(${-8 + shake * 0.4}deg) translate(${shake}px, ${-shake}px)`, opacity: fadeIn(frame, 2, 3) }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `14px solid ${colors.gold}`, boxShadow: `0 0 60px rgba(255,207,77,0.45), inset 0 0 40px rgba(255,207,77,0.2)` }} />
        <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', border: `4px dashed ${colors.gold}`, opacity: 0.8 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.gold }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 0.38, lineHeight: 1 }}>{words.offerBig}</div>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: size * 0.16, letterSpacing: '0.25em', marginTop: 6 }}>{words.offerSmall}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: textLeft, top: textTop, width: tall || square ? w : w - textLeft - 80, padding: tall || square ? '0 60px' : 0, display: 'flex', flexDirection: tall || square ? 'column' : 'column', alignItems: tall || square ? 'center' : 'flex-start', textAlign: tall || square ? 'center' : 'left', gap: 30 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: tall ? 70 : square ? 64 : 84, color: colors.white, lineHeight: 1.1, minHeight: '1.1em', textShadow: '0 4px 30px rgba(0,0,0,0.7)' }}>
          {words.offerLine.slice(0, typed)}<span style={{ opacity: frame % 16 < 8 && typed < words.offerLine.length ? 1 : 0 }}>|</span>
        </div>
        <div style={{ width: calSize, height: calSize * 1.05, borderRadius: 22, overflow: 'hidden', background: colors.white, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', transform: `perspective(900px) rotateX(${(1 - cal) * -90}deg)`, transformOrigin: 'top', opacity: fadeIn(frame, 26, 4) }}>
          <div style={{ height: calSize * 0.3, background: colors.red, color: colors.white, fontFamily: BODY, fontWeight: 700, fontSize: calSize * 0.17, letterSpacing: '0.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{words.offerMonth}</div>
          <div style={{ height: calSize * 0.75, color: colors.navy, fontFamily: DISPLAY, fontWeight: 800, fontSize: calSize * 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{words.offerDay}</div>
        </div>
      </div>
    </SceneFade>
  )
}
