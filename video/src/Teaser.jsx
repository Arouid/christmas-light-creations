import { AbsoluteFill, useVideoConfig } from 'remotion'
import { LightsOn } from './Sound.jsx'
import { Intro } from './scenes/Intro.jsx'
import { FilmLook } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'

// The 5-second ad: scene 1 on its own (the cottage switching on and the name), held to the end.
// No music; the lights-on sound effect plays if one is set.
export function Teaser(props) {
  loadFonts()
  const { durationInFrames, fps } = useVideoConfig()
  const sfx = props.sfx || {}
  const on = Math.round((props.intro?.onAt ?? 2) * fps)
  return (
    <AbsoluteFill style={{ background: props.colors.navy, fontKerning: 'normal' }}>
      <Intro data={props} dur={durationInFrames} holdEnd />
      <FilmLook grain={props.look?.grain ?? 0.07} vignette={props.look?.vignette ?? 0.55} />
      <LightsOn sfx={sfx} at={on} v={sfx.volume ?? 0.8} keyPrefix="lights on" />
    </AbsoluteFill>
  )
}
