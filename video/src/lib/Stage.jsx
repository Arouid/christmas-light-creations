import { AbsoluteFill, Img, OffthreadVideo, staticFile, interpolate, random, useCurrentFrame } from 'remotion'
import { TALL_WINDOW, useFmt } from './format.js'
import { Clip } from './Clip.jsx'

// A photo (or a real clip) behind a scene. Wide and square cuts fill the frame; the tall cut
// shows the picture in a 4:5 window at the top (rooflines never sliced) fading into navy where
// the words go. The picture moves slowly (a push-in or a sideways drift with a slight tilt).
export function Backdrop({ photo, dur, drift = 'in', brightness = 0.55, colors, look, snow, style, children }) {
  const frame = useCurrentFrame()
  const { w, h, tall } = useFmt()
  const t = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: 'clamp' })
  const scale = drift === 'in' ? 1.06 + t * 0.08 : 1.12
  const x = drift === 'left' ? -t * 50 : drift === 'right' ? t * 50 : 0
  const tilt = drift === 'in' ? 0 : (drift === 'left' ? 1 : -1) * (1.2 - t * 2.4)
  const boxH = tall ? TALL_WINDOW : h
  const media = {
    width: '100%', height: '100%', objectFit: 'cover',
    objectPosition: `${photo.focus[0] * 100}% ${photo.focus[1] * 100}%`,
    transform: `perspective(2400px) rotateY(${tilt}deg) translateX(${x}px) scale(${scale})`,
    filter: `brightness(${brightness})`,
  }
  return (
    <AbsoluteFill style={{ background: colors.navy, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: boxH, overflow: 'hidden' }}>
        <Graded look={look}>
          {photo.clip ? (
            <OffthreadVideo src={staticFile(`clips/${photo.clip}`)} muted style={media} />
          ) : (
            <Img src={staticFile(`photos/${photo.number}.jpg`)} style={media} />
          )}
        </Graded>
        {snow ? <SnowOverlay data={snow} start={9} /> : null}
        {tall ? (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: `linear-gradient(to bottom, transparent, ${colors.navy})` }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${colors.navy} 0%, rgba(5,11,26,0.55) 40%, rgba(5,11,26,0) 75%)` }} />
        )}
      </div>
      {children}
    </AbsoluteFill>
  )
}

// Where the words of a scene sit. Tall: the band under the photo window. Wide/square: lower third
// (align 'bottom') or the middle (align 'center').
export function TextZone({ align = 'bottom', children, style }) {
  const { w, h, tall, square } = useFmt()
  const pad = square ? 72 : 96
  const base = tall
    ? { top: TALL_WINDOW - 160, bottom: 0, justifyContent: 'center', padding: `0 ${pad}px 60px` }
    : align === 'center'
      ? { top: 0, bottom: 0, justifyContent: 'center', padding: `0 ${pad}px` }
      : { top: 0, bottom: 0, justifyContent: 'flex-end', padding: `0 ${pad}px ${pad}px` }
  return (
    <div style={{ position: 'absolute', left: 0, width: w, maxHeight: h, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', ...base, ...style }}>
      {children}
    </div>
  )
}

// The grade: wraps a photo or clip so every piece of footage shares one look. filter on the
// media (saturation, contrast), blacks lifted toward navy, gold warmth in the mids.
export function Graded({ look, children, style }) {
  const g = look?.grade || {}
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      <div style={{ position: 'absolute', inset: 0, filter: `saturate(${g.saturate ?? 1}) contrast(${g.contrast ?? 1})` }}>{children}</div>
      {g.lift > 0 && <div style={{ position: 'absolute', inset: 0, background: '#0a1530', mixBlendMode: 'lighten', opacity: g.lift, pointerEvents: 'none' }} />}
      {g.warm > 0 && <div style={{ position: 'absolute', inset: 0, background: '#ffcf4d', mixBlendMode: 'soft-light', opacity: g.warm, pointerEvents: 'none' }} />}
    </div>
  )
}

// Real falling snow in front of a scene: a snow-on-black clip, screen-blended (the black goes away).
export function SnowOverlay({ data, start = 0, opacity }) {
  const file = data.clips?.snowOverlay
  const o = opacity ?? data.snowOverlayOpacity ?? 0.6
  if (!file || o <= 0) return null
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: o, pointerEvents: 'none' }}>
      <Clip file={file} start={start} />
    </AbsoluteFill>
  )
}

// Falling snow (drawn).
export function Snow({ count = 90, seed = 'snow', opacity = 1 }) {
  const frame = useCurrentFrame()
  const { w, h } = useFmt()
  const flakes = []
  for (let i = 0; i < count; i++) {
    const x0 = random(`${seed}x${i}`) * w
    const speed = 1.2 + random(`${seed}v${i}`) * 2.2
    const r = 1.5 + random(`${seed}r${i}`) * 3
    const sway = random(`${seed}w${i}`) * 40
    const y = (random(`${seed}y${i}`) * h + frame * speed) % (h + 20) - 10
    const x = x0 + Math.sin((frame + i * 7) / 40) * sway
    flakes.push(<circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.35 + random(`${seed}o${i}`) * 0.5} />)
  }
  return <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity }}>{flakes}</svg>
}

// Fades a scene out over its last frames (and optionally in over its first).
export function SceneFade({ dur, fadeInFrames = 6, fadeOutFrames = 8, children }) {
  const frame = useCurrentFrame()
  const o = Math.min(
    fadeInFrames > 0 ? interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1,
    fadeOutFrames > 0 ? interpolate(frame, [dur - fadeOutFrames, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1,
  )
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

// Film look over the whole video: a soft vignette and fine moving grain.
export function FilmLook({ grain = 0.07, vignette = 0.55 }) {
  const frame = useCurrentFrame()
  const { w, h } = useFmt()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,${vignette}) 100%)` }} />
      {grain > 0 && (
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, opacity: grain, mixBlendMode: 'overlay' }}>
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={frame % 50} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width={w} height={h} filter="url(#grain)" />
        </svg>
      )}
    </AbsoluteFill>
  )
}

// A soft band of light that sweeps across the frame at a scene change.
export function LightSweep({ dur = 14, color = 'rgba(255,224,138,0.22)' }) {
  const frame = useCurrentFrame()
  const { w, h } = useFmt()
  const x = interpolate(frame, [0, dur], [-w * 0.6, w * 1.2])
  // A side-to-side gradient, fully transparent at both ends, skewed for the diagonal look. A
  // diagonal gradient inside a tall box ended short of its sides and left a hard vertical edge
  // crossing the frame at each scene change (seen 2026-10-13).
  return (
    <div style={{ position: 'absolute', top: 0, left: x, width: w * 0.35, height: h, background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`, transform: 'skewX(-12deg)', mixBlendMode: 'screen', pointerEvents: 'none' }} />
  )
}
