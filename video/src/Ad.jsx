import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { SwitchOn } from './scenes/SwitchOn.jsx'
import { Headline } from './scenes/Headline.jsx'
import { Estimate } from './scenes/Estimate.jsx'
import { DesignOnline } from './scenes/DesignOnline.jsx'
import { Season } from './scenes/Season.jsx'
import { Areas } from './scenes/Areas.jsx'
import { Offer } from './scenes/Offer.jsx'
import { EndCard } from './scenes/EndCard.jsx'
import { loadFonts } from './lib/fonts.js'
import { sceneList } from './timeline.js'

const SCENES = { switchOn: SwitchOn, headline: Headline, estimate: Estimate, design: DesignOnline, season: Season, areas: Areas, offer: Offer, end: EndCard }

// The whole ad: one Sequence per scene, back to back, from the timings in data.scenes.
export function Ad(props) {
  loadFonts()
  const list = sceneList(props)
  return (
    <AbsoluteFill
      style={{ background: props.colors.navy, fontKerning: 'normal' }}
    >
      {list.map(({ key, from, dur }) => {
        const Scene = SCENES[key]
        return (
          <Sequence key={key} from={from} durationInFrames={dur} name={key}>
            <Scene data={props} dur={dur} />
          </Sequence>
        )
      })}
      {props.music?.file ? <Audio src={staticFile(`music/${props.music.file}`)} volume={props.music.volume ?? 0.5} /> : null}
    </AbsoluteFill>
  )
}
