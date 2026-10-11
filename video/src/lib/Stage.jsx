import { AbsoluteFill, Img, staticFile, interpolate, random, useCurrentFrame } from 'remotion'
import { TALL_WINDOW, useFmt } from './format.js'

// A photo behind a scene. Wide and square cuts fill the frame; the tall cut shows the photo in a
// 4:5 window at the top (rooflines never sliced) fading into navy where the words go.
// drift: 'in' | 'left' | 'right'. brightness: 0–1. dur: scene length in frames (for the drift).
export function Backdrop({ photo, dur, drift = 'in', brightness = 0.55, colors, style, children }) {
  const frame = useCurrentFrame()
  const { w, h, tall } = useFmt()
  const t = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: 'clamp' })
  const scale = drift === 'in' ? 1.06 + t * 0.08 : 1.12
  const x = drift === 'left' ? -t * 50 : drift === 'right' ? t * 50 : 0
  const boxH = tall ? TALL_WINDOW : h
  return (
    <AbsoluteFill style={{ background: colors.navy, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: boxH, overflow: 'hidden' }}>
        <Img
          src={staticFile(`photos/${photo.number}.jpg`)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: `${photo.focus[0] * 100}% ${photo.focus[1] * 100}%`,
            transform: `translateX(${x}px) scale(${scale})`,
            filter: `brightness(${brightness})`,
          }}
        />
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

// Soft twinkling dust over a photo. Deterministic (seeded), cheap (SVG circles).
export function Sparkles({ count = 60, seed = 'dust', color = '#ffe08a', opacity = 1, area }) {
  const frame = useCurrentFrame()
  const { w, h, tall } = useFmt()
  const H = area?.h ?? (tall ? TALL_WINDOW : h)
  const W = area?.w ?? w
  const dots = []
  for (let i = 0; i < count; i++) {
    const x = random(`${seed}x${i}`) * W
    const y = random(`${seed}y${i}`) * H
    const r = 1.5 + random(`${seed}r${i}`) * 3.5
    const speed = 0.08 + random(`${seed}s${i}`) * 0.18
    const phase = random(`${seed}p${i}`) * Math.PI * 2
    const tw = Math.max(0, Math.sin(frame * speed + phase))
    dots.push(<circle key={i} cx={x} cy={y} r={r * (0.6 + tw * 0.6)} fill={color} opacity={tw * 0.9} />)
  }
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity, pointerEvents: 'none' }}>
      <g filter="url(#sparkleBlur)">{dots}</g>
      <defs><filter id="sparkleBlur"><feGaussianBlur stdDeviation="0.8" /></filter></defs>
    </svg>
  )
}

// Falling snow for the end card.
export function Snow({ count = 90, seed = 'snow' }) {
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
  return <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>{flakes}</svg>
}

// Fades a scene out over its last frames (and optionally in over its first).
export function SceneFade({ dur, fadeInFrames = 6, fadeOutFrames = 8, children }) {
  const frame = useCurrentFrame()
  const o = Math.min(
    fadeInFrames > 0 ? interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1,
    interpolate(frame, [dur - fadeOutFrames, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  )
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}
