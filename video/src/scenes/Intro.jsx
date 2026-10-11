import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { SceneFade, Snow } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 1: a quiet winter night, snow, the cottage in the dark; then it switches on (neon
// flicker, glow) on the music's first hit, and the business name appears.
const ON = 104 // frame the lights come on (the music's first hit is at ~3.5 s)
const FLICKER = [0.15, 0.9, 0.2, 1, 0.3, 1, 1, 0.5, 1, 1]

export function Intro({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const logoH = tall ? 760 : square ? 520 : 600
  const logoW = logoH * 0.886
  const x = (w - logoW) / 2
  const y = tall ? 420 : square ? 120 : (h - logoH) / 2 - 60
  const push = interpolate(frame, [0, dur], [1.0, 1.08])
  const dark = interpolate(frame, [0, 30], [0, 0.22], { extrapolateRight: 'clamp' })
  const k = frame - ON
  const on = k < 0 ? 0 : k < FLICKER.length * 2 ? FLICKER[Math.floor(k / 2)] : 1
  const glow = on * (0.85 + Math.sin(frame / 8) * 0.15)
  const flash = interpolate(frame, [ON, ON + 6, ON + 26], [0, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const name = pop(frame, fps, ON + 10)
  const sub = fadeIn(frame, ON + 22, 10)
  const ground = progress(frame, 0, 40)
  return (
    <SceneFade dur={dur} fadeInFrames={0}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0b1838 0%, ${colors.navy} 65%)` }}>
        <Snow count={110} opacity={0.8} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tall ? 520 : 260, background: `linear-gradient(to top, rgba(159,176,208,${0.18 * ground}), transparent)` }} />
        <div style={{ position: 'absolute', left: x, top: y, width: logoW, height: logoH, transform: `scale(${push})` }}>
          <Img src={staticFile('logo/clc-cottage-one-color-white.svg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark * (1 - on) }} />
          <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: on, filter: `drop-shadow(0 0 ${28 * glow}px rgba(240,56,238,0.55)) drop-shadow(0 0 ${70 * glow}px rgba(255,207,77,0.35))` }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, rgba(255,224,138,${flash}) 0%, transparent 60%)` }} />
        <div style={{ position: 'absolute', left: 0, width: w, top: y + logoH + (tall ? 70 : 30), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 60px' }}>
          <div style={{ ...display(type, tall ? 92 : square ? 72 : 88), color: colors.gold, transform: `translateY(${(1 - name) * 40}px)`, opacity: fadeIn(frame, ON + 10, 8), textShadow: '0 0 40px rgba(255,207,77,0.35)' }}>{words.brand}</div>
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: tall ? 40 : square ? 32 : 38, color: colors.white, opacity: sub * 0.9, marginTop: 16, letterSpacing: '0.04em' }}>{words.brandSub}</div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
