import { useCurrentFrame } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { Backdrop, Sparkles, SceneFade } from '../lib/Stage.jsx'
import { DISPLAY, BODY } from '../lib/fonts.js'
import { Icon } from '../lib/Icons.jsx'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 5: Nov → Dec → Jan. Three cards light up one after another along a gold line.
export function Season({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words } = data
  const items = words.season
  const stack = tall
  const cardW = stack ? 760 : square ? 300 : 500
  const cardH = stack ? 170 : square ? 300 : 330
  const gap = stack ? 26 : square ? 30 : 60
  const totalW = stack ? cardW : items.length * cardW + (items.length - 1) * gap
  const totalH = stack ? items.length * cardH + (items.length - 1) * gap : cardH
  const x0 = (w - totalW) / 2
  const y0 = tall ? TALL_WINDOW - 120 : (h - totalH) / 2 + (square ? 40 : 60)
  const line = progress(frame, 6, 70)
  const stagger = 18
  return (
    <SceneFade dur={dur}>
      <Backdrop photo={data.photos.season} dur={dur} drift="left" brightness={0.45} colors={colors}>
        <Sparkles count={40} seed="season" opacity={0.6} />
      </Backdrop>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        {stack ? (
          <line x1={x0 + 70} y1={y0} x2={x0 + 70} y2={y0 + totalH * line} stroke={colors.gold} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${colors.gold})` }} />
        ) : (
          <line x1={x0} y1={y0 - 30} x2={x0 + totalW * line} y2={y0 - 30} stroke={colors.gold} strokeWidth="6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${colors.gold})` }} />
        )}
      </svg>
      {items.map((it, i) => {
        const delay = 10 + i * stagger
        const s = pop(frame, fps, delay)
        const lit = fadeIn(frame, delay + 6, 10)
        const x = stack ? x0 : x0 + i * (cardW + gap)
        const y = stack ? y0 + i * (cardH + gap) : y0
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: cardW, height: cardH, borderRadius: 28, background: `rgba(10,21,48,${0.75 + lit * 0.15})`, border: `3px solid ${lit > 0.5 ? colors.gold : '#1c2f63'}`, boxShadow: lit > 0.5 ? `0 0 ${30 * lit}px rgba(255,207,77,0.35)` : 'none', transform: `scale(${0.7 + s * 0.3}) translateY(${(1 - s) * 40}px)`, opacity: fadeIn(frame, delay, 6), display: 'flex', flexDirection: stack ? 'row' : 'column', alignItems: 'center', justifyContent: stack ? 'flex-start' : 'center', gap: stack ? 30 : 16, padding: stack ? '0 40px 0 120px' : 20, color: colors.white, textAlign: stack ? 'left' : 'center' }}>
            {stack && <div style={{ position: 'absolute', left: 56, top: cardH / 2 - 14, width: 28, height: 28, borderRadius: 14, background: lit > 0.5 ? colors.gold : '#1c2f63', boxShadow: lit > 0.5 ? `0 0 18px ${colors.gold}` : 'none' }} />}
            <div style={{ color: lit > 0.5 ? colors.gold : '#6b7a99' }}><Icon name={it.icon} size={stack ? 84 : square ? 84 : 100} /></div>
            <div>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: stack ? 30 : 28, letterSpacing: '0.2em', color: colors.gold, opacity: 0.9 }}>{it.month}</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: stack ? 54 : square ? 40 : 52, lineHeight: 1.05, marginTop: 6 }}>{it.title}</div>
            </div>
          </div>
        )
      })}
    </SceneFade>
  )
}
