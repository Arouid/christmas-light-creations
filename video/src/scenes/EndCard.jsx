import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useFmt } from '../lib/format.js'
import { Snow, SnowOverlay } from '../lib/Stage.jsx'
import { Clip } from '../lib/Clip.jsx'
import { Cottage } from '../lib/Cottage.jsx'
import { WideCottage } from '../lib/WideCottage.jsx'
import { BODY, display } from '../lib/fonts.js'
import { fadeIn, pop } from '../lib/motion.js'

// The closing card: the cottage flickers on like a neon sign, snow falls, the words roll in and
// stay. Held for the rest of the video (no fade out: the last frame is the card). With endCardAsk
// (the current cut) it is the one closing screen: the campaign line ("We can keep a secret."), the
// offer and estimate pills, the phone number, the site. The ask ("Surprise someone this year.")
// sits above "She's home." in the 5:41 pm scene instead (owner: not in both places). Without it: the number, the site and the estimate pill (the pitch scene
// before it carries the ask). endCard.compact (the 6-second bumper): the line, the number and the
// site only, landing faster.
const FLICKER = [0, 0, 0.9, 0.2, 0.9, 0.1, 0.95, 0.9, 0.3, 1, 1, 1, 0.6, 1, 1, 1, 1, 1, 1, 1]

export function EndCard({ data }) {
  const frame = useCurrentFrame()
  const { w, h, fps, tall, square } = useFmt()
  const { colors, words, story, type, offer } = data
  const ask = !!data.endCardAsk
  const tagline = ask ? words.tagline || '' : ''
  const compact = ask && !!data.endCard?.compact
  const flick = data.cottageImage && data.endCardLit ? 1 : frame < FLICKER.length * 2 ? FLICKER[Math.floor(frame / 2)] : 1
  const glow = flick * (0.8 + Math.sin(frame / 9) * 0.2)
  const img = data.cottageImage
  const wide = !tall && !square && data.cottageImageWide ? data.cottageImageWide : ''
  const logoH = img ? (tall ? (ask && !compact ? 640 : 720) : square ? (ask && !compact ? 360 : 420) : 520) : tall ? 620 : square ? 360 : 440
  const logoW = logoH * (img ? 1 : 0.886)
  // When each word lands (frames into the card): the ask first, then the pills, the number, the site.
  const head = pop(frame, fps, compact ? 10 : 12, { damping: 14 })
  const pills = fadeIn(frame, 28, 10)
  const phoneAt = compact ? 28 : ask ? 42 : 16
  const phone = pop(frame, fps, phoneAt, { damping: 13 })
  const site = fadeIn(frame, compact ? 42 : ask ? 56 : 30, 10)
  const line = fadeIn(frame, 40, 10)
  const phoneSize = ask ? (tall ? 110 : square ? 92 : 104) : tall ? 124 : square ? 106 : 146
  const headSize = tall ? 92 : square ? 68 : 88
  const stack = tall || square
  const logoX = stack ? (w - logoW) / 2 : 150
  const logoY = img ? (tall ? (ask && !compact ? 300 : 120) : square ? 24 : (h - logoH) / 2 - 10) : tall ? 170 : square ? 70 : (h - logoH) / 2 - 20
  const textX = stack ? 0 : logoX + logoW + 90
  const textY = tall ? logoY + logoH + (img ? 10 : 80) : square ? logoY + logoH + (img ? -20 : 40) : h / 2 - 170
  const pill = { fontFamily: BODY, fontWeight: 600, fontSize: tall ? 34 : square ? 28 : 32, color: colors.gold, padding: '10px 26px', border: '2px solid rgba(255,207,77,0.55)', borderRadius: 999, whiteSpace: 'nowrap' }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, ${colors.navyLight}, ${colors.navy} 70%)`, opacity: fadeIn(frame, 0, 8) }}>
      {data.clips?.end ? (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.55 }}><Clip file={data.clips.end} start={data.clipStart?.end || 0} /></AbsoluteFill>
      ) : (
        <Snow />
      )}
      {wide ? <WideCottage image={wide} on={flick} glow={glow} colors={colors} /> : <Cottage image={img} x={logoX} y={logoY} height={logoH} on={flick} dark={0.22} glow={glow} />}
      <div style={{ position: 'absolute', left: wide ? 110 : stack ? 40 : textX, top: wide ? 0 : textY, height: wide ? h : 'auto', justifyContent: wide ? 'center' : 'flex-start', width: stack ? w - 80 : wide ? w * 0.5 : w - textX - 80, display: 'flex', flexDirection: 'column', alignItems: stack ? 'center' : 'flex-start', textAlign: stack ? 'center' : 'left', gap: 18, paddingBottom: wide && ask ? 120 : 0 }}>
        {ask && (
          <div style={{ ...display(type, headSize), color: colors.white, maxWidth: tall ? 760 : square ? 1000 : 720, transform: `translateY(${(1 - head) * 60}px)`, opacity: fadeIn(frame, 12, 8), textShadow: '0 4px 30px rgba(0,0,0,0.6)', marginBottom: 6 }}>
            {tagline || story.pitchLine}
          </div>
        )}
        {ask && !compact && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: stack ? 'center' : 'flex-start', opacity: pills, transform: `translateY(${(1 - pills) * 20}px)`, marginBottom: 10 }}>
            {offer?.enabled && <div style={pill}>{words.offerLine}</div>}
            <div style={pill}>{words.endLine}</div>
          </div>
        )}
        <div style={{ ...display(type, phoneSize, { lineHeight: 1, letterSpacing: '0' }), color: colors.gold, transform: `translateY(${(1 - phone) * 80}px)`, opacity: fadeIn(frame, phoneAt, 6), textShadow: `0 0 50px rgba(255,207,77,0.45)` }}>
          {words.phone}
        </div>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: ask ? (tall ? 48 : square ? 40 : 50) : tall ? 52 : square ? 44 : 56, color: colors.white, opacity: site, transform: `translateY(${(1 - site) * 20}px)` }}>{words.site}</div>
        {!ask && (
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: tall ? 44 : square ? 38 : 46, color: colors.goldSoft, opacity: line, transform: `translateY(${(1 - line) * 20}px)`, marginTop: 8, padding: '12px 32px', border: `2px solid rgba(255,207,77,0.5)`, borderRadius: 999 }}>{words.endLine}</div>
        )}
      </div>
      {data.clips?.end && (data.snowFrontOpacity ?? 0) > 0 ? <SnowOverlay data={{ ...data, clips: { snowOverlay: data.clips.end } }} start={30} opacity={data.snowFrontOpacity} /> : null}
    </AbsoluteFill>
  )
}
