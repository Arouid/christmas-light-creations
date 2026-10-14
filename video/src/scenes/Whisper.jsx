import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Graded, SceneFade } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// The whisper (the humorous cut, owner's clip 2026-10-13): a perfume-ad close-up, he leans in to
// whisper, her eyes open, a smile. The whispered words land one at a time under the picture, and
// they are about the Christmas lights. story.whisperLine (the words), story.whisperAt (seconds
// into the scene when the first word lands), story.whisperStep (seconds between words).
export function Whisper({ data, dur }) {
  const frame = useCurrentFrame()
  const { fps, tall, square } = useFmt()
  const { colors, story, type, clips } = data
  const words = (story.whisperLine || '').split(' ').filter(Boolean)
  const at0 = Math.round((story.whisperAt ?? 1.4) * fps)
  const step = Math.round((story.whisperStep ?? 0.55) * fps)
  const size = tall ? 84 : square ? 72 : 92
  const shade = fadeIn(frame, at0 - 10, 12)
  return (
    <SceneFade dur={dur} fadeInFrames={14}>
      <AbsoluteFill style={{ background: '#000' }}>
        <Graded look={data.look}>
          {clips?.whisper ? <Clip file={clips.whisper} start={data.clipStart?.whisper || 0} brightness={0.92} /> : null}
        </Graded>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 40%)', opacity: shade }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: tall ? 300 : square ? 110 : 120, display: 'flex', justifyContent: 'center', gap: tall ? 22 : 26, flexWrap: 'wrap', padding: '0 80px' }}>
          {words.map((w, i) => {
            const land = at0 + i * step
            const s = pop(frame, fps, land, { damping: 14 })
            return (
              <span key={i} style={{ ...display(type, size), color: colors.white, opacity: fadeIn(frame, land, 8), transform: `translateY(${(1 - s) * 24}px)`, textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}>
                {w}
              </span>
            )
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
