import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { display } from '../lib/fonts.js'
import { fadeIn } from '../lib/motion.js'
import { homeTiming } from '../timeline.js'

// A line that spans two scenes (owner 2026-10-13, the Halloween cut: "Get outta the way, Halloween."
// fades in, in gold, over the vampire and stays through the cut and over the house). It lives above
// the scenes so the dissolve never touches it. story.spanLine, story.spanAt (seconds into the
// video), story.spanSub (joins under it when the house's words would land), until the house scene ends.
function Words({ data, frames, subAt }) {
  const frame = useCurrentFrame()
  const { tall, square } = useFmt()
  const { colors, story, type } = data
  const on = fadeIn(frame, 0, 12) * (1 - fadeIn(frame, frames - 8, 8))
  const sub = fadeIn(frame, subAt, 10)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: tall ? 70 : square ? 72 : 96, right: 72, top: tall ? TALL_WINDOW - 60 : 'auto', bottom: tall ? 'auto' : square ? 72 : 90, display: 'flex', flexDirection: 'column', gap: tall ? 18 : square ? 12 : 16, opacity: on }}>
        <div style={{ ...display(type, tall ? 78 : square ? 60 : 84, { lineHeight: 1.05 }), color: colors.goldSoft, textShadow: '0 6px 40px rgba(0,0,0,0.8)' }}>{story.spanLine}</div>
        {story.spanSub ? (
          <div style={{ ...display(type, tall ? 44 : square ? 38 : 46), color: 'rgba(255,255,255,0.92)', opacity: sub, transform: `translateY(${(1 - sub) * 16}px)`, textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>{story.spanSub}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

export function SpanLine({ data, list }) {
  const fps = data.fps || 30
  const home = list.find((s) => s.key === 'home')
  if (!data.story?.spanLine || !home) return null
  const from = Math.round((data.story.spanAt ?? 3) * fps)
  const end = home.from + home.dur
  const { revealStart } = homeTiming(data, home.dur)
  const subAt = home.from + revealStart + (data.home?.lineDelay ?? 70) - from
  return (
    <Sequence from={from} durationInFrames={end - from} name="line across the cut" layout="none">
      <Words data={data} frames={end - from} subAt={subAt} />
    </Sequence>
  )
}
