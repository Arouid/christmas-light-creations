import { useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Backdrop, SceneFade, TextZone } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 2: the hero house (or the owner's clip) with a slow push-in; the headline lands word by
// word, a gold rule draws itself, the sub-line slides in.
export function Headline({ data, dur }) {
  const frame = useCurrentFrame()
  const { fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const headWords = words.headline.split(' ')
  const size = tall ? 104 : square ? 88 : 112
  const subSize = tall ? 44 : square ? 38 : 46
  const subDelay = 10 + headWords.length * 4 + 6
  const ruleW = progress(frame, subDelay - 4, subDelay + 14)
  const sub = pop(frame, fps, subDelay)
  return (
    <SceneFade dur={dur}>
      <Backdrop photo={data.photos.hero} dur={dur} drift="in" brightness={0.78} colors={colors} />
      <TextZone>
        <div style={{ ...display(type, size), color: colors.gold, display: 'flex', flexWrap: 'wrap', columnGap: '0.26em', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
          {headWords.map((wd, i) => {
            const s = pop(frame, fps, 10 + i * 4)
            return (
              <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 90}px) rotate(${(1 - s) * -4}deg)`, opacity: fadeIn(frame, 10 + i * 4, 6) }}>{wd}</span>
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
