import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { alongPolyline, coverRect, TALL_WINDOW, useFmt } from '../lib/format.js'
import { SceneFade, Sparkles } from '../lib/Stage.jsx'
import { DISPLAY, BODY } from '../lib/fonts.js'
import { fadeIn, pop, progress } from '../lib/motion.js'

// Scene 4: a mock of the site's /design/ page. A house photo loads in a phone (tall) or a browser
// window (wide, square); a cursor taps "Add roofline"; a light string draws itself bulb by bulb
// along the roofline; a "Looks like this" pill pops; the headline lands.
const CLICK = 28
const DRAW_FROM = 32
const DRAW_TO = 96

export function DesignOnline({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words } = data
  const photo = data.photos.design
  const phone = tall
  // Device box
  const dev = phone
    ? { x: (w - 720) / 2, y: 70, w: 720, h: 1180, radius: 56, bar: 110 }
    : square
      ? { x: 90, y: 70, w: 900, h: 600, radius: 28, bar: 64 }
      : { x: 96, y: 80, w: 1150, h: 760, radius: 28, bar: 64 }
  const devPop = pop(frame, fps, 0, { damping: 16 })
  const photoBox = { w: dev.w, h: dev.h - dev.bar - (phone ? 150 : 110) }
  const rect = coverRect(photo.aspect, photoBox.w, photoBox.h, photo.focus)
  const toPx = ([fx, fy]) => [rect.x + fx * rect.w, rect.y + fy * rect.h]
  const lines = photo.roofline.map((pl) => pl.map(toPx))
  const totalLen = lines.reduce((s, pl) => s + alongPolyline(pl, 1000).total, 0)
  const draw = progress(frame, DRAW_FROM, DRAW_TO)
  const drawn = draw * totalLen
  // Button + cursor
  const btn = { x: 40, y: photoBox.h + 30, w: phone ? 360 : 300, h: phone ? 92 : 68 }
  const cur = pop(frame, fps, 6, { damping: 18, stiffness: 90 })
  const curX = interpolate(cur, [0, 1], [dev.w - 60, btn.x + btn.w * 0.55])
  const curY = interpolate(cur, [0, 1], [dev.h - 40, btn.y + btn.h * 0.6])
  const ripple = progress(frame, CLICK, CLICK + 14)
  const pressed = frame >= CLICK
  const pill = pop(frame, fps, DRAW_TO + 2)
  // Headline
  const title = pop(frame, fps, 54)
  const textTop = phone ? TALL_WINDOW - 60 : dev.y + dev.h + (square ? 30 : 36)
  const titleSize = phone ? 92 : square ? 70 : 84
  let offset = 0
  const bulbEls = []
  const pathEls = []
  lines.forEach((pl, li) => {
    const { points, total } = alongPolyline(pl, 24)
    const local = Math.max(0, Math.min(total, drawn - offset))
    pathEls.push(
      <polyline key={`p${li}`} points={pl.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,224,138,0.7)" strokeWidth="4" strokeDasharray={total} strokeDashoffset={total - local} />,
    )
    points.forEach((pt, i) => {
      if (pt.d > local) return
      const age = frame - (DRAW_FROM + (offset + pt.d) / totalLen * (DRAW_TO - DRAW_FROM))
      const s = Math.min(1, age / 4)
      bulbEls.push(
        <g key={`b${li}-${i}`} transform={`translate(${pt.x} ${pt.y}) scale(${0.3 + s * 0.7})`}>
          <circle r="15" fill={colors.goldSoft} opacity="0.45" filter="url(#bulbGlow)" />
          <circle r="5.5" fill="#fff6d6" />
        </g>,
      )
    })
    offset += total
  })
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse at 50% 30%, ${colors.navyLight}, ${colors.navy} 70%)` }}
      >
        <Sparkles count={30} seed="design" opacity={0.5} area={{ w, h }} />
        <div style={{ position: 'absolute', left: dev.x, top: dev.y, width: dev.w, height: dev.h, borderRadius: dev.radius, background: '#0b1733', boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 ${phone ? 10 : 2}px #1c2f63`, overflow: 'hidden', transform: `scale(${0.85 + devPop * 0.15})`, opacity: fadeIn(frame, 0, 6) }}>
          <div style={{ height: dev.bar, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', fontFamily: BODY, fontSize: phone ? 30 : 24, color: '#9fb0d0', background: '#0a1530', borderBottom: '1px solid #1c2f63' }}>
            {!phone && (<><span style={{ width: 14, height: 14, borderRadius: 7, background: '#ff5f57' }} /><span style={{ width: 14, height: 14, borderRadius: 7, background: '#febc2e' }} /><span style={{ width: 14, height: 14, borderRadius: 7, background: '#28c840' }} /></>)}
            <span style={{ marginLeft: phone ? 0 : 20, padding: '8px 18px', borderRadius: 999, background: '#12214a', flex: 1, textAlign: phone ? 'center' : 'left' }}>{words.designUrl}</span>
          </div>
          <div style={{ position: 'relative', width: photoBox.w, height: photoBox.h, overflow: 'hidden', background: '#000' }}>
            <Img
              src={staticFile(`photos/${photo.number}.jpg`)}
              style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, filter: `brightness(${0.32 + draw * 0.5}) saturate(${0.35 + draw * 0.65})` }}
            />
            <svg width={photoBox.w} height={photoBox.h} style={{ position: 'absolute', inset: 0 }}>
              <defs><filter id="bulbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter></defs>
              {pathEls}
              {bulbEls}
            </svg>
          </div>
          <div style={{ position: 'absolute', left: btn.x, top: btn.y, width: btn.w, height: btn.h, borderRadius: 999, background: pressed ? colors.goldSoft : colors.gold, color: colors.navy, fontFamily: BODY, fontWeight: 700, fontSize: phone ? 34 : 26, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pressed && frame < CLICK + 6 ? 0.94 : 1})` }}>
            + {words.designButton}
          </div>
          <div style={{ position: 'absolute', right: 40, top: btn.y + btn.h / 2 - (phone ? 36 : 28), height: phone ? 72 : 56, padding: phone ? '0 30px' : '0 24px', borderRadius: 999, background: colors.green, color: colors.navy, fontFamily: BODY, fontWeight: 700, fontSize: phone ? 32 : 24, display: 'flex', alignItems: 'center', gap: 10, transform: `scale(${pill})`, opacity: pill }}>
            ✓ {words.designDone}
          </div>
          <svg width={dev.w} height={dev.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {ripple > 0 && ripple < 1 && <circle cx={curX} cy={curY} r={10 + ripple * 50} fill="none" stroke={colors.white} strokeWidth="3" opacity={1 - ripple} />}
            {phone ? (
              <circle cx={curX} cy={curY} r="22" fill="rgba(255,255,255,0.55)" stroke="#fff" strokeWidth="3" />
            ) : (
              <path d={`M${curX} ${curY} l0 28 l7 -6 l6 13 l6 -3 l-6 -13 l10 -1 z`} fill="#fff" stroke={colors.navy} strokeWidth="1.5" />
            )}
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 0, width: w, top: textTop, padding: `0 ${square ? 72 : 96}px`, display: 'flex', flexDirection: 'column', alignItems: phone ? 'center' : 'flex-start', textAlign: phone ? 'center' : 'left' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: titleSize, lineHeight: 1.05, color: colors.gold, transform: `translateY(${(1 - title) * 60}px)`, opacity: fadeIn(frame, 54, 8), maxWidth: phone ? 900 : 1500 }}>
            {words.designTitle}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
