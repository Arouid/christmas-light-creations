import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { SceneFade } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 4: the site's design tool, full frame. The customer's house photo fills the canvas; a
// panel lists what to light and the bulb colour. The cursor picks "Cool white", then "Red", and
// the bulbs on the photo change colour each time. Then the headline.
const CLICK1 = 34
const CLICK2 = 72

export function DesignOnline({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const photo = data.photos.design
  const stack = tall
  const bar = tall ? 96 : 64
  const panelW = square ? 300 : 380
  const panelH = 300
  const canvas = stack ? { x: 0, y: bar, w, h: 1150 } : { x: panelW, y: bar, w: w - panelW, h: h - bar }
  const panel = stack ? { x: 0, y: bar + canvas.h, w, h: panelH } : { x: 0, y: bar, w: panelW, h: h - bar }
  const ui = pop(frame, fps, 0, { damping: 16 })
  const toCool = progress(frame, CLICK1, CLICK1 + 10)
  const toRed = progress(frame, CLICK2, CLICK2 + 10)
  const current = frame < CLICK1 ? 0 : frame < CLICK2 ? 1 : 2
  const chipH = tall ? 84 : 64
  const chipY0 = stack ? panel.y + 150 : panel.y + 430
  const chipX = (i) => (stack ? 60 + i * (chipH + 300) : 40)
  const chipYi = (i) => (stack ? chipY0 : chipY0 + i * (chipH + 18))
  const c1 = pop(frame, fps, 8, { damping: 18, stiffness: 80 })
  const c2 = pop(frame, fps, CLICK1 + 14, { damping: 18, stiffness: 80 })
  const start = stack ? [w * 0.7, canvas.y + canvas.h * 0.7] : [canvas.x + canvas.w * 0.55, canvas.y + canvas.h * 0.6]
  const p1 = [chipX(1) + 60, chipYi(1) + chipH / 2]
  const p2 = [chipX(2) + 60, chipYi(2) + chipH / 2]
  const curX = frame < CLICK1 + 14 ? interpolate(c1, [0, 1], [start[0], p1[0]]) : interpolate(c2, [0, 1], [p1[0], p2[0]])
  const curY = frame < CLICK1 + 14 ? interpolate(c1, [0, 1], [start[1], p1[1]]) : interpolate(c2, [0, 1], [p1[1], p2[1]])
  const ripple = (at) => progress(frame, at, at + 12)
  const title = pop(frame, fps, 92)
  const titleSize = tall ? 88 : square ? 66 : 84
  const imgStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${photo.focus[0] * 100}% ${photo.focus[1] * 100}%` }
  const check = (on) => (
    <span style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${on ? colors.gold : '#3a4a73'}`, background: on ? colors.gold : 'transparent', color: colors.navy, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, flexShrink: 0 }}>{on ? '✓' : ''}</span>
  )
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ background: colors.navy, transform: `scale(${0.96 + ui * 0.04})`, opacity: fadeIn(frame, 0, 6) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: bar, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', fontFamily: BODY, fontSize: tall ? 30 : 24, color: '#9fb0d0', background: colors.navyLight, borderBottom: `1px solid ${colors.navyMid}` }}>
          {!tall && (<><span style={{ width: 14, height: 14, borderRadius: 7, background: '#ff5f57' }} /><span style={{ width: 14, height: 14, borderRadius: 7, background: '#febc2e' }} /><span style={{ width: 14, height: 14, borderRadius: 7, background: '#28c840' }} /></>)}
          <span style={{ marginLeft: tall ? 0 : 20, padding: '8px 18px', borderRadius: 999, background: colors.navyMid, flex: 1, textAlign: tall ? 'center' : 'left' }}>{words.designUrl}</span>
        </div>
        <div style={{ position: 'absolute', left: canvas.x, top: canvas.y, width: canvas.w, height: canvas.h, overflow: 'hidden', background: '#000' }}>
          <Img src={staticFile(`photos/${photo.number}.jpg`)} style={imgStyle} />
          <Img src={staticFile(`photos/${photo.number}-cool.jpg`)} style={{ ...imgStyle, opacity: toCool * (1 - toRed) }} />
          <Img src={staticFile(`photos/${photo.number}-red.jpg`)} style={{ ...imgStyle, opacity: toRed }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: `linear-gradient(to top, rgba(5,11,26,0.9), transparent)`, opacity: title }} />
        </div>
        <div style={{ position: 'absolute', left: panel.x, top: panel.y, width: panel.w, height: panel.h, background: colors.navyLight, borderRight: stack ? 'none' : `1px solid ${colors.navyMid}`, borderTop: stack ? `1px solid ${colors.navyMid}` : 'none', padding: stack ? '26px 60px' : '34px 40px', color: colors.white, fontFamily: BODY, display: 'flex', flexDirection: stack ? 'row' : 'column', gap: stack ? 60 : 0, alignItems: stack ? 'flex-start' : 'stretch' }}>
          <div style={{ flex: stack ? '0 0 420px' : 'none' }}>
            <div style={{ ...display(type, tall ? 44 : square ? 34 : 40), color: colors.gold, marginBottom: stack ? 18 : 26 }}>{words.designPanelTitle}</div>
            {words.designOptions.map((o, i) => (
              <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: tall ? 32 : square ? 24 : 28, fontWeight: 500, marginBottom: stack ? 12 : 18, opacity: fadeIn(frame, 4 + i * 3, 6) }}>
                {check(i === 0)}{o}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {!stack && <div style={{ fontSize: square ? 22 : 24, color: '#9fb0d0', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '26px 0 14px' }}>Colour</div>}
            <div style={{ display: 'flex', flexDirection: stack ? 'row' : 'column', gap: stack ? 24 : 18, flexWrap: 'wrap' }}>
              {words.designColours.map((c, i) => {
                const on = current === i
                const at = i === 1 ? CLICK1 : CLICK2
                const pressed = on && i > 0 && frame >= at && frame < at + 6
                return (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 16, height: chipH, padding: '0 22px 0 14px', borderRadius: 999, border: `2px solid ${on ? colors.gold : '#3a4a73'}`, background: on ? 'rgba(255,207,77,0.14)' : 'transparent', fontSize: tall ? 30 : square ? 24 : 28, fontWeight: 600, transform: `scale(${pressed ? 0.95 : 1})`, opacity: fadeIn(frame, 10 + i * 3, 6), whiteSpace: 'nowrap' }}>
                    <span style={{ width: chipH - 24, height: chipH - 24, borderRadius: '50%', background: c.swatch, boxShadow: on ? `0 0 16px ${c.swatch}` : 'none' }} />{c.label}
                  </div>
                )
              })}
            </div>
            {!stack && (
              <div style={{ height: 64, borderRadius: 999, background: colors.gold, color: colors.navy, fontWeight: 700, fontSize: square ? 19 : 26, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: square ? 24 : 40, right: square ? 24 : 40, bottom: 40, opacity: fadeIn(frame, 20, 8) }}>{words.designButton}</div>
            )}
          </div>
        </div>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[CLICK1, CLICK2].map((at, i) => { const r = ripple(at); return r > 0 && r < 1 ? <circle key={i} cx={i === 0 ? p1[0] : p2[0]} cy={i === 0 ? p1[1] : p2[1]} r={10 + r * 50} fill="none" stroke={colors.white} strokeWidth="3" opacity={1 - r} /> : null })}
          {tall ? (
            <circle cx={curX} cy={curY} r="22" fill="rgba(255,255,255,0.55)" stroke="#fff" strokeWidth="3" />
          ) : (
            <path d={`M${curX} ${curY} l0 30 l8 -7 l6 14 l7 -3 l-6 -14 l11 -1 z`} fill="#fff" stroke={colors.navy} strokeWidth="1.5" />
          )}
        </svg>
        <div style={{ position: 'absolute', left: canvas.x, width: canvas.w, top: canvas.y + canvas.h - (tall ? 190 : square ? 250 : 170), padding: `0 ${square ? 48 : 72}px`, display: 'flex', flexDirection: 'column', alignItems: stack ? 'center' : 'flex-start', textAlign: stack ? 'center' : 'left' }}>
          <div style={{ ...display(type, titleSize), color: colors.gold, transform: `translateY(${(1 - title) * 60}px)`, opacity: fadeIn(frame, 92, 8), textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}>
            {words.designTitle}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
