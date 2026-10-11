import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useFmt } from '../lib/format.js'
import { SceneFade } from '../lib/Stage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { Icon } from '../lib/Icons.jsx'
import { fadeIn, pop } from '../lib/motion.js'

// Scene 6: a map. Galveston Bay drawn as water, the towns served at their real positions, each
// lighting up with its name; Pearland (home) gets the pin. Title "South Houston".
export function Areas({ data, dur }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, type } = data
  const towns = words.areas
  // Map area and projection (equirectangular, longitude scaled by cos(latitude)).
  const map = tall ? { x: 40, y: 560, w: w - 80, h: 1180 } : square ? { x: 40, y: 250, w: w - 80, h: 790 } : { x: 620, y: 60, w: w - 680, h: h - 120 }
  const lons = towns.map((t) => t.lon).concat(words.landmarks.map((l) => l.lon))
  const lats = towns.map((t) => t.lat).concat(words.landmarks.map((l) => l.lat))
  const lon0 = Math.min(...lons) - 0.06, lon1 = Math.max(...lons) + 0.06
  const lat0 = Math.min(...lats) - 0.05, lat1 = Math.max(...lats) + 0.05
  const k = Math.cos((29.5 * Math.PI) / 180)
  const scale = Math.min(map.w / ((lon1 - lon0) * k), map.h / (lat1 - lat0))
  const ox = map.x + (map.w - (lon1 - lon0) * k * scale) / 2
  const oy = map.y + (map.h - (lat1 - lat0) * scale) / 2
  const px = (lon, lat) => [ox + (lon - lon0) * k * scale, oy + (lat1 - lat) * scale]
  const labelSize = tall ? 32 : square ? 24 : 28
  const bay = words.bay.map(([lon, lat]) => px(lon, lat).join(',')).join(' ')
  const title = pop(frame, fps, 0)
  const titleBox = tall ? { x: 0, y: 300, w, align: 'center' } : square ? { x: 0, y: 90, w, align: 'center' } : { x: 90, y: h / 2 - 170, w: 520, align: 'flex-start' }
  const mapIn = fadeIn(frame, 2, 14)
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${colors.navyLight}, ${colors.navy} 70%)` }}>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, opacity: mapIn }}>
          <defs>
            <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="rgba(159,176,208,0.18)" /></pattern>
            <filter id="waterBlur"><feGaussianBlur stdDeviation="3" /></filter>
            <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <rect x={map.x} y={map.y} width={map.w} height={map.h} fill="url(#grid)" />
          <polygon points={bay} fill="rgba(60,110,190,0.28)" stroke="rgba(120,170,240,0.5)" strokeWidth="2" filter="url(#waterBlur)" />
          {words.landmarks.map((l) => { const [x, y] = px(l.lon, l.lat); return (
            <g key={l.name} opacity={0.55}>
              <circle cx={x} cy={y} r="7" fill="#9fb0d0" />
              <text x={x + 16} y={y + 9} fill="#9fb0d0" fontFamily={BODY} fontSize={labelSize - 2} fontWeight="500">{l.name}</text>
            </g>
          ) })}
          {towns.map((t, i) => {
            const [x, y] = px(t.lon, t.lat)
            const delay = 10 + i * 2.6
            const s = pop(frame, fps, delay)
            const o = fadeIn(frame, delay, 4)
            const side = t.side || 'r'
            const dx = side.includes('l') ? -16 : side.includes('r') ? 16 : 0
            const dy = side.includes('a') ? -18 : side.includes('b') ? 18 + labelSize * 0.7 : labelSize * 0.35
            const anchor = side.includes('l') ? 'end' : side.includes('r') ? 'start' : 'middle'
            const r = t.home ? 11 : 8
            return (
              <g key={t.name} opacity={o} transform={`translate(${x} ${y}) scale(${0.4 + s * 0.6}) translate(${-x} ${-y})`}>
                <circle cx={x} cy={y} r={r * 2.2} fill={colors.gold} opacity="0.35" filter="url(#dotGlow)" />
                <circle cx={x} cy={y} r={r} fill={t.home ? colors.gold : '#fff4c8'} stroke={colors.gold} strokeWidth="2" />
                <text x={x + dx} y={y + dy} fill={t.home ? colors.gold : colors.white} fontFamily={BODY} fontSize={t.home ? labelSize + 4 : labelSize} fontWeight={t.home ? 700 : 500} textAnchor={anchor} style={{ paintOrder: 'stroke', stroke: colors.navy, strokeWidth: 6, strokeLinejoin: 'round' }}>{t.name}</text>
              </g>
            )
          })}
        </svg>
        {(() => { const home = towns.find((t) => t.home); if (!home) return null; const [x, y] = px(home.lon, home.lat); const b = pop(frame, fps, 10); return (
          <div style={{ position: 'absolute', left: x - 30, top: y - 78 - (1 - b) * 40, color: colors.gold, opacity: b, filter: `drop-shadow(0 0 12px ${colors.gold})` }}><Icon name="pin" size={60} /></div>
        ) })()}
        <div style={{ position: 'absolute', left: titleBox.x, top: titleBox.y, width: titleBox.w, display: 'flex', flexDirection: 'column', alignItems: titleBox.align, textAlign: titleBox.align === 'center' ? 'center' : 'left', transform: `scale(${0.85 + title * 0.15})`, opacity: fadeIn(frame, 0, 6) }}>
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: tall ? 34 : square ? 26 : 30, color: '#9fb0d0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{words.areasSub}</div>
          <div style={{ ...display(type, tall ? 120 : square ? 92 : 104, { lineHeight: 1 }), color: colors.gold, textShadow: '0 0 40px rgba(255,207,77,0.35)' }}>{words.areasTitle}</div>
          {!tall && !square && (
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: colors.white, marginTop: 26, opacity: interpolate(frame, [40, 56], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{towns.length} towns, one crew</div>
          )}
        </div>
      </AbsoluteFill>
    </SceneFade>
  )
}
