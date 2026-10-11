import { AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame } from 'remotion'
import { TALL_WINDOW, useFmt } from '../lib/format.js'
import { Sparkles, SceneFade } from '../lib/Stage.jsx'

// Scene 1: the house starts dark, a soft wipe sweeps across and the lights come on with a bloom.
export function SwitchOn({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, tall } = useFmt()
  const photo = data.photos.switchOn
  const boxH = tall ? TALL_WINDOW : h
  const src = staticFile(`photos/${photo.number}.jpg`)
  const scale = interpolate(frame, [0, dur], [1.0, 1.1])
  // The wipe: -20% → 120% of the width between frames 12 and 62 (ease out: fast start, soft end).
  const edge = interpolate(frame, [12, 62], [-25, 125], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 2.2) })
  const mask = `linear-gradient(100deg, black ${edge - 18}%, rgba(0,0,0,0.6) ${edge - 6}%, transparent ${edge + 6}%)`
  // Bloom flares as the wipe passes, then settles to a warm glow.
  const bloom = interpolate(frame, [12, 50, 80, dur], [0, 0.95, 0.4, 0.3], { extrapolateRight: 'clamp' })
  const imgStyle = {
    width: '100%', height: '100%', objectFit: 'cover',
    objectPosition: `${photo.focus[0] * 100}% ${photo.focus[1] * 100}%`,
    transform: `scale(${scale})`,
  }
  const tallFade = tall ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: `linear-gradient(to bottom, transparent, ${data.colors.navy})` }} /> : null
  return (
    <SceneFade dur={dur} fadeInFrames={0}>
      <AbsoluteFill style={{ background: data.colors.navy }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: boxH, overflow: 'hidden' }}>
          <Img src={src} style={{ ...imgStyle, filter: 'brightness(0.12) saturate(0.5)' }} />
          <Img src={src} style={{ ...imgStyle, position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask }} />
          <Img src={src} style={{ ...imgStyle, position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask, filter: 'blur(22px) brightness(1.5) saturate(1.3)', mixBlendMode: 'screen', opacity: bloom }} />
          <Sparkles count={70} seed="switch" opacity={interpolate(frame, [40, 80], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
          {tallFade}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
