import { Audio, Sequence, staticFile } from 'remotion'
import { TYPING } from './scenes/Thread.jsx'
import { homeTiming, planTiming } from './timeline.js'

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

// A looped ambience bed for a stretch of the video, faded in and out.
function Bed({ file, from, frames, volume, name, fade = 10 }) {
  if (!file || frames <= 0) return null
  const vol = (f) => volume * Math.min(1, f / fade, (frames - f) / fade)
  return (
    <Sequence from={from} durationInFrames={frames} name={name} layout="none">
      <Audio src={staticFile(`sfx/${file}`)} volume={vol} loop />
    </Sequence>
  )
}

// The cottage switching on: the switch click, then the sweep of the lights coming alive.
function LightsOn({ sfx, at, v, keyPrefix, scale = 1 }) {
  return (
    <>
      <Hit key={`${keyPrefix}-click`} file={sfx.lightsOn} at={at - 1} volume={v * scale} name={`${keyPrefix}: switch`} />
      <Hit key={`${keyPrefix}-sweep`} file={sfx.lightsChime} at={at + 2} volume={v * 0.85 * scale} name={`${keyPrefix}: sweep`} />
    </>
  )
}

export { LightsOn }

export function Sound({ props, list }) {
  const sfx = props.sfx || {}
  const fps = props.fps || 30
  const base = sfx.volume ?? 0.8
  const mix = props.adMix || {}
  const lv = (key) => base * (mix[key] ?? 1)
  const hits = []
  for (const { key, from, dur } of list) {
    if (key === 'thread1' || key === 'thread2') {
      const msgs = key === 'thread1' ? props.story.thread1 : props.story.thread2
      msgs.forEach((m, i) => {
        const land = from + Math.round(m.at * fps)
        if (lv('typing') > 0) hits.push(<Hit key={`${key}-typing-${i}`} file={sfx.typing} at={land - TYPING} volume={lv('typing') * 0.35} frames={TYPING} fadeOut={6} name={`typing ${key} ${i + 1}`} />)
        if (lv('pop') > 0) hits.push(<Hit key={`${key}-pop-${i}`} file={sfx.pop} at={land} volume={lv('pop')} name={`pop ${key} ${i + 1}`} />)
      })
    }
    if (key === 'plan' && props.cottageImage && props.planCottage) {
      const { on } = planTiming(dur, props.story.plan.length)
      if (lv('lightsOn') > 0) hits.push(<LightsOn key="lightsOn-plan" sfx={sfx} at={from + on} v={lv('lightsOn')} keyPrefix="plan: lights on" />)
    }
    if (key === 'home') {
      const { driveEnd, slamAt, revealStart, doorStart } = homeTiming(props, dur)
      const bed = (sfx.bedVolume ?? 0.35) * (mix.beds ?? 1)
      if (driveEnd > 0) hits.push(<Bed key="bed-car" file={sfx.carInterior} from={from} frames={driveEnd + 8} volume={bed} name="bed: inside the car" />)
      hits.push(<Bed key="bed-night" file={sfx.nightOutside} from={from + revealStart - 8} frames={dur - revealStart + 8} volume={bed} name="bed: outside at night" />)
      void doorStart
      if (lv('car') > 0 && slamAt > 0) hits.push(<Hit key="car" file={sfx.car} at={from + slamAt} volume={lv('car')} name="car door" />)
      if (lv('reveal') > 0) hits.push(<Hit key="reveal" file={sfx.reveal} at={from + revealStart} volume={lv('reveal')} name="reveal" />)
    }
    if (key === 'pitch') {
      hits.push(<Bed key="bed-night-2" file={sfx.nightOutside} from={from} frames={dur} volume={(sfx.bedVolume ?? 0.35) * (mix.beds ?? 1) * 0.8} name="bed: outside, the closing house" />)
    }
    if (key === 'end' && !(props.cottageImage && props.endCardLit)) {
      if (lv('lightsOn') > 0) hits.push(<LightsOn key="lightsOn-end" sfx={sfx} at={from + 4} v={lv('lightsOn')} keyPrefix="end card" scale={0.6} />)
    }
  }
  return (
    <>
      {hits}
      {sfx.ambience && (mix.ambience ?? 1) > 0 ? <Audio src={staticFile(`sfx/${sfx.ambience}`)} volume={(sfx.ambienceVolume ?? 0.25) * (mix.ambience ?? 1)} loop /> : null}
    </>
  )
}
