import { useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Backdrop, SceneFade, TextZone } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// The ask: one big line over the stone house, the estimate line under it, the October offer
// (while enabled) as a small gold line.
export function Pitch({ data, dur }) {
  const frame = useCurrentFrame()
  const { fps, tall, square } = useFmt()
  const { colors, story, words, type, offer } = data
  const line = pop(frame, fps, 8)
  const sub = fadeIn(frame, 30, 10)
  const off = fadeIn(frame, 48, 10)
  return (
    <SceneFade dur={dur}>
      <Backdrop photo={data.photos.pitch} dur={dur} drift="in" brightness={0.55} colors={colors} look={data.look} snow={data} />
      <TextZone>
        <div style={{ ...display(type, tall ? 100 : square ? 84 : 112), color: colors.gold, maxWidth: tall ? 900 : 1300, transform: `translateY(${(1 - line) * 70}px)`, opacity: fadeIn(frame, 8, 8), textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>{story.pitchLine}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: tall ? 44 : square ? 38 : 46, color: colors.white, marginTop: 24, maxWidth: tall ? 900 : 1100, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`, textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>{story.pitchSub}</div>
        {offer?.enabled && (
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: tall ? 36 : square ? 30 : 34, color: colors.gold, marginTop: 28, padding: '12px 28px', border: `2px solid rgba(255,207,77,0.55)`, borderRadius: 999, opacity: off, transform: `translateY(${(1 - off) * 20}px)` }}>{words.offerLine}</div>
        )}
      </TextZone>
    </SceneFade>
  )
}
