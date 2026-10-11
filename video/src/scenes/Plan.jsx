import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { SceneFade, Snow } from '../lib/Stage.jsx'
import { Cottage } from '../lib/Cottage.jsx'
import { flickerOn } from '../lib/flicker.js'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// The plan, in three beats: a time and a line each, one after another. The cottage stands dark
// beside them and switches on with the last beat ("timer set for dusk").
export function Plan({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, story, type } = data
  const beats = story.plan
  const step = Math.floor((dur - 30) / beats.length)
  const lastAt = 12 + (beats.length - 1) * step
  const ON = lastAt + 14
  const on = flickerOn(frame - ON)
  const glow = 0.85 + Math.sin(frame / 8) * 0.15
  const flash = interpolate(frame, [ON, ON + 6, ON + 26], [0, 0.25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const logoH = tall ? 520 : square ? 380 : 520
  const logoW = logoH * 0.886
  const logo = tall ? { x: (w - logoW) / 2, y: 300 } : square ? { x: w - logoW - 60, y: 70 } : { x: w - logoW - 150, y: (h - logoH) / 2 }
  const text = tall ? { x: 80, y: 300 + logoH + 110, w: w - 160 } : square ? { x: 72, y: 480, w: w - 144 } : { x: 150, y: h / 2 - 190, w: w - logoW - 420 }
  const timeSize = tall ? 34 : square ? 28 : 32
  const lineSize = tall ? 84 : square ? 62 : 76
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0b1838 0%, ${colors.navy} 65%)` }}>
        <Snow count={80} opacity={0.6} />
        <Cottage x={logo.x} y={logo.y} height={logoH} on={on} dark={0.22} glow={glow} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at ${((logo.x + logoW / 2) / w) * 100}% ${((logo.y + logoH / 2) / h) * 100}%, rgba(255,224,138,${flash}) 0%, transparent 50%)` }} />
        <div style={{ position: 'absolute', left: text.x, top: text.y, width: text.w, display: 'flex', flexDirection: 'column', gap: tall ? 34 : square ? 24 : 30 }}>
          {beats.map((b, i) => {
            const at = 12 + i * step
            const s = pop(frame, fps, at)
            const isLast = i === beats.length - 1
            const nextAt = at + step
            const dim = isLast ? 1 : interpolate(frame, [nextAt, nextAt + 10], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <div key={i} style={{ opacity: fadeIn(frame, at, 6) * dim, transform: `translateX(${(1 - s) * -40}px)` }}>
                <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: timeSize, color: colors.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{b.time}</div>
                <div style={{ ...display(type, lineSize), color: colors.white }}>{b.line}</div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
