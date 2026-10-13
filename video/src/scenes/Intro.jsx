import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { SceneFade, Snow, SnowOverlay } from '../lib/Stage.jsx'
import { Cottage } from '../lib/Cottage.jsx'
import { WideCottage } from '../lib/WideCottage.jsx'
import { flickerOn } from '../lib/flicker.js'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop, progress } from '../lib/motion.js'

// The 5-second ad: a quiet winter night, snow, the cottage in the dark; then it switches on
// (neon flicker, glow) at data.intro.onAt seconds, and the name, what we do and the website appear.
// holdEnd: no fade-out, the last frame is the lit cottage with the name.
export function Intro({ data, dur, holdEnd = false }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const ON = Math.round((data.intro?.onAt ?? 2) * fps)
  const img = data.cottageImage
  const wide = !tall && !square && data.cottageImageWide ? data.cottageImageWide : ''
  const logoH = img ? (tall ? 900 : square ? 620 : 700) : tall ? 760 : square ? 520 : 600
  const logoW = logoH * (img ? 1 : 0.886)
  const x = (w - logoW) / 2
  const y = img ? (tall ? 330 : square ? 40 : (h - logoH) / 2 - 90) : tall ? 420 : square ? 120 : (h - logoH) / 2 - 60
  const push = interpolate(frame, [0, dur], [1.0, 1.08])
  const dark = interpolate(frame, [0, 30], [0, 0.22], { extrapolateRight: 'clamp' })
  const on = flickerOn(frame - ON)
  const glow = 0.85 + Math.sin(frame / 8) * 0.15
  const flash = interpolate(frame, [ON, ON + 6, ON + 26], [0, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const name = pop(frame, fps, ON + 10)
  const sub = fadeIn(frame, ON + 18, 8)
  const site = fadeIn(frame, ON + 30, 10)
  const ground = progress(frame, 0, 40)
  return (
    <SceneFade dur={dur} fadeInFrames={0} fadeOutFrames={holdEnd ? 0 : 8}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0b1838 0%, ${colors.navy} 65%)` }}>
        {data.clips?.end ? <SnowOverlay data={{ ...data, clips: { snowOverlay: data.clips.end } }} start={12} opacity={0.6} /> : <Snow count={110} opacity={0.8} />}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tall ? 520 : 260, background: `linear-gradient(to top, rgba(159,176,208,${0.18 * ground}), transparent)` }} />
        {wide ? <WideCottage image={wide} on={on} glow={glow} scale={push} colors={colors} /> : <Cottage image={img} x={x} y={y} height={logoH} on={on} dark={dark} glow={glow} style={{ transform: `scale(${push})` }} />}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, rgba(255,224,138,${flash}) 0%, transparent 60%)` }} />

        <div style={wide
          ? { position: 'absolute', left: 110, top: 0, height: h, width: w * 0.46, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', textAlign: 'left' }
          : { position: 'absolute', left: 0, width: w, top: y + logoH - (img ? (tall ? 30 : 60) : 0) + (tall ? 70 : 30), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 60px' }}>
          <div style={{ ...display(type, tall ? 92 : square ? 72 : wide ? 96 : 88), color: colors.gold, transform: `translateY(${(1 - name) * 40}px)`, opacity: fadeIn(frame, ON + 10, 8), textShadow: '0 0 40px rgba(255,207,77,0.35)' }}>{words.brand}</div>
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: tall ? 40 : square ? 32 : 38, color: colors.white, opacity: sub * 0.9, marginTop: 16, letterSpacing: '0.04em' }}>{words.brandSub}</div>
          {words.brandSite ? <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: tall ? 44 : square ? 34 : 42, color: colors.goldSoft, opacity: site, marginTop: 14, transform: `translateY(${(1 - site) * 16}px)` }}>{words.brandSite}</div> : null}
        </div>
        {data.clips?.end && (data.snowFrontOpacity ?? 0) > 0 ? <SnowOverlay data={{ ...data, clips: { snowOverlay: data.clips.end } }} start={30} opacity={data.snowFrontOpacity} /> : null}
      </AbsoluteFill>
    </SceneFade>
  )
}
