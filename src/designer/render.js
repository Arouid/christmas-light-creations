// Draws a design onto a canvas 2D context sized to the photo's natural pixels:
// the photo, a night tint, glowing bulbs, decorations, and (in the editor)
// handles. Browser only (uses canvas).
import { MOVE_HANDLE_OFFSET, boxCorners, sampleAlong, shapePoints, strandCenter } from './geometry.js'
import { COLORS, STYLES, DECORATIONS, pxPerFoot } from './model.js'
import { bulbColor } from './stats.js'

// Glow sprites are cached per color and size: drawing hundreds of gradients
// per frame is slow, stamping images is fast.
const sprites = new Map()
function glowSprite(hex, r, night) {
  const key = `${hex}|${Math.round(r * 2)}|${Math.round(night * 10)}`
  let c = sprites.get(key)
  if (c) return c
  const R = Math.ceil(r * (4 + 4 * night))
  c = document.createElement('canvas')
  c.width = c.height = R * 2
  const g = c.getContext('2d')
  // Halo: soft light around the bulb, wider and stronger at night.
  const halo = g.createRadialGradient(R, R, r * 0.5, R, R, R)
  const a = 0.3 + 0.6 * night
  halo.addColorStop(0, hexA(hex, a))
  halo.addColorStop(0.18, hexA(hex, a * 0.5))
  halo.addColorStop(0.45, hexA(hex, a * 0.14))
  halo.addColorStop(1, hexA(hex, 0))
  g.fillStyle = halo
  g.fillRect(0, 0, R * 2, R * 2)
  // Bulb: white-hot center fading into the bulb color, like a real lit bulb.
  const core = g.createRadialGradient(R, R, 0, R, R, r)
  core.addColorStop(0, '#ffffff')
  core.addColorStop(0.35, mix(hex, '#ffffff', 0.55))
  core.addColorStop(0.8, hexA(hex, 1))
  core.addColorStop(1, hexA(hex, 0.6))
  g.fillStyle = core
  g.beginPath()
  g.arc(R, R, r, 0, Math.PI * 2)
  g.fill()
  if (sprites.size > 300) sprites.clear()
  sprites.set(key, c)
  return c
}

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
function hexA(hex, a) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function mix(a, b, t) {
  const x = rgb(a)
  const y = rgb(b)
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`
}

// Average color of a strand (multicolor washes read as a soft mixed glow).
function strandTint(strand) {
  const cols = (strand.colors?.length ? strand.colors : ['warm']).map((k) => rgb(COLORS[k]?.hex ?? '#ffcf70'))
  return cols.reduce((s, c) => s.map((v, i) => v + c[i] / cols.length), [0, 0, 0]).map(Math.round)
}

// Light spill: what makes lights look real at night is the glow they throw
// on the roof and wall around them. Drawn as a wide, blurred stroke on its
// own layer, then screened over the photo.
let washLayer = null
function drawWash(ctx, design, night) {
  if (night < 0.15 || !design.strands.length) return
  const { width: W, height: H } = design.photo
  washLayer ??= document.createElement('canvas')
  if (washLayer.width !== W || washLayer.height !== H) { washLayer.width = W; washLayer.height = H }
  const g = washLayer.getContext('2d')
  g.clearRect(0, 0, W, H)
  const ppf = pxPerFoot(design)
  g.filter = `blur(${Math.max(4, ppf * 0.9)}px)`
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const s of design.strands) {
    if (s.points.length < 2) continue
    const [r, gg, b] = strandTint(s)
    g.strokeStyle = `rgba(${r},${gg},${b},0.7)`
    g.lineWidth = ppf * (s.style === 'icicle' ? 2.2 : 1.6) * (s.size || 1)
    g.beginPath()
    // Slightly below the line: eave lights mostly light the wall under them.
    const drop = ppf * (s.style === 'icicle' ? 0.9 : 0.35)
    s.points.forEach(([x, y], i) => (i ? g.lineTo(x, y + drop) : g.moveTo(x, y + drop)))
    g.stroke()
  }
  g.filter = 'none'
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.35 + 0.65 * night
  ctx.drawImage(washLayer, 0, 0)
  ctx.restore()
}

const hash = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }

function stamp(ctx, hex, x, y, r, night) {
  const s = glowSprite(hex, r, night)
  ctx.drawImage(s, x - s.width / 2, y - s.height / 2)
}

function drawStrand(ctx, strand, design, night) {
  const ppf = pxPerFoot(design)
  const st = STYLES[strand.style] ?? STYLES.c9
  const step = Math.max(2, ((strand.spacingIn || st.spacingIn) / 12) * ppf)
  // Drawn a bit larger than true size: a lit bulb looks bigger than it is.
  const r = Math.max(1.5, (st.size / 12) * ppf * 0.7 * (strand.size || 1))
  const pts = sampleAlong(strand.points, step, Boolean(strand.shape))
  // Wire: faint dark line under the bulbs (reads as the cord in daylight).
  if (night < 0.9 && strand.style !== 'permanent') {
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = `rgba(20,30,20,${0.5 * (1 - night)})`
    ctx.lineWidth = Math.max(1, r * 0.35)
    ctx.beginPath()
    strand.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
    ctx.restore()
  }
  pts.forEach((p, i) => {
    const hex = COLORS[bulbColor(strand, i)]?.hex ?? '#ffcf70'
    if (strand.style === 'icicle') {
      // Drops of varying length hanging straight down.
      const drop = (0.6 + hash(i + strand.points.length) * 1.2) * ppf
      const dStep = Math.max(2, (3 / 12) * ppf)
      for (let t = 0; t <= drop; t += dStep) stamp(ctx, hex, p.x, p.y + t, r, night)
    } else {
      stamp(ctx, hex, p.x, p.y, r, night)
    }
  })
}

// Vector decorations, sized in feet so they scale with the house. Drawn in
// two passes: 'body' (greenery, bows: physical things, darkened with the
// photo at night) and 'lights' (the parts that glow).
function drawDecoration(ctx, d, design, night, pass) {
  const ppf = pxPerFoot(design)
  const size = (DECORATIONS[d.type]?.sizeFt ?? 2) * ppf * (d.size || 1)
  ctx.save()
  ctx.translate(d.x, d.y)
  ctx.rotate(((d.rotation || 0) * Math.PI) / 180)
  const R = size / 2
  if (d.type === 'wreath' && pass === 'lights') {
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.2
      stamp(ctx, COLORS.warm.hex, Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72, Math.max(1, R * 0.045), night)
    }
  } else if (d.type === 'wreath') {
    ctx.lineWidth = R * 0.42
    ctx.strokeStyle = '#1d5b2c'
    ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = R * 0.12
    ctx.strokeStyle = '#2f8a43'
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2
      ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72, R * 0.16, a, a + 2); ctx.stroke()
    }
    drawBow(ctx, 0, R * 0.62, R * 0.55)
  } else if (d.type === 'bow') {
    if (pass === 'body') drawBow(ctx, 0, 0, R)
  } else if (pass !== 'lights') {
    // star and snowflake are all light: nothing in the body pass
  } else if (d.type === 'star') {
    ctx.globalCompositeOperation = 'lighter'
    stamp(ctx, COLORS.gold.hex, 0, 0, R * 0.35, night)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffe28a'
    ctx.beginPath()
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? R * 0.42 : R
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath(); ctx.fill()
  } else if (d.type === 'snowflake') {
    ctx.strokeStyle = '#eaf6ff'
    ctx.lineWidth = Math.max(1.5, R * 0.08)
    ctx.lineCap = 'round'
    for (let k = 0; k < 6; k++) {
      ctx.save(); ctx.rotate((k * Math.PI) / 3)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R)
      ctx.moveTo(0, -R * 0.55); ctx.lineTo(-R * 0.22, -R * 0.75)
      ctx.moveTo(0, -R * 0.55); ctx.lineTo(R * 0.22, -R * 0.75)
      ctx.stroke(); ctx.restore()
    }
    ctx.globalCompositeOperation = 'lighter'
    stamp(ctx, COLORS.cool.hex, 0, 0, R * 0.2, night)
  }
  ctx.restore()
}

function drawBow(ctx, x, y, R) {
  ctx.fillStyle = '#c4122f'
  ctx.beginPath(); ctx.ellipse(x - R * 0.42, y, R * 0.42, R * 0.26, -0.3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(x + R * 0.42, y, R * 0.42, R * 0.26, 0.3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(x - R * 0.1, y); ctx.lineTo(x - R * 0.35, y + R * 0.8); ctx.lineTo(x - R * 0.05, y + R * 0.7); ctx.fill()
  ctx.beginPath(); ctx.moveTo(x + R * 0.1, y); ctx.lineTo(x + R * 0.35, y + R * 0.8); ctx.lineTo(x + R * 0.05, y + R * 0.7); ctx.fill()
  ctx.fillStyle = '#8f0c21'
  ctx.beginPath(); ctx.arc(x, y, R * 0.14, 0, Math.PI * 2); ctx.fill()
}

// opts: { before: photo only, handles: editor overlay, selectedId, draft: [x,y][] }
export function renderDesign(ctx, design, img, opts = {}) {
  const { width: W, height: H } = design.photo
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  if (img) ctx.drawImage(img, 0, 0, W, H)
  if (!opts.before) {
    const night = Math.max(0, Math.min(1, design.night ?? 0.75))
    design.decorations.forEach((d) => drawDecoration(ctx, d, design, night, 'body'))
    // Night: darken and cool the photo so the lights carry the scene.
    if (night > 0) {
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = `rgba(${Math.round(255 - 215 * night)},${Math.round(255 - 205 * night)},${Math.round(255 - 150 * night)},1)`
      ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'source-over'
    drawWash(ctx, design, night)
    ctx.globalCompositeOperation = 'lighter'
    design.strands.forEach((s) => drawStrand(ctx, s, design, night))
    ctx.globalCompositeOperation = 'source-over'
    design.decorations.forEach((d) => drawDecoration(ctx, d, design, night, 'lights'))
  }
  ctx.globalCompositeOperation = 'source-over'
  if (opts.handles) drawHandles(ctx, design, opts)
  ctx.restore()
}

function drawHandles(ctx, design, { selectedId, selectedPoint, draft, measure, draftShape, pxPerScreenPx }) {
  // One screen pixel in photo pixels, so handles stay the same size when zoomed.
  const u = pxPerScreenPx ?? Math.max(design.photo.width, design.photo.height) / 900
  const line = (pts, color, w, dash) => {
    if (pts.length < 2) return
    ctx.setLineDash(dash ? [6 * u, 5 * u] : [])
    ctx.strokeStyle = color
    ctx.lineWidth = w * u
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
  const dot = ([x, y], color, r) => { ctx.setLineDash([]); ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.arc(x, y, r * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
  for (const s of design.strands) {
    const sel = s.id === selectedId
    line(s.points, sel ? 'rgba(255,207,77,0.95)' : 'rgba(255,255,255,0.35)', sel ? 2.5 : 1.2, !sel)
    if (sel && s.shape) {
      line([...boxCorners(s.shape), boxCorners(s.shape)[0]], 'rgba(255,207,77,0.6)', 1.2, true)
      boxCorners(s.shape).forEach((p) => dot(p, '#ffcf4d', 8))
    } else if (sel) {
      s.points.forEach((p, i) => (i === selectedPoint ? dot(p, '#ff5fb4', 10) : dot(p, '#ffcf4d', 7)))
      // Move-all handle: a ring with a dot in the middle of the pins.
      const [cx, cy] = strandCenter(s.points, MOVE_HANDLE_OFFSET * u)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(5,11,26,0.75)'
      ctx.strokeStyle = '#ffcf4d'
      ctx.lineWidth = 2 * u
      ctx.beginPath(); ctx.arc(cx, cy, 13 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath()
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * 4 * u, cy + dy * 4 * u); ctx.lineTo(cx + dx * 9 * u, cy + dy * 9 * u) }
      ctx.stroke()
    }
  }
  for (const d of design.decorations) {
    if (d.id === selectedId) dot([d.x, d.y], '#ffcf4d', 8)
  }
  if (draftShape) line(shapePoints(draftShape), 'rgba(110,231,255,0.95)', 2.5)
  if (draft?.length) {
    line(draft, 'rgba(110,231,255,0.95)', 2.5)
    draft.forEach((p) => dot(p, '#6ee7ff', 6))
  }
  const ref = measure ?? design.scale?.ref
  if (ref?.a && ref?.b) {
    line([ref.a, ref.b], '#ff5fb4', 3)
    dot(ref.a, '#ff5fb4', 6); dot(ref.b, '#ff5fb4', 6)
    if (ref.feet) {
      ctx.setLineDash([])
      ctx.font = `bold ${16 * u}px sans-serif`
      ctx.fillStyle = '#ff5fb4'
      ctx.fillText(`${ref.feet} ft`, (ref.a[0] + ref.b[0]) / 2 + 8 * u, (ref.a[1] + ref.b[1]) / 2 - 8 * u)
    }
  }
  ctx.setLineDash([])
}
