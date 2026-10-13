import { Audio, Sequence, staticFile } from 'remotion'
import { TYPING } from './scenes/Thread.jsx'
import { homeTiming, planTiming } from './timeline.js'

// Sound effects for the story ad, placed at the moments the scenes draw: a pop when a bubble
// lands, the typing dots, the cottage flickering on, the car at 5:41 pm, the reveal, and a soft
// ambience loop under everything. Each is a file name in data.sfx (empty = skipped).
function Hit({ file, at, volume, name }) {
  if (!file || at < 0) return null
  return (
    <Sequence from={at} name={name} layout="none">
      <Audio src={staticFile(`sfx/${file}`)} volume={volume} />
    </Sequence>
  )
}

export function Sound({ props, list }) {
  const sfx = props.sfx || {}
  const fps = props.fps || 30
  const v = sfx.volume ?? 0.8
  const hits = []
  for (const { key, from, dur } of list) {
    if (key === 'thread1' || key === 'thread2') {
      const msgs = key === 'thread1' ? props.story.thread1 : props.story.thread2
      msgs.forEach((m, i) => {
        const land = from + Math.round(m.at * fps)
        hits.push(<Hit key={`${key}-typing-${i}`} file={sfx.typing} at={land - TYPING} volume={v * 0.5} name={`typing ${key} ${i + 1}`} />)
        hits.push(<Hit key={`${key}-pop-${i}`} file={sfx.pop} at={land} volume={v} name={`pop ${key} ${i + 1}`} />)
      })
    }
    if (key === 'plan') {
      const { on } = planTiming(dur, props.story.plan.length)
      hits.push(<Hit key="lightsOn" file={sfx.lightsOn} at={from + on - 2} volume={v} name="lights on" />)
    }
    if (key === 'home') {
      const { revealStart } = homeTiming(props, dur)
      hits.push(<Hit key="car" file={sfx.car} at={from} volume={v * 0.8} name="car" />)
      hits.push(<Hit key="reveal" file={sfx.reveal} at={from + revealStart} volume={v} name="reveal" />)
    }
    if (key === 'end') {
      hits.push(<Hit key="lightsOn-end" file={sfx.lightsOn} at={from + 2} volume={v * 0.7} name="lights on (end card)" />)
    }
  }
  return (
    <>
      {hits}
      {sfx.ambience ? <Audio src={staticFile(`sfx/${sfx.ambience}`)} volume={sfx.ambienceVolume ?? 0.25} loop /> : null}
    </>
  )
}
