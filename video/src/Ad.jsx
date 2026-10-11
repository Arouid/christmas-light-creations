import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useVideoConfig } from 'remotion'
import { Intro } from './scenes/Intro.jsx'
import { Headline } from './scenes/Headline.jsx'
import { Estimate } from './scenes/Estimate.jsx'
import { DesignOnline } from './scenes/DesignOnline.jsx'
import { Season } from './scenes/Season.jsx'
import { Areas } from './scenes/Areas.jsx'
import { Offer } from './scenes/Offer.jsx'
import { EndCard } from './scenes/EndCard.jsx'
import { FilmLook, LightSweep } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'
import { sceneList, SWEEP } from './timeline.js'

const SCENES = { intro: Intro, headline: Headline, estimate: Estimate, design: DesignOnline, season: Season, areas: Areas, offer: Offer, end: EndCard }

// The whole ad: one Sequence per scene (cross-dissolved, with a light sweep at each change),
// the film look over everything, and the music bed fading out at the end.
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
      {list.slice(1).map(({ key, from }) => (
        <Sequence key={`sweep-${key}`} from={from - 4} durationInFrames={SWEEP} name={`sweep → ${key}`}>
          <LightSweep dur={SWEEP} />
        </Sequence>
      ))}
      <FilmLook grain={props.look?.grain ?? 0.07} vignette={props.look?.vignette ?? 0.55} />
      {music.file ? <Audio src={staticFile(`music/${music.file}`)} startFrom={Math.round((music.startFrom || 0) * fps)} volume={vol} /> : null}
    </AbsoluteFill>
  )
}
