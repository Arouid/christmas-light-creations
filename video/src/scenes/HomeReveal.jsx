import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { Graded, SceneFade, SnowOverlay } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'
import { homeTiming } from '../timeline.js'

// She turns onto the street. With footage: her in the car under the time, the house opens up out
// of the dark (a soft iris) and settles, "She's home." lands, her face reacts (still in the car),
// then the car door closes as she gets out (with the slam) and we cut away. Snow in front of the
// reaction only.
// and her reaction closes the scene, with real snow over that last part only (owner: the overlay
// looked fake over the house). Without footage: black, the time, the reveal, the line.
export function HomeReveal({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, story, photos, type, clips } = data
  const photo = photos.home
  const boxH = tall ? TALL_WINDOW : h
  const { driveEnd, revealStart, reactionStart, doorStart } = homeTiming(data, dur)
  const iris = interpolate(frame, [revealStart, revealStart + 62], [0, 150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 2) })
  const mask = `radial-gradient(ellipse at 50% 45%, black ${iris}%, transparent ${iris + 28}%)`
  const scale = interpolate(frame, [revealStart, dur], [1.16, 1.02], { extrapolateLeft: 'clamp' })
  const bright = interpolate(frame, [revealStart, revealStart + 72], [0.55, 0.92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const lineAt = revealStart + 70
  const line = pop(frame, fps, lineAt, { damping: 14 })
  const driveFade = driveEnd ? interpolate(frame, [driveEnd - 6, driveEnd + 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0
  const doorIn = clips?.door && doorStart < dur ? fadeIn(frame, doorStart, 4) : 0
  // The line leaves once the door shot is in, so it is gone well before the next scene.
  const lineOut = clips?.door && doorStart < dur ? fadeIn(frame, doorStart + 10, 8) : 0
  const reactionIn = clips?.reaction ? fadeIn(frame, reactionStart, 10) : 0
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
          <Graded look={data.look}>
          {clips?.drive && driveFade > 0 && (
            <div style={{ position: 'absolute', inset: 0, opacity: driveFade }}>
              <Clip file={clips.drive} start={data.clipStart?.drive || 0} brightness={0.85} />
            </div>
          )}
          {frame >= revealStart - 2 && (photo.clip ? <OffthreadVideo src={staticFile(`clips/${photo.clip}`)} muted style={media} /> : <Img src={staticFile(`photos/${photo.number}.jpg`)} style={media} />)}
          {tall ? (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: `linear-gradient(to bottom, transparent, ${colors.navy})` }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(5,11,26,0.85) 0%, rgba(5,11,26,0) 45%)`, opacity: (story.homeLine ? line : 0) * (1 - reactionIn) }} />
          )}
          {clips?.reaction && frame >= reactionStart && (
            <div style={{ position: 'absolute', inset: 0, opacity: reactionIn }}>
              <Clip file={clips.reaction} start={data.clipStart?.reaction || 0} brightness={0.95} />
            </div>
          )}
          </Graded>
          {clips?.reaction && frame >= reactionStart && (
            <div style={{ position: 'absolute', inset: 0, opacity: reactionIn }}><SnowOverlay data={data} start={3} /></div>
          )}
          {clips?.door && frame >= doorStart && (
            <div style={{ position: 'absolute', inset: 0, opacity: doorIn }}>
              <Clip file={clips.door} start={data.clipStart?.door || 0} brightness={1.05} />
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', left: tall ? 70 : square ? 72 : 96, top: tall ? 120 : square ? 60 : 72, fontFamily: BODY, fontWeight: 600, fontSize: tall ? 36 : square ? 30 : 34, color: colors.gold, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: fadeIn(frame, 4, 10) * (1 - reactionIn), textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{story.homeTime}</div>
        <div style={{ position: 'absolute', left: tall ? 70 : square ? 72 : 96, right: 72, top: tall ? TALL_WINDOW - 60 : 'auto', bottom: tall ? 'auto' : square ? 72 : 90, display: 'flex', flexDirection: 'column', gap: tall ? 18 : square ? 12 : 16 }}>
          <div style={{ ...display(type, tall ? 120 : square ? 100 : 136, { lineHeight: 1 }), color: colors.white, transform: `translateY(${(1 - line) * 60}px)`, opacity: fadeIn(frame, lineAt, 8) * (1 - lineOut), textShadow: '0 6px 40px rgba(0,0,0,0.8)' }}>
            {story.homeLine}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
