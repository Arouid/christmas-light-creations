import { AbsoluteFill, Img, staticFile } from 'remotion'
import { Snow } from './lib/Stage.jsx'
import { loadFonts } from './lib/fonts.js'
import { BODY, display } from './lib/fonts.js'

// The YouTube channel banner: 2048 × 1152, with everything that matters inside YouTube's safe
// area (1235 × 338, centred), which is all that shows on a phone. Rendered as a still.
const SAFE = { w: 1235, h: 338 }

export function Banner(props) {
  loadFonts()
  const { colors, words, type } = props
  const W = 2048
  const H = 1152
  const sx = (W - SAFE.w) / 2
  const sy = (H - SAFE.h) / 2
  const logoH = 300
  const logoW = logoH * 0.886
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0b1838 0%, ${colors.navy} 70%)`, fontKerning: 'normal' }}>
      <Snow count={160} opacity={0.7} />
      <div style={{ position: 'absolute', left: sx + 40, top: sy + (SAFE.h - logoH) / 2, width: logoW, height: logoH, filter: 'drop-shadow(0 0 26px rgba(240,56,238,0.5)) drop-shadow(0 0 60px rgba(255,207,77,0.3))' }}>
        <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: sx + 40 + logoW + 50, top: sy, height: SAFE.h, width: SAFE.w - logoW - 130, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ ...display(type, 84, { lineHeight: 1 }), color: colors.gold, textShadow: '0 0 40px rgba(255,207,77,0.3)', whiteSpace: 'nowrap' }}>Christmas Light<br />Creations</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 36, color: colors.white, marginTop: 16, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{words.brandSub}</div>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 36, color: colors.goldSoft, marginTop: 8, whiteSpace: 'nowrap' }}>{words.brandSite}</div>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 36, color: colors.goldSoft, marginTop: 4, whiteSpace: 'nowrap' }}>{words.phone}</div>
      </div>
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
