import { useCurrentFrame } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { Backdrop, SceneFade } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { Icon } from '../lib/Icons.jsx'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 3: a gold ring draws itself around "30 min"; "Free estimate" stamps in; a ladder icon gets
// a red strike through it for "No ladder needed".
export function Estimate({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const R = tall ? 230 : square ? 190 : 210
  const C = 2 * Math.PI * R
  const ring = progress(frame, 4, 36)
  const ringPop = pop(frame, fps, 2)
  const title = pop(frame, fps, 26)
  const ladder = pop(frame, fps, 42)
  const strike = progress(frame, 54, 66)
  const ringSize = R * 2 + 60
  const stack = tall || square
  const ringX = stack ? (w - ringSize) / 2 : 150
  const ringY = tall ? TALL_WINDOW / 2 - ringSize / 2 + 40 : stack ? 150 : h / 2 - ringSize / 2
  const textX = stack ? 0 : ringX + ringSize + 110
  const textY = tall ? TALL_WINDOW - 100 : stack ? ringY + ringSize + 40 : h / 2 - 150
  const textW = stack ? w : w - textX - 80
  const big = tall ? 150 : square ? 120 : 140
  const iconSize = tall ? 96 : 84
  return (
    <SceneFade dur={dur}>
      <Backdrop photo={data.photos.estimate} dur={dur} drift="left" brightness={0.42} colors={colors} />
      <div style={{ position: 'absolute', left: ringX, top: ringY, width: ringSize, height: ringSize, transform: `scale(${0.6 + ringPop * 0.4})`, opacity: fadeIn(frame, 2, 6) }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={R} fill="rgba(5,11,26,0.55)" stroke="rgba(255,207,77,0.18)" strokeWidth="18" />
          <circle cx={ringSize / 2} cy={ringSize / 2} r={R} fill="none" stroke={colors.gold} strokeWidth="18" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} style={{ filter: `drop-shadow(0 0 14px ${colors.gold})` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.white }}>
          <div style={{ ...display(type, big, { lineHeight: 1 }), color: colors.gold }}>{words.estimateBig}</div>
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: big * 0.32, letterSpacing: '0.2em', marginTop: 8 }}>{words.estimateUnit.toUpperCase()}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: textX, top: textY, width: textW, display: 'flex', flexDirection: 'column', alignItems: stack ? 'center' : 'flex-start', textAlign: stack ? 'center' : 'left', padding: stack ? '0 60px' : 0 }}>
        <div style={{ ...display(type, tall ? 104 : square ? 84 : 112), color: colors.gold, transform: `scale(${0.7 + title * 0.3})`, opacity: fadeIn(frame, 26, 6), textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
          {words.estimateTitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 26, opacity: fadeIn(frame, 42, 6), transform: `translateY(${(1 - ladder) * 40}px)` }}>
          <div style={{ position: 'relative', color: colors.white, width: iconSize, height: iconSize }}>
            <Icon name="ladder" size={iconSize} />
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" style={{ position: 'absolute', inset: 0 }}>
              <line x1="3" y1="21" x2={3 + 18 * strike} y2={21 - 18 * strike} stroke={colors.red} strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: tall ? 50 : square ? 42 : 50, color: colors.white, textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>{words.estimateSub}</div>
        </div>
      </div>
    </SceneFade>
  )
}
