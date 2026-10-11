import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { SceneFade } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// She turns onto the street. Black, the time, then the house opens up out of the dark (a soft
// iris) and settles; "She's home." lands at the bottom. The one photo that has to be good.
export function HomeReveal({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, story, photos, type } = data
  const photo = photos.home
  const boxH = tall ? TALL_WINDOW : h
  const iris = interpolate(frame, [18, 80], [0, 150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 2) })
  const mask = `radial-gradient(ellipse at 50% 45%, black ${iris}%, transparent ${iris + 28}%)`
  const scale = interpolate(frame, [0, dur], [1.16, 1.02])
  const bright = interpolate(frame, [18, 90], [0.55, 0.92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const line = pop(frame, fps, 88, { damping: 14 })
  const media = {
    width: '100%', height: '100%', objectFit: 'cover',
    objectPosition: `${photo.focus[0] * 100}% ${photo.focus[1] * 100}%`,
    transform: `scale(${scale})`, filter: `brightness(${bright})`,
    WebkitMaskImage: mask, maskImage: mask,
  }
  return (
    <SceneFade dur={dur} fadeInFrames={0}>
      <AbsoluteFill style={{ background: '#02050d' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: boxH, overflow: 'hidden' }}>
          {photo.clip ? <OffthreadVideo src={staticFile(`clips/${photo.clip}`)} muted style={media} /> : <Img src={staticFile(`photos/${photo.number}.jpg`)} style={media} />}
          {tall ? (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: `linear-gradient(to bottom, transparent, ${colors.navy})` }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(5,11,26,0.85) 0%, rgba(5,11,26,0) 45%)`, opacity: line }} />
          )}
        </div>
        <div style={{ position: 'absolute', left: tall ? 70 : square ? 72 : 96, top: tall ? 120 : square ? 60 : 72, fontFamily: BODY, fontWeight: 600, fontSize: tall ? 36 : square ? 30 : 34, color: colors.gold, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: fadeIn(frame, 4, 10) }}>{story.homeTime}</div>
        <div style={{ position: 'absolute', left: tall ? 70 : square ? 72 : 96, right: 72, top: tall ? TALL_WINDOW - 60 : 'auto', bottom: tall ? 'auto' : square ? 72 : 90, ...display(type, tall ? 120 : square ? 100 : 136, { lineHeight: 1 }), color: colors.white, transform: `translateY(${(1 - line) * 60}px)`, opacity: fadeIn(frame, 88, 8), textShadow: '0 6px 40px rgba(0,0,0,0.8)' }}>
          {story.homeLine}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
