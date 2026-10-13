import { AbsoluteFill } from 'remotion'
import { Snow } from './lib/Stage.jsx'
import { Cottage } from './lib/Cottage.jsx'
import { loadFonts } from './lib/fonts.js'

// YouTube channel art, rendered as stills.
// Banner: 2048 × 1152; the photoreal cottage centred so it sits in the 1235 × 338 strip a phone
// shows, feathered into a navy night with snow. No text: the channel name, link and description
// sit under it on YouTube anyway, and the owner found the text versions "infomercially".
export function Banner(props) {
  loadFonts()
  const { colors, cottageImage } = props
  const W = 2048
  const H = 1152
  // The cottage body sits at about 30–90 % of the render's height; size and place it so that span
  // lands inside the phone strip (y 407–745).
  const size = 500
  const top = H / 2 - size * 0.6
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #0b1838 0%, ${colors.navy} 70%)` }}>
      <Snow count={170} opacity={0.6} />
      <Cottage image={cottageImage} x={(W - size) / 2} y={top} height={size} on={1} glow={0.8} />
    </AbsoluteFill>
  )
}

// Profile picture: 1080 × 1080, shown as a circle: the render scaled down and feathered into navy
// so the whole cottage stays inside the circle.
export function Profile(props) {
  const { colors, cottageImage } = props
  return (
    <AbsoluteFill style={{ background: colors.navy }}>
      {cottageImage ? (
        <Cottage image={cottageImage} x={(1080 - 860) / 2} y={(1080 - 860) / 2 - 10} height={860} on={1} glow={0.8} />
      ) : (
        <Cottage x={(1080 - 600 * 0.886) / 2} y={250} height={600} on={1} />
      )}
    </AbsoluteFill>
  )
}
