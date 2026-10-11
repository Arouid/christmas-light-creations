import { Composition } from 'remotion'
import { Ad } from './Ad.jsx'
import data from './data.js'
import { totalFrames } from './timeline.js'

const SHAPES = [
  { id: 'Ad16x9', width: 1920, height: 1080 },
  { id: 'Ad9x16', width: 1080, height: 1920 },
  { id: 'Ad1x1', width: 1080, height: 1080 },
]

// Three compositions, same scenes and words, different shapes. The props panel in Remotion
// Studio edits a copy of data.js live; the length follows the scene timings.
export function Root() {
  return (
    <>
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
