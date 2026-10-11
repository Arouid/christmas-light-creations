import { useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Backdrop, Sparkles, SceneFade, TextZone } from '../lib/Stage.jsx'
import { DISPLAY, BODY } from '../lib/fonts.js'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 2: kinetic type. Each word of the headline springs up in turn; the sub-line slides in
// under a gold rule that draws itself.
export function Headline({ data, dur }) {
  const frame = useCurrentFrame()
  const { fps, tall, square } = useFmt()
  const { colors, words } = data
  const headWords = words.headline.split(' ')
  const size = tall ? 108 : square ? 92 : 116
  const subSize = tall ? 44 : square ? 38 : 46
  const subDelay = 6 + headWords.length * 4 + 8
  const ruleW = progress(frame, subDelay - 4, subDelay + 14)
  const sub = pop(frame, fps, subDelay)
  return (
    <SceneFade dur={dur}>
      <Backdrop photo={data.photos.headline} dur={dur} drift="right" brightness={0.6} colors={colors}>
        <Sparkles count={40} seed="head" opacity={0.7} />
      </Backdrop>
      <TextZone>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.02, color: colors.gold, display: 'flex', flexWrap: 'wrap', columnGap: '0.28em', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
          {headWords.map((wd, i) => {
            const s = pop(frame, fps, 6 + i * 4)
            return (
              <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 90}px) rotate(${(1 - s) * -4}deg)`, opacity: fadeIn(frame, 6 + i * 4, 6) }}>{wd}</span>
            )
          })}
        </div>
        <div style={{ height: 6, width: `${ruleW * 100}%`, maxWidth: 520, background: colors.gold, margin: '26px 0 22px', borderRadius: 3, boxShadow: `0 0 18px ${colors.gold}` }} />
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: subSize, color: colors.white, transform: `translateX(${(1 - sub) * -60}px)`, opacity: fadeIn(frame, subDelay, 8), textShadow: '0 2px 16px rgba(0,0,0,0.7)', maxWidth: tall ? 900 : 1100 }}>
          {words.headlineSub}
        </div>
      </TextZone>
    </SceneFade>
  )
}
