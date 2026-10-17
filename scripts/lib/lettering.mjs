// Replacing an AI drawing's hand-drawn lettering with real fonts (owner, 2026-10-16: "the fonts in all these svgs is
// junk"; "start replacing the letters with actual font in all the designs"). The Recraft vectors draw every letter
// as its own shape; these helpers find them (by colour and place), and set the same words back in the same places,
// sizes and colours as font outlines (glyphs() in logoArt.mjs), straight or on an arc fitted to the old letters.
// Used by scripts/shirt-install-crew-fonts.mjs and the other shirt scripts that re-letter Recraft art.
import { fmt, glyphs } from './logoArt.mjs'

// An SVG transform attribute as a matrix [a b c d e f] (translate, scale, rotate and matrix, in order).
function matrixOf(transform = '') {
  let m = [1, 0, 0, 1, 0, 0]
  const mul = (n) => { m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]] }
  for (const [, op, args] of transform.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = args.split(/[ ,]+/).filter(Boolean).map(Number)
    if (op === 'matrix') mul(v)
    else if (op === 'translate') mul([1, 0, 0, 1, v[0], v[1] || 0])
    else if (op === 'scale') mul([v[0], 0, 0, v[1] ?? v[0], 0, 0])
    else if (op === 'rotate') { const r = (v[0] * Math.PI) / 180; mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]) }
  }
  return m
}

// Every <path/> of a Recraft SVG: index, tag, fill, opacity, its points (control points included, transform applied)
// and bounding box. The paths are absolute-coordinate as Recraft writes them.
export function parseShapes(svg) {
  return [...svg.matchAll(/<path [^>]*\/>/g)].map((mt, i) => {
    const tag = mt[0]
    const m = matrixOf((tag.match(/transform="([^"]*)"/) || [])[1])
    const n = (tag.match(/ d="([^"]*)"/)?.[1] ?? '').match(/-?[0-9.]+(?:e-?\d+)?/g)?.map(Number) || []
    const pts = []
    for (let k = 0; k + 1 < n.length; k += 2) pts.push([m[0] * n[k] + m[2] * n[k + 1] + m[4], m[1] * n[k] + m[3] * n[k + 1] + m[5]])
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    return { i, tag, fill: ((tag.match(/fill="([^"]*)"/) || [])[1] || '').toUpperCase(), opacity: +((tag.match(/fill-opacity="([^"]*)"/) || [])[1] ?? 1), pts,
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
  })
}
export const centre = (s) => [(s.box[0] + s.box[2]) / 2, (s.box[1] + s.box[3]) / 2]

// The shapes passing test, checked against the expected count, so a changed drawing stops the script.
export function pick(shapes, name, count, test) {
  const list = shapes.filter(test)
  if (list.length !== count) throw new Error(`${name} is ${list.length} shapes, not ${count}`)
  return list
}

// Removes the shapes (by index) from the SVG and adds the new lettering on top.
export function relettered(svg, drop, lettering) {
  const gone = new Set(drop.map((s) => (typeof s === 'number' ? s : s.i)))
  let i = 0
  return svg.replace(/<path [^>]*\/>/g, (t) => (gone.has(i++) ? '' : t)).replace(/<\/svg>\s*$/, lettering + '</svg>')
}

// The faint vectorizer specks (part-opacity shapes) lying inside the old letters, which would print as dots once the
// letters move.
export const specksIn = (shapes, letters, maxOpacity = 0.5) => shapes.filter((s) => s.opacity < maxOpacity && !letters.includes(s) &&
  letters.some((l) => s.box[0] >= l.box[0] - 20 && s.box[2] <= l.box[2] + 20 && s.box[1] >= l.box[1] - 20 && s.box[3] <= l.box[3] + 20))

// A circle through points (least squares: x² + y² + Dx + Ey + F = 0).
export function fitCircle(points) {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0]
  for (const [x, y] of points) {
    const row = [x, y, 1], rhs = -(x * x + y * y)
    for (let r = 0; r < 3; r++) { b[r] += row[r] * rhs; for (let c = 0; c < 3; c++) A[r][c] += row[r] * row[c] }
  }
  for (let c = 0; c < 3; c++) for (let r = c + 1; r < 3; r++) {
    const f = A[r][c] / A[c][c]
    for (let k = c; k < 3; k++) A[r][k] -= f * A[c][k]
    b[r] -= f * b[c]
  }
  const z = [0, 0, 0]
  for (let r = 2; r >= 0; r--) z[r] = (b[r] - A[r].slice(r + 1).reduce((s, v, k) => s + v * z[r + 1 + k], 0)) / A[r][r]
  return { cx: -z[0] / 2, cy: -z[1] / 2 }
}
const median = (a) => [...a].sort((p, q) => p - q)[a.length >> 1]

// Text on an arc over the old letters: the circle fitted to their centres (or given as `circle`), the same angular
// span, the letters as tall as theirs and centred between their inner and outer radii, spaced evenly to fill the span.
// A wide font that would have to touch keeps `minGap` (em) and is set smaller instead. `bottom`: text along the
// bottom of a badge, upright, tops toward the centre. `skipForSize`: old shapes left out of the circle and size (a
// comma, a bullet). Returns { svg, cx, cy, cap }.
export function arcText(text, { font, location = {}, fill, old, bottom = false, skipForSize = [], minGap = 0.04, circle, capScale = 1 }) {
  const sized = old.filter((s) => !skipForSize.includes(s))
  const { cx, cy } = circle || fitCircle(sized.map(centre))
  const radii = sized.map((s) => s.pts.map(([x, y]) => Math.hypot(x - cx, y - cy)))
  const rIn = median(radii.map((r) => Math.min(...r))), rOut = median(radii.map((r) => Math.max(...r)))
  // angle from straight up (or down, for bottom text), growing left to right
  const angle = ([x, y]) => (bottom ? Math.atan2(x - cx, y - cy) : Math.atan2(x - cx, cy - y))
  const angles = old.flatMap((s) => s.pts.map(angle))
  const [a0, a1] = [Math.min(...angles), Math.max(...angles)]
  const { upem, capHeight, glyphs: gs } = glyphs(text, font, location)
  const rMid = (rIn + rOut) / 2, span = (a1 - a0) * rMid, advEm = gs.reduce((t, g) => t + g.advance, 0) / upem
  const em = Math.min((((rOut - rIn) * upem) / capHeight) * capScale, span / (advEm + minGap * (gs.length - 1))), s = em / upem
  const cap = (capHeight / upem) * em
  const gap = (span - advEm * em) / (gs.length - 1)
  let at = a0 * rMid
  const parts = gs.map((g) => {
    const w = g.advance * s, phi = (at + w / 2) / rMid
    at += w + gap
    if (!g.d) return ''
    const x = cx + rMid * Math.sin(phi), y = bottom ? cy + rMid * Math.cos(phi) : cy - rMid * Math.cos(phi)
    const rot = ((bottom ? -phi : phi) * 180) / Math.PI
    return `<path fill="${fill}" transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(rot)}) translate(${fmt(-w / 2)} ${fmt(cap / 2)}) scale(${s} ${-s})" d="${g.d}"/>`
  })
  return { svg: parts.join(''), cx, cy, cap, gap: gap / em, note: `${text}: arc ${Math.round(cx)},${Math.round(cy)} r ${Math.round(rIn)}–${Math.round(rOut)}, cap ${Math.round(cap)}, gap ${(gap / em).toFixed(3)} em` }
}

// Straight text over the old letters: baseline and cap height their medians (or given), spaced to fill their width
// (or `x0`–`x1`, or set at `tracking` and centred on them). A font too wide to fit with `minGap` (em) between letters
// is set smaller, centred on the old letters' height.
export function straightText(text, { font, location = {}, fill, old, base, top, x0, x1, tracking, anchor = 'fill', minGap = 0.02 }) {
  base ??= median(old.map((s) => s.box[3]))
  top ??= median(old.map((s) => s.box[1]))
  x0 ??= Math.min(...old.map((s) => s.box[0]))
  x1 ??= Math.max(...old.map((s) => s.box[2]))
  const { upem, capHeight, glyphs: gs } = glyphs(text, font, location)
  const advEm = gs.reduce((t, g) => t + g.advance, 0) / upem
  const em = Math.min(((base - top) * upem) / capHeight, (x1 - x0) / (advEm + minGap * (gs.length - 1))), s = em / upem
  base -= (base - top - (capHeight / upem) * em) / 2
  top = base - (capHeight / upem) * em
  const natural = advEm * em
  let gap = (x1 - x0 - natural) / (gs.length - 1), x = x0
  if (anchor === 'centre') { gap = (tracking ?? 0.05) * em; x = (x0 + x1) / 2 - (natural + gap * (gs.length - 1)) / 2 }
  const parts = gs.map((g) => {
    const p = g.d ? `<path fill="${fill}" transform="translate(${fmt(x)} ${fmt(base)}) scale(${s} ${-s})" d="${g.d}"/>` : ''
    x += g.advance * s + gap
    return p
  })
  return { svg: parts.join(''), cap: base - top, gap: gap / em, note: `${text}: baseline ${Math.round(base)}, cap ${Math.round(base - top)}, ${Math.round(x0)}–${Math.round(x1)}, gap ${(gap / em).toFixed(3)} em` }
}

// Re-letters a drawing line by line. Each line: { text, colours (the old letters' fills), box [x0 y0 x1 y1] (they lie
// inside it), count (how many shapes they are: checked), where (an extra test, e.g. distance from a badge's centre),
// skipSmallest (n: the smallest old shapes, a comma or a bullet, left out of the size), font, location, fill
// (default: the old letters' commonest colour), arc: 'top' | 'bottom' (default straight), and
// any arcText/straightText option }. The old letters go, and
// with them every shape drawn after a letter inside its box (the holes of A, R, O drawn in the background colour on
// top, and specks). Returns { svg, notes, letters, extras }.
const area = (s) => (s.box[2] - s.box[0]) * (s.box[3] - s.box[1])
// The new lettering for each line without touching the drawing: { made (one svg string per line), dropped (the old
// letters' and holes' shape indices), notes }. For scripts that place shapes by index themselves.
export function letterLines(svg, lines) {
  const shapes = parseShapes(svg)
  const drop = [], notes = [], made = []
  let letters = 0, extras = 0
  for (const line of lines) {
    const colours = line.colours.map((c) => c.toUpperCase())
    const [bx0, by0, bx1, by1] = line.box
    const old = pick(shapes, `"${line.text}"`, line.count, (s) => colours.includes(s.fill) && s.box[0] >= bx0 && s.box[1] >= by0 && s.box[2] <= bx1 && s.box[3] <= by1 && (!line.where || line.where(s)))
    const holes = shapes.filter((s) => !old.includes(s) && old.some((l) => s.i > l.i && s.box[0] >= l.box[0] - 2 && s.box[1] >= l.box[1] - 2 && s.box[2] <= l.box[2] + 2 && s.box[3] <= l.box[3] + 2))
    const counts = {}
    for (const s of old) counts[s.fill] = (counts[s.fill] || 0) + 1
    const fill = line.fill || Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    // skipSmallest: that many of the smallest old shapes (a comma, a bullet) left out of the arc's circle and size
    const skipForSize = line.skipSmallest ? [...old].sort((a, b) => area(a) - area(b)).slice(0, line.skipSmallest) : line.skipForSize
    const opts = { ...line, skipForSize, font: line.font, fill, old }
    const t = line.arc ? arcText(line.text, { ...opts, bottom: line.arc === 'bottom' }) : straightText(line.text, opts)
    drop.push(...old, ...holes)
    made.push(t.svg)
    notes.push(`${t.note} (${old.length} letters, ${holes.length} holes/specks out)`)
    letters += old.length
    extras += holes.length
  }
  return { made, notes, letters, extras, dropped: drop.map((s) => s.i) }
}
export function reletter(svg, lines) {
  const r = letterLines(svg, lines)
  return { ...r, svg: relettered(svg, r.dropped, r.made.join('')) }
}

// A glyph outline's subpaths and box (font units, y up). SVGPathPen writes absolute M L H V Q C Z.
export function outline(d) {
  const subs = []
  let x = 0, y = 0, cur = null
  for (const [, cmd, args] of d.matchAll(/([MLHVQCZ])([^MLHVQCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[ ,]+/).map(Number) : []
    if (cmd === 'M') { cur = { d: '', pts: [] }; subs.push(cur) }
    if (cmd === 'H') x = n[n.length - 1]
    else if (cmd === 'V') y = n[n.length - 1]
    else if (n.length) for (let k = 0; k + 1 < n.length; k += 2) { cur.pts.push([n[k], n[k + 1]]); [x, y] = [n[k], n[k + 1]] }
    if (cmd === 'H' || cmd === 'V') cur.pts.push([x, y])
    cur.d += cmd + args
  }
  const box = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]
  for (const s of subs) s.box = box(s.pts)
  return { subs, box: box(subs.flatMap((s) => s.pts)) }
}

// Words set as separate glyph shapes for scripts that draw items { d, tf, box, role } themselves: each line's ink
// sits on baseline `base` (drawing units, y down) between x0 and x1. The font keeps its own spacing (plus `tracking`,
// em): the letters are sized so the widest line fits its x0–x1 (no bigger than x-height `xh` or cap height `cap`), and
// each line is centred on its x0–x1 (`spread`: set at that size and spaced out to run from x0 to x1). `accent`:
// [line, char index] of an i whose dot gets the role 'accent' (drawn `accentScale` times the font's size, raised
// `accentLift`).
export function setWords(lines, { font, location = {}, xh, cap, role = 'ink', accent, accentScale = 1, accentLift = 0, tracking = 0.01, spread = false }) {
  const x = outline(glyphs('x', font, location).glyphs[0].d).box[3]
  const { upem, capHeight } = glyphs('H', font, location)
  const set = lines.map((L) => {
    const gs = glyphs(L.text, font, location).glyphs.map((g) => ({ ...g, o: g.d ? outline(g.d) : null }))
    const inked = gs.filter((g) => g.o)
    const lsb = inked[0].o.box[0], rsb = inked[inked.length - 1].advance - inked[inked.length - 1].o.box[2]
    return { L, gs, lsb, inkEm: (gs.reduce((t, g) => t + g.advance, 0) - lsb - rsb) / upem + tracking * (gs.length - 1) }
  })
  const size = xh ? (xh * upem) / x : (cap * upem) / capHeight
  const em = spread ? size : Math.min(size, ...set.map(({ L, inkEm }) => (L.x1 - L.x0) / inkEm)), s = em / upem
  const items = []
  set.forEach(({ L, gs, lsb, inkEm }, li) => {
    // spread: a tagline at its own size, letters spaced out to run from x0 to x1
    const gap = spread ? (L.x1 - L.x0 - (inkEm - tracking * (gs.length - 1)) * em) / (gs.length - 1) : tracking * em
    let at = spread ? L.x0 - lsb * s : (L.x0 + L.x1) / 2 - (inkEm * em) / 2 - lsb * s
    gs.forEach((g, gi) => {
      if (g.o) {
        const tf = `translate(${fmt(at)} ${fmt(L.base)}) scale(${s} ${-s})`
        const place = (b) => [at + b[0] * s, L.base - b[3] * s, at + b[2] * s, L.base - b[1] * s]
        if (accent && accent[0] === li && accent[1] === gi) {
          // the dot: the highest outline not inside another one (an inline font draws a groove inside each part)
          const inside = (a, b) => a !== b && a.box[0] >= b.box[0] && a.box[1] >= b.box[1] && a.box[2] <= b.box[2] && a.box[3] <= b.box[3]
          const dot = g.o.subs.filter((a) => !g.o.subs.some((b) => inside(a, b))).reduce((a, b) => (b.box[1] > a.box[1] ? b : a))
          // the dot can be drawn bigger than the font's (accentScale), round its own centre. Outlines inside the dot's
          // (an inline font's groove) stay with it, and the stem's with the stem, each part one path, so holes stay holes.
          const [cx, cy] = [(dot.box[0] + dot.box[2]) / 2, (dot.box[1] + dot.box[3]) / 2], k = accentScale
          const big = [cx - (cx - dot.box[0]) * k, cy - (cy - dot.box[1]) * k, cx + (dot.box[2] - cx) * k, cy + (dot.box[3] - cy) * k]
          const inDot = (sub) => sub.box[0] >= dot.box[0] && sub.box[1] >= dot.box[1] && sub.box[2] <= dot.box[2] && sub.box[3] <= dot.box[3]
          const stem = g.o.subs.filter((sub) => !inDot(sub)), dotParts = g.o.subs.filter(inDot)
          const box = (subs) => [Math.min(...subs.map((b) => b.box[0])), Math.min(...subs.map((b) => b.box[1])), Math.max(...subs.map((b) => b.box[2])), Math.max(...subs.map((b) => b.box[3]))]
          if (stem.length) items.push({ d: stem.map((sub) => sub.d).join(''), tf, box: place(box(stem)), role })
          const [bx0, by0, bx1, by1] = place(big) // accentLift: the dot raised that far (drawing units)
          items.push({ d: dotParts.map((sub) => sub.d).join(''), tf: `translate(0 ${fmt(-accentLift)}) ${tf} translate(${fmt(cx)} ${fmt(cy)}) scale(${k}) translate(${fmt(-cx)} ${fmt(-cy)})`, box: [bx0, by0 - accentLift, bx1, by1 - accentLift], role: 'accent' })
        } else items.push({ d: g.d, tf, box: place(g.o.box), role })
      }
      at += g.advance * s + gap
    })
  })
  return items
}
