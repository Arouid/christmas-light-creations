// Shared by scripts/shirt-art.mjs and scripts/print-vectors.mjs: reads the logo SVGs in
// assets-source/logo-vector, prepares the cottage for a print size (thin lines thickened
// or dropped, the blurred glow drawn solid) and sets text as outlines from the site's own
// font files (scripts/lib/text-outlines.py, fontTools), so no fonts need installing.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const VEC = fileURLToPath(new URL('../../assets-source/logo-vector/', import.meta.url))
export const FONTS = {
  inter: fileURLToPath(new URL('../../public/fonts/inter-latin.woff2', import.meta.url)),
  fraunces: fileURLToPath(new URL('../../public/fonts/fraunces-latin.woff2', import.meta.url)),
}
const TEXT_PY = fileURLToPath(new URL('text-outlines.py', import.meta.url))

// Brand colours (src/index.css tokens and the logo files).
export const COLORS = { navy: '#06132c', navyDeep: '#050b1a', white: '#ffffff', gold: '#ffcf4d', pale: '#c9d1e6', magenta: '#f038ee', green: '#5fe757' }

// The cottage's paths in reading order (same in the stacked, horizontal and cottage-only files).
export const COLOR_ROLES = ['specks', 'snow', 'specks', 'smoke', 'wall', 'wallLines', 'windowInterior', 'windowGlow', 'windowFrame', 'doorGlow', 'door', 'doorLines', 'postsGlow', 'posts', 'postHighlights', 'ground', 'roofGlowOuter', 'roofGlowInner', 'roof', 'chimneyGlow', 'chimneyWhite', 'chimney', 'chimneyDot']
export const WHITE_ROLES = ['snow', 'specks', 'smoke', 'wallLines', 'windowFrame', 'door', 'posts', 'ground', 'roof', 'chimneyWhite']
// The one-colour navy files draw the door, ground, roof and chimney as white shapes with a navy outline.
export const NAVY_ROLES = ['snow', 'specks', 'smoke', 'wallLines', 'windowFrame', 'door', 'doorLines', 'posts', 'ground', 'roof', 'chimneyWhite', 'chimney']
// Measured thickness of the thin parts, in viewBox units (erosion test on 2 px/unit renders, 2026-10-11).
// Glow strokes use their stroke-width. Fat fills (roof, ground, wall, door) need nothing.
export const THICKNESS = { snow: 3.5, smoke: 9, wallLines: 3.5, doorLines: 4, postHighlights: 10, chimneyWhite: 6, chimney: 8, posts: 8, chimneyDot: 8, windowFrame: 11 }
const FLAT_STROKE = { roofGlowOuter: 16 } // the blurred 26-unit roof glow becomes a solid 16-unit outline

export const fmt = (n) => String(Math.round(n * 100) / 100)

// --- the logo files are flat: optional <defs>, the cottage paths (in a <g> in the stacked files), lettering groups ---
export function parseLogo(file) {
  const svg = readFileSync(VEC + file, 'utf8')
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
  const defs = (svg.match(/<defs>[^]*?<\/defs>/) || [''])[0]
  const lettering = svg.match(/<g transform="translate\([\d.]+ [\d.]+\) scale\([^)]*\)"[^>]*>[^]*?<\/g>/g) || []
  let rest = svg.replace(defs, '')
  for (const g of lettering) rest = rest.replace(g, '')
  const background = (rest.match(/<rect[^>]*\/>/) || [null])[0]
  const wrapTag = rest.match(/<g transform="([^"]+)">/)
  const wrap = wrapTag && rest.indexOf(wrapTag[0]) < rest.indexOf('<path') ? wrapTag[1] : null
  const paths = rest.match(/<path[^>]*\/>/g).map(parseAttrs)
  return { file, viewBox: { x: vb[0], y: vb[1], w: vb[2], h: vb[3] }, defs, background, wrap, paths, lettering }
}
function parseAttrs(tag) {
  const attrs = {}
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return attrs
}
const tag = (attrs) => '<path ' + Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ') + '/>'

export function checkRoles(logo, roles) {
  const { paths, file } = logo
  if (paths.length !== roles.length) throw new Error(`${file}: ${paths.length} cottage paths, expected ${roles.length}; the role list in logoArt.mjs needs a look`)
  const subpaths = (a) => (a.d.match(/M/g) || []).length
  const expect = {
    snow: (a) => subpaths(a) > 50, smoke: (a) => subpaths(a) === 2, wallLines: (a) => subpaths(a) > 30,
    windowInterior: (a) => a.fill === '#0a2a52', roofGlowOuter: (a) => a['stroke-width'] === '26', windowGlow: (a) => a.stroke === '#c92ecf',
    chimney: (a) => a.fill === '#5fe757' || (a.stroke && subpaths(a) === 1), chimneyDot: (a) => a.filter && a.fill === '#ffffff',
  }
  roles.forEach((r, i) => { if (expect[r] && !expect[r](paths[i])) throw new Error(`${file}: path ${i + 1} doesn't look like ${r}`) })
  return logo
}

// --- snow: the 71 subpaths are snowflakes (several pieces each) and specks; keep the flakes at least `min` units wide ---
export function keepBigFlakes(d, min) {
  const subs = d.split('M').filter(Boolean)
  const boxes = subs.map((s) => {
    const nums = s.match(/-?\d+(\.\d+)?/g).map(Number)
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  const gap = 25
  const near = (a, b) => a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1
  const cluster = boxes.map(() => -1)
  let n = 0
  for (let i = 0; i < boxes.length; i++) {
    if (cluster[i] >= 0) continue
    const stack = [i]
    cluster[i] = n
    while (stack.length) {
      const a = stack.pop()
      boxes.forEach((b, j) => { if (cluster[j] < 0 && near(boxes[a], b)) { cluster[j] = n; stack.push(j) } })
    }
    n++
  }
  const kept = [], sizes = []
  for (let c = 0; c < n; c++) {
    const idx = boxes.map((_, i) => i).filter((i) => cluster[i] === c)
    const w = Math.max(...idx.map((i) => boxes[i].x1)) - Math.min(...idx.map((i) => boxes[i].x0))
    const h = Math.max(...idx.map((i) => boxes[i].y1)) - Math.min(...idx.map((i) => boxes[i].y0))
    if (Math.max(w, h) >= min) { kept.push(...idx); sizes.push(`${Math.round(w)}x${Math.round(h)}`) }
  }
  return { d: kept.sort((a, b) => a - b).map((i) => 'M' + subs[i]).join(''), flakes: sizes, dropped: n - sizes.length }
}

// --- the cottage for one print: minUnits = the thinnest line allowed, in viewBox units;
// look 'glow' keeps the blur, 'flat' draws it solid, 'white' is the one-colour file;
// drop = roles left out; keepFlakeMin = drop snowflakes narrower than this (0 keeps all) ---
export function prepCottage(logo, roles, { minUnits, look, drop = [], keepFlakeMin = 0 }) {
  const log = { thickened: [], dropped: [], flakes: [] }
  const out = []
  logo.paths.forEach((p, i) => {
    const role = roles[i]
    const a = { ...p }
    if (drop.includes(role)) { log.dropped.push(role); return }
    if (role === 'snow' && keepFlakeMin) {
      const r = keepBigFlakes(a.d, keepFlakeMin)
      a.d = r.d
      log.flakes = r.flakes
    }
    if (a.filter && look === 'flat') { // blurred glow: solid instead
      delete a.filter
      delete a.opacity
      if (FLAT_STROKE[role]) a['stroke-width'] = String(FLAT_STROKE[role])
    }
    if (a.fill === 'none') { // a stroke (the neon lines)
      const w = Number(a['stroke-width'])
      if (look !== 'glow' && w < minUnits) { a['stroke-width'] = fmt(minUnits); log.thickened.push(`${role} ${w}→${fmt(minUnits)}`) }
    } else if (THICKNESS[role] && THICKNESS[role] < minUnits && !a.stroke) { // (outlined shapes keep their outline)
      const extra = minUnits - THICKNESS[role]
      Object.assign(a, { stroke: a.fill, 'stroke-width': fmt(extra), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
      log.thickened.push(`${role} ${THICKNESS[role]}→${fmt(minUnits)}`)
    }
    out.push(tag(a))
  })
  const inner = out.join('\n')
  return { svg: logo.wrap ? `<g transform="${logo.wrap}">${inner}</g>` : inner, log }
}

// Any other art file (the trees, the sign, the scene): its viewBox, defs and drawing. Paths are kept as they are.
export function parseArt(file) {
  const svg = readFileSync(VEC + file, 'utf8').replace(/\r\n?/g, '\n')
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
  const defs = (svg.match(/<defs>[^]*?<\/defs>/) || [''])[0]
  const inner = svg.replace(defs, '').replace(/^[^]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return { file, viewBox: { x: vb[0], y: vb[1], w: vb[2], h: vb[3] }, defs, inner }
}
// The glow in the art is a blur filter on semi-transparent shapes; drawn solid instead (vector-only output, dark-garment printing).
export function flattenArt(inner) {
  return inner.replace(/<(path|ellipse|circle|rect|g)\b[^>]*filter="url\(#[^"]*\)"[^>]*>/g, (tag) => tag.replace(/ filter="[^"]*"/, '').replace(/ opacity="[^"]*"/, ''))
}

// The lettering groups, optionally stroked a little: extraByScale = { '0.095': units, ... } keyed by the group's scale.
export function letteringGroups(lettering, extraByScale = {}) {
  return lettering.map((g) => {
    const open = g.match(/<g [^>]*>/)[0]
    const scale = Number(open.match(/scale\(([\d.]+)/)[1])
    const extra = extraByScale[scale] || 0
    if (!extra) return g
    const fill = open.match(/fill="([^"]*)"/)[1]
    return g.replace(open, open.replace('>', ` stroke="${fill}" stroke-width="${fmt(extra / scale)}" stroke-linejoin="round">`))
  })
}

// --- text as outlines ---
const textCache = {}
export function glyphs(text, font = FONTS.inter, location = { wght: 700 }) {
  const key = JSON.stringify([font, location, text])
  textCache[key] ??= JSON.parse(execFileSync('python', [TEXT_PY, font, JSON.stringify(location), text], { encoding: 'utf8', maxBuffer: 64 << 20 }))
  return textCache[key]
}
// Lays out one line. em in the drawing's units (or fitWidth: as big as fits); tracking as a fraction of em.
// Returns width and cap height, and svg(x, y, anchor) draws it with the baseline at y, anchored start/middle/end at x.
export function textLine(text, { font = FONTS.inter, location = { wght: 700 }, em, fitWidth, tracking = 0.06, fill = '#ffffff', stroke, strokeWidth } = {}) {
  const { upem, capHeight, glyphs: gs } = glyphs(text, font, location)
  const advEm = gs.reduce((s, g) => s + g.advance, 0) / upem + tracking * (gs.length - 1)
  if (fitWidth) em = fitWidth / advEm
  const s = em / upem
  const width = advEm * em
  const cap = (capHeight / upem) * em
  const svg = (x, y, anchor = 'start') => {
    let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
    const parts = []
    for (const g of gs) {
      if (g.d) parts.push(`<path transform="translate(${fmt(cx)} 0) scale(${s} ${-s})" d="${g.d}"/>`)
      cx += g.advance * s + tracking * em
    }
    const paint = stroke ? ` stroke="${stroke}" stroke-width="${fmt(strokeWidth)}" stroke-linejoin="round"` : ''
    return `<g transform="translate(0 ${fmt(y)})" fill="${fill}"${paint}>${parts.join('')}</g>`
  }
  return { width, cap, em, svg }
}
