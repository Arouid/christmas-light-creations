import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { SceneFade, Sparkles } from '../lib/Stage.jsx'
import { DISPLAY, BODY } from '../lib/fonts.js'
import { Icon } from '../lib/Icons.jsx'
import { fadeIn, pop } from '../lib/motion.js'

// Scene 6: "South Houston" over a dotted map grid with a radar sweep; the towns pop in as glowing
// pills, grouped by region, 2 frames apart.
export function Areas({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words } = data
  const title = pop(frame, fps, 0)
  const pad = square ? 72 : tall ? 60 : 110
  const pillFont = tall ? 36 : square ? 28 : 34
  const regionFont = tall ? 30 : square ? 24 : 28
  const titleSize = tall ? 110 : square ? 86 : 110
  let n = 0
  const ringR = interpolate(frame % 60, [0, 60], [40, Math.max(w, h) * 0.7])
  const ringO = interpolate(frame % 60, [0, 60], [0.35, 0])
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ background: colors.navy }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(159,176,208,0.22) 1.5px, transparent 1.5px)', backgroundSize: '44px 44px' }} />
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={w / 2} cy={tall ? 520 : h * 0.3} r={ringR} fill="none" stroke={colors.gold} strokeWidth="3" opacity={ringO} />
          <circle cx={w / 2} cy={tall ? 520 : h * 0.3} r={ringR * 0.5} fill="none" stroke={colors.gold} strokeWidth="2" opacity={ringO * 0.7} />
        </svg>
        <Sparkles count={25} seed="areas" opacity={0.5} area={{ w, h }} />
        <div style={{ position: 'absolute', left: 0, width: w, top: tall ? 330 : square ? 110 : 140, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${0.8 + title * 0.2})`, opacity: fadeIn(frame, 0, 6) }}>
          <div style={{ color: colors.gold }}><Icon name="pin" size={tall ? 96 : 80} /></div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: titleSize, color: colors.gold, lineHeight: 1, textShadow: `0 0 40px rgba(255,207,77,0.4)` }}>{words.areasTitle}</div>
        </div>
        <div style={{ position: 'absolute', left: pad, right: pad, top: tall ? 640 : square ? 330 : 380, display: 'flex', flexDirection: 'column', gap: tall ? 34 : square ? 20 : 28 }}>
          {words.areas.map((g, gi) => (
            <div key={gi} style={{ display: 'flex', flexDirection: tall || square ? 'column' : 'row', alignItems: tall || square ? 'flex-start' : 'center', gap: tall ? 14 : 20 }}>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: regionFont, color: '#9fb0d0', letterSpacing: '0.08em', textTransform: 'uppercase', width: tall || square ? 'auto' : 250, flexShrink: 0, opacity: fadeIn(frame, 8 + gi * 12, 8) }}>{g.region}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: tall ? 14 : 12 }}>
                {g.towns.map((t, ti) => {
                  const delay = 10 + (n++) * 2.5
                  const s = pop(frame, fps, delay)
                  return (
                    <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: tall ? '12px 24px' : '8px 20px', borderRadius: 999, background: 'rgba(18,33,74,0.9)', border: `2px solid ${colors.gold}`, color: colors.white, fontFamily: BODY, fontWeight: 600, fontSize: pillFont, transform: `scale(${s})`, opacity: fadeIn(frame, delay, 4), boxShadow: `0 0 ${16 * s}px rgba(255,207,77,0.35)` }}>
                      <span style={{ width: 12, height: 12, borderRadius: 6, background: colors.gold, boxShadow: `0 0 10px ${colors.gold}` }} />
                      {t}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
