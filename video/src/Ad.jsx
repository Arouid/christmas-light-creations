import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useVideoConfig } from 'remotion'
import { Thread1, Thread2 } from './scenes/Thread.jsx'
import { Plan } from './scenes/Plan.jsx'
import { HomeReveal } from './scenes/HomeReveal.jsx'
import { Pitch } from './scenes/Pitch.jsx'
import { EndCard } from './scenes/EndCard.jsx'
import { FilmLook, LightSweep } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'
import { sceneList, SWEEP } from './timeline.js'

const SCENES = { thread1: Thread1, plan: Plan, home: HomeReveal, thread2: Thread2, pitch: Pitch, end: EndCard }

// The story ad: one Sequence per scene (cross-dissolved, with a light sweep at each change),
// the film look over everything, and the music bed (when on) fading out at the end.
export function Ad(props) {
  loadFonts()
  const { durationInFrames, fps } = useVideoConfig()
  const list = sceneList(props)
  const music = props.music || {}
  const vol = (f) => {
    const base = music.volume ?? 0.5
    const fadeIn = interpolate(f, [0, fps * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const fadeOut = interpolate(f, [durationInFrames - fps * 2.5, durationInFrames - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return base * fadeIn * fadeOut
  }
  return (
    <AbsoluteFill style={{ background: props.colors.navy, fontKerning: 'normal' }}>
      {list.map(({ key, from, dur }) => {
        const Scene = SCENES[key]
        return (
          <Sequence key={key} from={from} durationInFrames={dur} name={key}>
            <Scene data={props} dur={dur} />
          </Sequence>
        )
      })}
      {list.slice(1).filter(({ key }) => key !== 'home').map(({ key, from }) => (
        <Sequence key={`sweep-${key}`} from={from - 4} durationInFrames={SWEEP} name={`sweep → ${key}`}>
          <LightSweep dur={SWEEP} />
        </Sequence>
      ))}
      <FilmLook grain={props.look?.grain ?? 0.07} vignette={props.look?.vignette ?? 0.55} />
      {music.file ? <Audio src={staticFile(`music/${music.file}`)} startFrom={Math.round((music.startFrom || 0) * fps)} volume={vol} /> : null}
    </AbsoluteFill>
  )
}
