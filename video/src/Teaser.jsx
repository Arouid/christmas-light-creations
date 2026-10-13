import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion'
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
      {sfx.lightsOn ? <Sequence from={on - 2} name="lights on" layout="none"><Audio src={staticFile(`sfx/${sfx.lightsOn}`)} volume={sfx.volume ?? 0.8} /></Sequence> : null}
    </AbsoluteFill>
  )
}
