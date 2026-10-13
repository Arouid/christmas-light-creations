import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Graded, SceneFade, Snow } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { BODY } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// A text thread between a customer (left, dark bubbles) and the business (right, gold bubbles,
// cottage avatar). Each message shows typing dots for about a second, then lands with a spring.
// Optional footage behind it (hands on a phone, snow, bokeh), dimmed.
export const TYPING = 28

export function Thread({ data, dur, header, messages, bgClip }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors } = data
  const font = tall ? 46 : square ? 40 : 50
  const colW = tall ? w - 140 : square ? w - 144 : 1240
  const pad = (w - colW) / 2
  const maxW = tall ? 0.8 : square ? 0.8 : 0.7
  const gap = tall ? 30 : 28
  const avatar = tall ? 72 : 76
  const top = tall ? 420 : square ? 200 : 150
  const items = messages.map((m) => ({ ...m, land: Math.round(m.at * fps) }))
  const dots = (right) => {
    const o = [0, 1, 2].map((i) => 0.35 + 0.65 * Math.max(0, Math.sin((frame - i * 4) / 4)))
    return (
      <div style={{ display: 'flex', gap: 10, padding: '22px 28px', borderRadius: 30, background: right ? colors.gold : colors.navyBubble }}>
        {o.map((v, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: right ? colors.navy : colors.white, opacity: v }} />)}
      </div>
    )
  }
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #0b1838 0%, ${colors.navy} 65%)` }}>
        {bgClip ? (
          <AbsoluteFill style={{ opacity: 0.55 }}><Graded look={data.look}><Clip file={bgClip} start={data.clipStart?.[bgClip] || 0} brightness={0.5} /></Graded><div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, transparent 30%, ${colors.navy} 100%)` }} /></AbsoluteFill>
        ) : (
          <Snow count={70} opacity={0.5} />
        )}
        <div style={{ position: 'absolute', left: 0, width: w, top: top - 90, textAlign: 'center', fontFamily: BODY, fontWeight: 500, fontSize: tall ? 32 : 30, color: '#9fb0d0', letterSpacing: '0.06em', opacity: fadeIn(frame, 4, 10) }}>{header}</div>
        <div style={{ position: 'absolute', left: pad, width: colW, top, height: h - top - (tall ? 200 : 80), display: 'flex', flexDirection: 'column', justifyContent: tall ? 'flex-start' : 'center', gap }}>
          {items.map((m, i) => {
            const right = m.from === 'us'
            const typingFrom = m.land - TYPING
            if (frame < typingFrom) return null
            const typing = frame < m.land
            const s = pop(frame, fps, m.land, { damping: 15 })
            return (
              <div key={i} style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 16 }}>
                {!right && <div style={{ width: avatar, height: avatar, borderRadius: '50%', background: '#2b3a5e', flexShrink: 0, opacity: fadeIn(frame, typingFrom, 6) }} />}
                {typing ? (
                  <div style={{ opacity: fadeIn(frame, typingFrom, 6) }}>{dots(right)}</div>
                ) : (
                  <div style={{ maxWidth: `${maxW * 100}%`, padding: '22px 32px', borderRadius: 32, borderBottomLeftRadius: right ? 32 : 8, borderBottomRightRadius: right ? 8 : 32, background: right ? colors.gold : colors.navyBubble, color: right ? colors.navy : colors.white, fontFamily: BODY, fontWeight: 500, fontSize: font, lineHeight: 1.3, transform: `scale(${0.85 + s * 0.15})`, transformOrigin: right ? 'bottom right' : 'bottom left', opacity: fadeIn(frame, m.land, 5), boxShadow: right ? '0 10px 40px rgba(255,207,77,0.25)' : '0 10px 40px rgba(0,0,0,0.4)' }}>
                    {m.text}
                  </div>
                )}
                {right && <div style={{ width: avatar, height: avatar, borderRadius: '50%', background: colors.navyMid, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fadeIn(frame, typingFrom, 6) }}><Img src={staticFile('logo/clc-cottage-color.svg')} style={{ width: avatar * 0.72, height: avatar * 0.72 }} /></div>}
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}

export function Thread1({ data, dur }) {
  return <Thread data={data} dur={dur} header={data.story.thread1Header} messages={data.story.thread1} bgClip={data.clips?.texting || ''} />
}

export function Thread2({ data, dur }) {
  return <Thread data={data} dur={dur} header={data.story.thread2Header} messages={data.story.thread2} bgClip={data.clips?.snow || ''} />
}
