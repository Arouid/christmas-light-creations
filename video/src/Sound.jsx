import { Audio, Sequence, staticFile } from 'remotion'
import { TYPING } from './scenes/Thread.jsx'
import { homeTiming } from './timeline.js'

// Sound effects for the story ad, placed at the moments the scenes draw: a pop when a bubble
// lands, the typing dots, the cottage flickering on, the car at 5:41 pm, the reveal, and a soft
// ambience loop under everything. Each is a file name in data.sfx (empty = skipped).
function Hit({ file, at, volume, name, frames, fadeOut = 0 }) {
  if (!file || at < 0) return null
  const vol = fadeOut > 0 && frames ? (f) => volume * Math.max(0, Math.min(1, (frames - f) / fadeOut)) : volume
  return (
    <Sequence from={at} name={name} layout="none" durationInFrames={frames}>
      <Audio src={staticFile(`sfx/${file}`)} volume={vol} />
    </Sequence>
  )
}

// The cottage switching on: the flicker (a short window of the buzz, faded out) and a chime as
// the glow settles.
function LightsOn({ sfx, at, v, keyPrefix, scale = 1 }) {
  return (
    <>
      <Hit key={`${keyPrefix}-flicker`} file={sfx.lightsOn} at={at - 2} volume={v * 0.7 * scale} frames={40} fadeOut={16} name={`${keyPrefix}: flicker`} />
      <Hit key={`${keyPrefix}-chime`} file={sfx.lightsChime} at={at + 8} volume={v * 0.8 * scale} name={`${keyPrefix}: chime`} />
    </>
  )
}

export { LightsOn }

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
        hits.push(<Hit key={`${key}-typing-${i}`} file={sfx.typing} at={land - TYPING} volume={v * 0.35} frames={TYPING} fadeOut={6} name={`typing ${key} ${i + 1}`} />)
        hits.push(<Hit key={`${key}-pop-${i}`} file={sfx.pop} at={land} volume={v} name={`pop ${key} ${i + 1}`} />)
      })
    }
    if (key === 'home') {
      const { revealStart } = homeTiming(props, dur)
      hits.push(<Hit key="car" file={sfx.car} at={from} volume={v * 0.8} name="car" />)
      hits.push(<Hit key="reveal" file={sfx.reveal} at={from + revealStart} volume={v} name="reveal" />)
    }
    if (key === 'end') {
      hits.push(<LightsOn key="lightsOn-end" sfx={sfx} at={from + 4} v={v} keyPrefix="end card" scale={0.6} />)
    }
  }
  return (
    <>
      {hits}
      {sfx.ambience ? <Audio src={staticFile(`sfx/${sfx.ambience}`)} volume={sfx.ambienceVolume ?? 0.25} loop /> : null}
    </>
  )
}
