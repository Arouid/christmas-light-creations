import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Graded, SceneFade, Snow } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// The ask on its own: the whole screen says "Surprise someone this year." over the snow footage,
// then the line slides up and fades as the closing card (the cottage, "We can keep a secret.")
// comes in (owner 2026-10-13: "first have the whole screen just say Surprise Someone This Year,
// fade, slide, whatever out, and then bring in the final CTA").
export function AskCard({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, fps, tall, square } = useFmt()
  const { colors, story, type } = data
  const s = pop(frame, fps, 4, { damping: 14 })
  const outFrom = dur - 14
  const out = interpolate(frame, [outFrom, dur - 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t })
  const size = tall ? 108 : square ? 92 : 124
  return (
    <SceneFade dur={dur} fadeOutFrames={6}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0b1838 0%, ${colors.navy} 65%)` }}>
        {data.clips?.plan ? (
          <AbsoluteFill style={{ opacity: 0.7 }}><Graded look={data.look}><Clip file={data.clips.plan} start={(data.clipStart?.plan || 0) + 3} brightness={0.7} /></Graded><div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, transparent 35%, ${colors.navy} 100%)` }} /></AbsoluteFill>
        ) : (
          <Snow count={80} opacity={0.6} />
        )}
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: tall ? '0 90px' : square ? '0 80px' : '0 200px' }}>
          <div style={{ ...display(type, size), color: colors.gold, textAlign: 'center', maxWidth: w, transform: `translateY(${(1 - s) * 70 - out * 90}px)`, opacity: fadeIn(frame, 4, 8) * (1 - out), textShadow: '0 6px 40px rgba(0,0,0,0.7)' }}>
            {story.pitchLine}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </SceneFade>
  )
}
