import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Graded, SceneFade, Snow } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'
import { planTiming } from '../timeline.js'

// The plan: three time-stamped beats, one after another, over the snow footage. A clock beside
// them sweeps its hands to each beat's time and glows on the last one ("timer set for dusk").
const parseTime = (t) => {
  const m = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(t)
  if (!m) return null
  let h = Number(m[1]) % 12
  if (m[3] && m[3].toLowerCase() === 'pm') h += 12
  return { h, m: Number(m[2]) }
}
const angles = ({ h, m }) => ({ hour: ((h % 12) + m / 60) * 30, minute: m * 6 })
const forward = (a, b) => (b - a + 360) % 360

function Clock({ cx, cy, r, hour, minute, glow, colors, opacity }) {
  const hand = (deg, len, wdt, color) => {
    const a = ((deg - 90) * Math.PI) / 180
    return <line x1={cx} y1={cy} x2={cx + Math.cos(a) * len} y2={cy + Math.sin(a) * len} stroke={color} strokeWidth={wdt} strokeLinecap="round" />
  }
  const marks = []
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180
    const big = i % 3 === 0
    marks.push(<circle key={i} cx={cx + Math.sin(a) * (r - 26)} cy={cy - Math.cos(a) * (r - 26)} r={big ? 5 : 3} fill={big ? colors.gold : 'rgba(255,255,255,0.6)'} />)
  }
  return (
    <g opacity={opacity} style={{ filter: `drop-shadow(0 0 ${22 * glow}px rgba(255,207,77,${0.55 * glow}))` }}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(5,11,26,0.35)" stroke={colors.gold} strokeWidth="5" opacity={0.6 + glow * 0.4} />
      {marks}
      {hand(hour, r * 0.52, 9, colors.white)}
      {hand(minute, r * 0.78, 6, colors.white)}
      <circle cx={cx} cy={cy} r="9" fill={colors.gold} />
    </g>
  )
}

export function Plan({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, story, type } = data
  const beats = story.plan
  const { step, beats: at } = planTiming(dur, beats.length)
  const timeSize = tall ? 34 : square ? 28 : 32
  const lineSize = tall ? 84 : square ? 62 : 76
  const r = tall ? 230 : square ? 170 : 230
  const clock = tall ? { cx: w / 2, cy: 330 + r } : square ? { cx: w - 72 - r, cy: 90 + r } : { cx: w - 170 - r, cy: h / 2 }
  const text = tall ? { x: 80, y: 330 + r * 2 + 120, w: w - 160 } : square ? { x: 72, y: 500, w: w - 144 } : { x: 150, y: h / 2 - 190, w: w - r * 2 - 500 }
  // Clock hands: sweep forward from the previous beat's time to this beat's, with a spring.
  const times = beats.map((b) => parseTime(b.time)).map((t) => (t ? angles(t) : { hour: 0, minute: 0 }))
  let hour = times[0].hour
  let minute = times[0].minute
  for (let i = 1; i < beats.length; i++) {
    const s = pop(frame, fps, at[i] - 4, { damping: 13, stiffness: 70 })
    hour += forward(times[i - 1].hour, times[i].hour) * s
    minute += forward(times[i - 1].minute, times[i].minute) * s
  }
  const lastAt = at[beats.length - 1]
  const glow = interpolate(frame, [lastAt + 6, lastAt + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (0.85 + Math.sin(frame / 8) * 0.15)
  const clockIn = pop(frame, fps, 2, { damping: 14 })
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0b1838 0%, ${colors.navy} 65%)` }}>
        {data.clips?.plan ? (
          <AbsoluteFill style={{ opacity: 0.7 }}><Graded look={data.look}><Clip file={data.clips.plan} start={data.clipStart?.plan || 0} brightness={0.7} /></Graded><div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, transparent 35%, ${colors.navy} 100%)` }} /></AbsoluteFill>
        ) : (
          <Snow count={80} opacity={0.6} />
        )}
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <g transform={`translate(${clock.cx} ${clock.cy}) scale(${0.7 + clockIn * 0.3}) translate(${-clock.cx} ${-clock.cy})`}>
            <Clock cx={clock.cx} cy={clock.cy} r={r} hour={hour} minute={minute} glow={glow} colors={colors} opacity={fadeIn(frame, 2, 8)} />
          </g>
        </svg>
        <div style={{ position: 'absolute', left: text.x, top: text.y, width: text.w, display: 'flex', flexDirection: 'column', gap: tall ? 34 : square ? 24 : 30 }}>
          {beats.map((b, i) => {
            const s = pop(frame, fps, at[i])
            const isLast = i === beats.length - 1
            const nextAt = at[i] + step
            const dim = isLast ? 1 : interpolate(frame, [nextAt, nextAt + 10], [1, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <div key={i} style={{ opacity: fadeIn(frame, at[i], 6) * dim, transform: `translateX(${(1 - s) * -40}px)` }}>
                <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: timeSize, color: colors.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{b.time}</div>
                <div style={{ ...display(type, lineSize), color: colors.white, textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>{b.line}</div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
