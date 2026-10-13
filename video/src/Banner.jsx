import { AbsoluteFill, Img, staticFile } from 'remotion'
import { Snow } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'
import { BODY } from './lib/fonts.js'

// The YouTube channel banner: 2048 × 1152, with everything that matters inside YouTube's safe
// area (1235 × 338, centred), which is all that shows on a phone. Rendered as a still.
const SAFE = { w: 1235, h: 338 }

export function Banner(props) {
  loadFonts()
  const { colors } = props
  const W = 2048
  const H = 1152
  const sy = (H - SAFE.h) / 2
  const logoH = 250
  const logoW = logoH * 0.886
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #0b1838 0%, ${colors.navy} 70%)`, fontKerning: 'normal' }}>
      <Snow count={170} opacity={0.7} />
      <div style={{ position: 'absolute', left: (W - logoW) / 2, top: sy + 6, width: logoW, height: logoH, filter: 'drop-shadow(0 0 26px rgba(240,56,238,0.5)) drop-shadow(0 0 60px rgba(255,207,77,0.3))' }}>
        <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, width: W, top: sy + logoH + 26, textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 30, letterSpacing: '0.28em', color: colors.goldSoft, opacity: 0.9 }}>PEARLAND, TX  ·  SINCE 2011</div>
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
