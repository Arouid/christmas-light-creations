import { AbsoluteFill, Img, staticFile } from 'remotion'
import { Graded, Snow } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'

// The YouTube channel banner: 2048 × 1152, the three-gable house at night under the ad's grade,
// no text (the owner: the cottage version "isn't gonna vibe with younger audiences"). The roofline
// sits in the 1235 × 338 strip that a phone shows. Rendered as a still.

export function Banner(props) {
  loadFonts()
  const { colors, photos, look } = props
  const W = 2048
  const H = 1152
  const photo = photos.pitch
  return (
    <AbsoluteFill style={{ background: colors.navy }}>
      <Graded look={look}>
        <Img src={staticFile(`photos/${photo.number}.jpg`)} style={{ width: W, height: H, objectFit: 'cover', objectPosition: `${photo.focus[0] * 100}% ${photo.focus[1] * 100}%`, filter: 'brightness(0.92)' }} />
      </Graded>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(5,11,26,0.75) 100%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, background: `linear-gradient(to top, rgba(5,11,26,0.85), transparent)` }} />
    </AbsoluteFill>
  )
}

// The YouTube profile picture: 1080 × 1080, shown as a circle, so the cottage sits small and
// centred with room all round. Rendered as a still.
export function Profile(props) {
  loadFonts()
  const { colors } = props
  const logoH = 600
  const logoW = logoH * 0.886
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, #0e1d44 0%, ${colors.navy} 70%)` }}>
      <Snow count={60} opacity={0.6} />
      <div style={{ position: 'absolute', left: (1080 - logoW) / 2, top: (1080 - logoH) / 2 + 10, width: logoW, height: logoH, filter: 'drop-shadow(0 0 30px rgba(240,56,238,0.5)) drop-shadow(0 0 70px rgba(255,207,77,0.3))' }}>
        <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ width: '100%', height: '100%' }} />
      </div>
    </AbsoluteFill>
  )
}
