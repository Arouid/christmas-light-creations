import { AbsoluteFill, useVideoConfig } from 'remotion'
import { Intro } from './scenes/Intro.jsx'
import { FilmLook } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'

// The 5-second ad: scene 1 on its own (the cottage switching on and the name), held to the end,
// no music.
export function Teaser(props) {
  loadFonts()
  const { durationInFrames } = useVideoConfig()
  return (
    <AbsoluteFill style={{ background: props.colors.navy, fontKerning: 'normal' }}>
      <Intro data={props} dur={durationInFrames} holdEnd />
      <FilmLook grain={props.look?.grain ?? 0.07} vignette={props.look?.vignette ?? 0.55} />
    </AbsoluteFill>
  )
}
