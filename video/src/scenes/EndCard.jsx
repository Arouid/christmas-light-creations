import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Snow } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// Scene 8: the cottage logo flickers on like a neon sign, snow falls, the phone number rolls in
// large and stays. Held for the rest of the video (no fade out: the last frame is the card).
const FLICKER = [0, 0, 0.9, 0.2, 0.9, 0.1, 0.95, 0.9, 0.3, 1, 1, 1, 0.6, 1, 1, 1, 1, 1, 1, 1]

export function EndCard({ data }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const flick = frame < FLICKER.length * 2 ? FLICKER[Math.floor(frame / 2)] : 1
  const glow = flick * (0.8 + Math.sin(frame / 9) * 0.2)
  const logoH = tall ? 620 : square ? 360 : 440
  const logoW = logoH * 0.886
  const phone = pop(frame, fps, 16, { damping: 13 })
  const site = fadeIn(frame, 30, 10)
  const line = fadeIn(frame, 40, 10)
  const phoneSize = tall ? 124 : square ? 106 : 146
  const stack = tall || square
  const logoX = stack ? (w - logoW) / 2 : 150
  const logoY = tall ? 170 : square ? 70 : (h - logoH) / 2 - 20
  const textX = stack ? 0 : logoX + logoW + 90
  const textY = tall ? logoY + logoH + 80 : square ? logoY + logoH + 40 : h / 2 - 170
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, ${colors.navyLight}, ${colors.navy} 70%)`, opacity: fadeIn(frame, 0, 8) }}>
      {data.clips?.end ? (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.55 }}><Clip file={data.clips.end} start={data.clipStart?.end || 0} /></AbsoluteFill>
      ) : (
        <Snow />
      )}
      <div style={{ position: 'absolute', left: logoX, top: logoY, width: logoW, height: logoH, opacity: flick, filter: `drop-shadow(0 0 ${30 * glow}px rgba(240,56,238,0.55)) drop-shadow(0 0 ${60 * glow}px rgba(255,207,77,0.35))` }}>
        <Img src={staticFile('logo/clc-cottage-color.svg')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: textX, top: textY, width: stack ? w : w - textX - 80, display: 'flex', flexDirection: 'column', alignItems: stack ? 'center' : 'flex-start', textAlign: stack ? 'center' : 'left', gap: 18 }}>
        <div style={{ ...display(type, phoneSize, { lineHeight: 1, letterSpacing: '0' }), color: colors.gold, transform: `translateY(${(1 - phone) * 80}px)`, opacity: fadeIn(frame, 16, 6), textShadow: `0 0 50px rgba(255,207,77,0.45)` }}>
          {words.phone}
        </div>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: tall ? 52 : square ? 44 : 56, color: colors.white, opacity: site, transform: `translateY(${(1 - site) * 20}px)` }}>{words.site}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: tall ? 44 : square ? 38 : 46, color: colors.goldSoft, opacity: line, transform: `translateY(${(1 - line) * 20}px)`, marginTop: 8, padding: '12px 32px', border: `2px solid rgba(255,207,77,0.5)`, borderRadius: 999 }}>{words.endLine}</div>
      </div>
    </AbsoluteFill>
  )
}
