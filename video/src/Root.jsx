import { Composition } from 'remotion'
import { Ad } from './Ad.jsx'
import { Teaser } from './Teaser.jsx'
import { Banner, Profile } from './Banner.jsx'
import data from './data.js'
import { totalFrames } from './timeline.js'

const SHAPES = [
  { id: 'Ad16x9', width: 1920, height: 1080 },
  { id: 'Ad9x16', width: 1080, height: 1920 },
  { id: 'Ad1x1', width: 1080, height: 1080 },
]

const teaserFrames = (props) => Math.round((props.teaser?.seconds ?? 5) * (props.fps || 30))
const teaserProps = { ...data, intro: { onAt: data.teaser.onAt } }

// Teaser*: the 5-second ad (scene 1 alone) in three shapes. Ad*: the full ad in the same shapes.
// The props panel in Remotion Studio edits a copy of data.js live; lengths follow the timings.
export function Root() {
  return (
    <>
      <Composition id="YouTubeBanner" component={Banner} width={2048} height={1152} fps={data.fps} durationInFrames={1} defaultProps={data} />
      <Composition id="YouTubeProfile" component={Profile} width={1080} height={1080} fps={data.fps} durationInFrames={1} defaultProps={data} />
      {SHAPES.map((s) => (
        <Composition
          key={`teaser-${s.id}`}
          id={s.id.replace('Ad', 'Teaser')}
          component={Teaser}
          width={s.width}
          height={s.height}
          fps={data.fps}
          durationInFrames={teaserFrames(data)}
          defaultProps={teaserProps}
          calculateMetadata={({ props }) => ({ durationInFrames: teaserFrames(props), fps: props.fps || 30 })}
        />
      ))}
      {SHAPES.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={Ad}
          width={s.width}
          height={s.height}
          fps={data.fps}
          durationInFrames={totalFrames(data)}
          defaultProps={data}
          calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props), fps: props.fps || 30 })}
        />
      ))}
    </>
  )
}
