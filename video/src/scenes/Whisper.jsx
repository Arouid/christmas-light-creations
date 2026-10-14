import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Graded, SceneFade } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// The whisper (the humorous cut, owner's clip 2026-10-13): a perfume-ad close-up, he leans in to
// whisper, her eyes open, a smile. The whispered words land one at a time under the picture, and
// they are about the Christmas lights. story.whisperLine (the words), story.whisperAt (seconds
// into the scene when the first word lands), story.whisperStep (seconds between words).
export function Whisper({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, story, type, clips } = data
  const words = (story.whisperLine || '').split(' ').filter(Boolean)
  const at0 = Math.round((story.whisperAt ?? 1.4) * fps)
  const step = Math.round((story.whisperStep ?? 0.55) * fps)
  const size = tall ? 84 : square ? 72 : 92
  const shade = fadeIn(frame, at0 - 10, 12)
  // story.whisperCaption: a small bracketed caption top-left while the clip plays (the Halloween cut's
  // sound-off joke), from 1 s to the scene's last half second.
  const caption = story.whisperCaption || ''
  const capOn = caption ? fadeIn(frame, fps, 8) * (1 - fadeIn(frame, dur - 14, 8)) : 0
  // Tall and square: the 16:9 close-up as a wide band (a light crop keeps both faces; a full
  // cover crop showed only her eye and lost the whisper), the words under it on black.
  const band = tall || square
  const bandH = tall ? 780 : 700
  const bandY = tall ? (h - bandH) / 2 - 160 : 110
  // In the band the window sits a little right of centre so his face stays in it with hers.
  const clip = clips?.whisper ? <Clip file={clips.whisper} start={data.clipStart?.whisper || 0} brightness={0.92} focus={band ? [tall ? 0.58 : 0.55, 0.5] : [0.5, 0.5]} /> : null
  const wordRow = (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: band ? 'auto' : 120, top: band ? bandY + bandH + (tall ? 70 : 44) : 'auto', display: 'flex', justifyContent: 'center', gap: tall ? 22 : 26, flexWrap: 'wrap', padding: '0 80px' }}>
      {words.map((wd, i) => {
        const land = at0 + i * step
        const sp = pop(frame, fps, land, { damping: 14 })
        return (
          <span key={i} style={{ ...display(type, size), color: colors.white, opacity: fadeIn(frame, land, 8), transform: `translateY(${(1 - sp) * 24}px)`, textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}>
            {wd}
          </span>
        )
      })}
    </div>
  )
  return (
    <SceneFade dur={dur} fadeInFrames={14}>
      <AbsoluteFill style={{ background: '#000' }}>
        {band ? (
          <div style={{ position: 'absolute', left: 0, top: bandY, width: w, height: bandH, overflow: 'hidden' }}>
            <Graded look={data.look}>{clip}</Graded>
          </div>
        ) : (
          <>
            <Graded look={data.look}>{clip}</Graded>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 40%)', opacity: shade }} />
          </>
        )}
        {wordRow}
        {caption ? (
          <div style={{ position: 'absolute', left: tall ? 70 : square ? 72 : 96, top: band ? bandY - (tall ? 90 : 70) : tall ? 120 : square ? 60 : 72, fontFamily: BODY, fontWeight: 500, fontSize: tall ? 38 : square ? 32 : 36, color: 'rgba(255,255,255,0.9)', opacity: capOn, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{caption}</div>
        ) : null}
      </AbsoluteFill>
    </SceneFade>
  )
}
