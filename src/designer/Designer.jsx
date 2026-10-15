import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MOVE_HANDLE_OFFSET, addGap, boxCorners, boxFrom, dist, hitOnStrand, hitStrand, length, pathOf, shapePoints, strandCenter } from './geometry.js'
import { pushStep, startHistory } from './history.js'
import { loadImage } from './image.js'
import { COLORS, COLOR_SETS, DECORATIONS, STYLES, draftStrand, newDecoration, newDesign, normalize, pxPerFoot, withDraft } from './model.js'
import { renderDesign } from './render.js'
import { designStats, scaleFrom, strandBulbs } from './stats.js'

// 44 px tall (design review 2026-10-14: they were 36). A chosen tool, style or
// color is outlined in gold (on); solid gold is kept for the button that moves
// things forward (cta), one at a time: while a line is being drawn, Done is
// the solid one and Estimate → steps back to a gold outline (ghost).
const shape = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold'
const OFF = 'border-transparent bg-white/10 hover:bg-white/15'
const ON = 'border-glow-400 bg-glow-400/15 text-glow-300'
const off = `${shape} ${OFF}`
const on = `${shape} ${ON}`
const cta = `${shape} border-transparent bg-glow-400 text-night-950`
const ghost = `${shape} border-glow-400 bg-transparent text-glow-300`
const round = 'size-11 shrink-0 place-items-center rounded-full bg-white/10 text-base font-semibold hover:bg-white/15'
const square = `grid ${round}`
const zoomBtn = 'grid size-11 place-items-center rounded-full font-bold hover:bg-white/10'
// Tool buttons have tighter sides, so the website's four fit a 375-px phone.
const toolShape = 'inline-flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-2 text-sm font-semibold'
// Rectangle and Oval share one Shapes button (audit 2026-10-14: the row ran off
// a phone's edge); which of the two is picked in the panel.
const TOOLS = [['select', '👆', 'Select'], ['draw', '✏️', 'Lights'], ['shape', '▭', 'Shapes'], ['erase', '🧽', 'Erase'], ['decor', '🎀', 'Decorate'], ['measure', '📏', 'Measure']]
const SHAPES = [['rect', '▭ Rectangle'], ['oval', '◯ Oval']]
// Common things to measure from, so setting the scale is two taps.
const MEASURE_PRESETS = [['Double garage door', 16], ['Single garage door', 8], ['Front door', 3]]
// The website's words for the color pattern (staff see 1×1 … 4×4).
const EVERY = ['bulb', '2 bulbs', '3 bulbs', '4 bulbs']
const TAP_SLOP = 10 // screen px a finger can wander and still count as a tap
const colorName = (list) => Object.entries(COLOR_SETS).find(([, v]) => v.join() === list.join())?.[0] ?? 'custom colors'
const kindOf = (s) => (s.shape ? 'oval' : s.closed ? 'rectangle' : 'strand')
// The first-run how-to (intro) is shown once per device.
const INTRO_SEEN = 'designer-intro-seen'
const introSeen = () => { try { return localStorage.getItem(INTRO_SEEN) === '1' } catch { return false } }
const rememberIntro = () => { try { localStorage.setItem(INTRO_SEEN, '1') } catch { /* private window: it shows again next time */ } }

// The light designer: draw lights on a house photo, measure, export.
// Standalone: give it a photo and (optionally) a saved design; it calls
// onSave(design, { blob, stats }) and onClose(design). No app/database code here.
// onChange (optional): every change to the design, e.g. for the host to keep it.
// onSatelliteMeasure (optional): the host measures the house from above and
// resolves { feet, label } (or null); the designer offers it as a measure preset.
// simple: the public website's version (homeowners): no measuring, history,
// feet, bulb counts or prices anywhere. saveLabel: the Save button's text
// (saveLabelShort on phones, so the header row fits). call (optional, the
// public page): { href, label }, a ☎ next to ✕ so the phone stays one tap away.
// backCloses (public page): opening adds a browser history entry, so a phone's
// Back gesture closes the designer instead of leaving the page; ✕ and Save
// leave through that entry (the host's onSave is expected to close it).
// intro (optional): { title, steps: [], hint, ok }, a how-to over the photo the
// first time it opens on this device. tip (optional): one line on the photo for
// a few seconds (e.g. "hold your phone sideways" after a portrait photo).
export default function Designer({ photo, design: initial, defaults = {}, title = 'Light design', brand = '', stamp, onSave, onClose, onChange, onSatelliteMeasure, saveLabelShort, simple = false, saveLabel = 'Save', call, backCloses = false, intro, tip }) {
  const canvas = useRef(null)
  const box = useRef(null) // the viewport the photo is zoomed/panned inside
  // Keyboard focus moves into the dialog as it opens (to the how-to's button if
  // it shows) and back out as it closes.
  const dialog = useRef(null)
  useEffect(() => {
    const before = document.activeElement
    const first = dialog.current?.querySelector('[data-autofocus]') ?? dialog.current?.querySelector('button')
    first?.focus({ preventScroll: true })
    return () => { if (before instanceof HTMLElement && document.contains(before)) before.focus({ preventScroll: true }) }
  }, [])
  const [img, setImg] = useState(null)
  // The website's version (homeowners): no measuring or decorations, C9 bulbs only (owner 2026-10-10).
  const tools = simple ? TOOLS.filter(([k]) => k !== 'measure' && k !== 'decor') : TOOLS
  const styles = simple ? Object.entries(STYLES).filter(([k]) => k === 'c9') : Object.entries(STYLES)
  const [hist, setHist] = useState(() => (initial
    ? startHistory(normalize(initial), 'Opened')
    : startHistory(newDesign({ width: photo.width, height: photo.height, pricePerFoot: defaults.pricePerFoot ?? null }), 'New design')))
  const design = hist.list[hist.at].d
  const [live, setLive] = useState(null) // design mid-drag (not in history yet)
  const shown = live ?? design
  const [tool, setTool] = useState(design.strands.length ? 'select' : 'draw')
  const [shapeTool, setShapeTool] = useState('rect') // what Shapes opens on: the last one used
  const [draft, setDraft] = useState([])
  const [draftShape, setDraftShape] = useState(null)
  const [lockShape, setLockShape] = useState(false)
  const [selectedId, setSelectedIdRaw] = useState(null)
  const [selectedPoint, setSelectedPoint] = useState(null) // pin index on the selected line
  const setSelectedId = (id) => { setSelectedIdRaw(id); if (id !== selectedId) setSelectedPoint(null) }
  const [pen, setPen] = useState({ style: 'c9', colors: ['warm'], groupSize: 1 })
  const [decor, setDecor] = useState('wreath')
  const [before, setBefore] = useState(false) // the plain photo, to compare (a toggle: hold buttons get missed)
  const [measure, setMeasure] = useState(null) // { a, b }
  const [feetInput, setFeetInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [brushPx, setBrushPx] = useState(22) // eraser size in screen pixels
  const [brush, setBrush] = useState(null) // eraser ring position (photo px)
  const [busy, setBusy] = useState(null)
  const [introOpen, setIntroOpen] = useState(() => Boolean(intro?.steps?.length) && !introSeen())
  const [tipOpen, setTipOpen] = useState(Boolean(tip))
  // View: fit size of the photo in the viewport, plus zoom and pan.
  const [fit, setFit] = useState({ w: 0, h: 0, cw: 0, ch: 0 })
  const [view, setViewRaw] = useState({ z: 1, x: 0, y: 0 })
  const fitRef = useRef(fit)
  fitRef.current = fit
  // Keep the photo on screen: fully zoomed out it stays centered (no
  // dragging); zoomed in, its edges can't be pulled inside the viewport.
  const clampView = ({ z, x, y }) => {
    const { w, h, cw, ch } = fitRef.current
    const axis = (pos, size, room) => (size <= room ? (room - size) / 2 : Math.min(0, Math.max(room - size, pos)))
    const zz = Math.max(1, z)
    return { z: zz, x: axis(x, w * zz, cw), y: axis(y, h * zz, ch) }
  }
  const setView = (next) => setViewRaw((v) => clampView(typeof next === 'function' ? next(v) : next))
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  useEffect(() => { loadImage(photo.src).then(setImg).catch(() => setBusy('Couldn’t load the photo.')) }, [photo.src])

  // The tip stays a few seconds once the how-to is out of the way (or until the first tap).
  useEffect(() => {
    if (!tipOpen || introOpen) return
    const t = setTimeout(() => setTipOpen(false), 9000)
    return () => clearTimeout(t)
  }, [tipOpen, introOpen])

  // Fit the photo to the viewport (and re-fit when the screen size changes).
  const refit = useCallback(() => {
    const el = box.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    const k = Math.min(cw / photo.width, ch / photo.height)
    const w = photo.width * k
    const h = photo.height * k
    fitRef.current = { w, h, cw, ch } // so the clamp below already uses the new size
    setFit(fitRef.current)
    setView({ z: 1, x: (cw - w) / 2, y: (ch - h) / 2 })
  }, [photo.width, photo.height])
  useEffect(() => {
    refit()
    const ro = new ResizeObserver(refit)
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [refit])

  const pxPerScreenPx = fit.w ? photo.width / (fit.w * view.z) : 1
  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    renderDesign(c.getContext('2d'), shown, img, { before, handles: !before, selectedId, selectedPoint, draft, measure, draftShape, pxPerScreenPx, brush: brush && { ...brush, r: brushPx * pxPerScreenPx } })
  }, [shown, img, before, selectedId, selectedPoint, draft, measure, draftShape, pxPerScreenPx, brush, brushPx])

  // Changes only: the design as it opened isn't reported.
  useEffect(() => { if (hist.list.length > 1) onChange?.(design) }, [design, hist.list.length, onChange])

  const stats = useMemo(() => designStats(design), [design])
  // merge: a slider or a typed number changing the same thing again is one undo step.
  const commit = (next, label, merge = false) => {
    setHist((h) => pushStep(h, next, label, merge))
    setLive(null)
  }
  const update = (label, fn, merge) => commit(fn(structuredClone(design)), label, merge)
  // While a line is being drawn, ↶ (and Ctrl+Z) take back the last tap, not
  // the step before the line (audit 2026-10-14: it deleted the last strand).
  const undo = () => { if (draft.length) setDraft((d) => d.slice(0, -1)); else setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) })) }
  const redo = () => setHist((h) => ({ ...h, at: Math.min(h.list.length - 1, h.at + 1) }))
  // The design with the line being drawn (2+ taps) added: what ✕, Save and the picture use.
  const finished = () => withDraft(design, draft, pen)

  const selStrand = design.strands.find((s) => s.id === selectedId)
  const selDecor = design.decorations.find((d) => d.id === selectedId)
  const strandLabel = (s) => (simple ? `${kindOf(s)} (${colorName(s.colors)})` : `${kindOf(s)} (${STYLES[s.style]?.label ?? s.style}, ${colorName(s.colors)})`)

  // ---- Back closes (backCloses) -----------------------------------------
  const pushed = useRef(false) // our history entry is the current one
  const leaving = useRef(null) // what to do once the browser has gone back
  const closeNow = useRef(null)
  closeNow.current = () => onClose?.(finished())
  useEffect(() => {
    if (!backCloses) return
    try { window.history.pushState({ designer: true }, '') } catch { return }
    pushed.current = true
    const scroll = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual' // the page behind stays where it was
    const onPop = () => {
      if (!pushed.current) return
      pushed.current = false
      const then = leaving.current ?? closeNow.current
      leaving.current = null
      then()
    }
    window.addEventListener('popstate', onPop)
    return () => { window.removeEventListener('popstate', onPop); window.history.scrollRestoration = scroll }
  }, [backCloses])
  function leave(then) {
    if (!pushed.current) return then()
    leaving.current = then
    window.history.back()
    // Should a browser never report going back, leave anyway.
    setTimeout(() => { if (leaving.current === then) { leaving.current = null; pushed.current = false; then() } }, 700)
  }
  const close = () => leave(() => onClose?.(finished()))

  // ---- Zoom & pan -------------------------------------------------------
  const zoomAt = (clientX, clientY, z) => {
    const r = box.current.getBoundingClientRect()
    setView((v) => {
      const nz = Math.max(1, Math.min(8, z(v.z)))
      const px = (clientX - r.left - v.x) / v.z
      const py = (clientY - r.top - v.y) / v.z
      return { z: nz, x: clientX - r.left - px * nz, y: clientY - r.top - py * nz }
    })
  }
  const zoomButton = (k) => { const r = box.current.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, (z) => z * k) }
  useEffect(() => {
    const el = box.current
    const onWheel = (e) => {
      e.preventDefault()
      // Trackpad pinch arrives as ctrl+wheel; a mouse wheel zooms too.
      zoomAt(e.clientX, e.clientY, (z) => z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Keyboard (computers): Delete/Backspace removes the selected pin or item,
  // Escape closes the how-to, or finishes the line being drawn, or deselects;
  // Ctrl+Z / Ctrl+Y undo/redo.
  useEffect(() => {
    const onKey = (e) => {
      if (/^(input|textarea|select)$/i.test(e.target?.tagName ?? '')) return
      if (e.key === 'Escape' && introOpen) { rememberIntro(); setIntroOpen(false) }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); if (selectedPoint != null) deletePin(); else removeSelected() }
      else if (e.key === 'Escape') { if (draft.length) finishStrand(); else setSelectedId(null) }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- Pointer handling -------------------------------------------------
  function toImg(clientX, clientY) {
    const r = canvas.current.getBoundingClientRect()
    return [((clientX - r.left) * photo.width) / r.width, ((clientY - r.top) * photo.height) / r.height]
  }
  const tol = () => 16 * pxPerScreenPx

  function down(e) {
    if (!img || !fit.w) return
    // Showing the plain photo: a tap on it brings the lights back.
    if (before) { setBefore(false); return }
    setTipOpen(false)
    try { box.current.setPointerCapture(e.pointerId) } catch { /* synthetic events */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      // Second finger: pinch/pan. Abandon whatever the first finger started.
      const [a, b] = [...pointers.current.values()]
      gesture.current = { kind: 'pinch', d0: Math.hypot(b.x - a.x, b.y - a.y), m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: view }
      setLive(null); setDraftShape(null)
      return
    }
    if (pointers.current.size > 2) return
    const p = toImg(e.clientX, e.clientY)
    const start = { sx: e.clientX, sy: e.clientY, p, v0: view }
    if (tool === 'draw' || tool === 'decor') { gesture.current = { kind: 'tap', grab: tool === 'draw' && !draft.length ? grabOn(p) : null, ...start }; return }
    if (tool === 'rect' || tool === 'oval') { gesture.current = { kind: 'newShape', ...start }; return }
    if (tool === 'measure') { setMeasure({ a: p, b: p }); gesture.current = { kind: 'measure', ...start }; return }
    if (tool === 'erase') { setBrush({ x: p[0], y: p[1] }); const n = eraseAt(design, p); setLive(n === design ? null : n); gesture.current = { kind: 'erase', ...start }; return }

    // Select. The selected item's own handles come first:
    //   shape corners -> resize; move handle -> move all; pin -> move that pin;
    //   line between pins -> bend (a new pin is added where you grab).
    if (selStrand?.shape) {
      const i = boxCorners(selStrand.shape).findIndex((c) => dist(c, p) <= tol())
      if (i >= 0) { gesture.current = { kind: 'resize', id: selStrand.id, fixed: boxCorners(selStrand.shape)[(i + 2) % 4], ...start }; return }
    } else if (selStrand) {
      const on = hitOnStrand(pathOf(selStrand), p, tol()) // closed: includes the side from the last corner back to the first
      if (on?.pointIndex === selStrand.points.length) on.pointIndex = 0 // that path's end is the first corner again
      if (on?.pointIndex == null && dist(strandCenter(selStrand.points, MOVE_HANDLE_OFFSET * pxPerScreenPx), p) <= tol() * 1.2) {
        gesture.current = { kind: 'move', id: selStrand.id, orig: structuredClone(selStrand), ...start }
        return
      }
      if (on?.pointIndex != null) { setSelectedPoint(on.pointIndex); gesture.current = { kind: 'point', id: selStrand.id, i: on.pointIndex, ...start }; return }
      if (on?.segment != null) { setSelectedPoint(null); gesture.current = { kind: 'bend', id: selStrand.id, seg: on.segment, at: on.at, ...start }; return }
    }
    const ppf = pxPerFoot(design)
    const dec = [...design.decorations].reverse().find((d) => dist(p, [d.x, d.y]) <= Math.max(tol(), ((DECORATIONS[d.type]?.sizeFt ?? 2) * ppf * (d.size || 1)) / 2))
    if (dec) { setSelectedId(dec.id); gesture.current = { kind: 'decor', id: dec.id, orig: [dec.x, dec.y], ...start }; return }
    const hit = hitStrand(design.strands, p, tol())
    if (hit) {
      const s = design.strands.find((x) => x.id === hit.id)
      setSelectedId(hit.id)
      if (s.shape) { gesture.current = { kind: 'move', id: hit.id, orig: structuredClone(s), ...start }; return }
      // A different line: select it; grabbing one of its pins moves just that pin.
      setSelectedPoint(hit.pointIndex ?? null)
      gesture.current = hit.pointIndex != null ? { kind: 'point', id: hit.id, i: hit.pointIndex, ...start } : { kind: 'select', ...start }
      return
    }
    gesture.current = { kind: 'pan', deselect: true, ...start }
  }

  // Lights, nothing being drawn yet: what dragging the strand under the finger
  // would do in Select (move a pin, bend the line, move a shape), or null.
  // People forget to switch tools; a plain tap still adds a light point.
  function grabOn(p) {
    const hit = hitStrand(design.strands, p, tol())
    const s = hit && design.strands.find((x) => x.id === hit.id)
    if (!s) return null
    if (s.shape) return { kind: 'move', id: s.id, orig: structuredClone(s) }
    if (hit.pointIndex != null) return { kind: 'point', id: s.id, i: hit.pointIndex }
    const on = hitOnStrand(pathOf(s), p, tol())
    if (on?.pointIndex != null) return { kind: 'point', id: s.id, i: on.pointIndex === s.points.length ? 0 : on.pointIndex }
    return on?.segment != null ? { kind: 'bend', id: s.id, seg: on.segment, at: on.at } : null
  }

  // Eraser: every bulb under the brush gets a gap around it (half a spacing
  // each side), so it disappears and its footage no longer counts.
  function eraseAt(base, p) {
    const r = brushPx * pxPerScreenPx
    const ppf = pxPerFoot(base)
    let changed = false
    const next = { ...base, strands: base.strands.map((st) => {
      const L = length(pathOf(st))
      if (!L) return st
      const half = ((st.spacingIn || 12) / 12) * ppf / 2
      let gaps = st.gaps
      for (const b of strandBulbs(st, base)) {
        if (dist([b.x, b.y], p) <= r) { gaps = addGap(gaps, (b.s - half) / L, (b.s + half) / L); changed = true }
      }
      return gaps === st.gaps ? st : { ...st, gaps }
    }) }
    return changed ? next : base
  }

  // Bend: on the first real drag, put a new pin into the line where it was grabbed.
  function bendInsert(g, next) {
    const s = next.strands.find((x) => x.id === g.id)
    s.points.splice(g.seg, 0, g.at)
    g.kind = 'point'
    g.i = g.seg
    g.bent = true
    setSelectedPoint(g.seg)
  }

  function move(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()]
      if (!b) return
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const r = box.current.getBoundingClientRect()
      const nz = Math.max(1, Math.min(8, g.v0.z * (d / g.d0)))
      const px = (g.m0.x - r.left - g.v0.x) / g.v0.z
      const py = (g.m0.y - r.top - g.v0.y) / g.v0.z
      setView({ z: nz, x: m.x - r.left - px * nz, y: m.y - r.top - py * nz })
      return
    }
    const moved = Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > TAP_SLOP
    if (g.kind === 'tap' && g.grab && moved) {
      // Dragging a strand while on Lights: adjust it, and switch to Select.
      setTool('select'); setSelectedId(g.grab.id); setSelectedPoint(g.grab.i ?? null)
      Object.assign(g, g.grab, { grab: null })
    }
    if (g.kind === 'tap' || g.kind === 'pan') {
      // One finger dragging where a tap was expected: pan the photo.
      if (moved || g.kind === 'pan') { g.kind = 'pan'; g.panned = g.panned || moved; setView({ ...g.v0, x: g.v0.x + e.clientX - g.sx, y: g.v0.y + e.clientY - g.sy }) }
      return
    }
    const p = toImg(e.clientX, e.clientY)
    if (g.kind === 'erase') { setBrush({ x: p[0], y: p[1] }); setLive((l) => { const base = l ?? design; const n = eraseAt(base, p); return n === base ? l : n }); return }
    if (g.kind === 'measure') return setMeasure((m) => ({ ...m, b: p }))
    if (g.kind === 'newShape') { if (moved) setDraftShape({ type: tool, ...boxFrom(g.p, p, lockShape) }); return }
    if (g.kind === 'select') return
    if (!moved && !g.moved) return
    g.moved = true
    const next = structuredClone(design)
    if (g.kind === 'bend') bendInsert(g, next)
    else if (g.bent) next.strands.find((s) => s.id === g.id).points.splice(g.i, 0, p) // keep the pin added on the first move
    if (g.kind === 'point') next.strands.find((s) => s.id === g.id).points[g.i] = p
    if (g.kind === 'move') {
      const s = next.strands.find((x) => x.id === g.id)
      const dx = p[0] - g.p[0]
      const dy = p[1] - g.p[1]
      if (s.shape) { s.shape = { ...g.orig.shape, x: g.orig.shape.x + dx, y: g.orig.shape.y + dy }; s.points = shapePoints(s.shape) }
      else s.points = g.orig.points.map(([x, y]) => [x + dx, y + dy])
    }
    if (g.kind === 'resize') {
      const s = next.strands.find((x) => x.id === g.id)
      s.shape = { ...s.shape, ...boxFrom(g.fixed, p, s.shape.lock) }
      s.points = shapePoints(s.shape)
    }
    if (g.kind === 'decor') { const d = next.decorations.find((x) => x.id === g.id); d.x = g.orig[0] + p[0] - g.p[0]; d.y = g.orig[1] + p[1] - g.p[1] }
    setLive(next)
  }

  function up(e) {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch') { if (pointers.current.size === 0) gesture.current = null; return }
    gesture.current = null
    if (g.kind === 'erase') { setBrush(null); if (live) commit(live, 'Erased lights'); return }
    if (g.kind === 'tap') {
      if (tool === 'draw') setDraft((d) => [...d, g.p])
      if (tool === 'decor') {
        const d = newDecoration(decor, g.p[0], g.p[1])
        update(`Added ${DECORATIONS[decor].label.toLowerCase()}`, (x) => { x.decorations.push(d); return x })
        setSelectedId(d.id)
      }
      return
    }
    if (g.kind === 'pan') {
      // Select, tap on an empty spot: clears the selection; with nothing
      // selected it starts drawing lights there (people forget to switch).
      if (g.deselect && !g.panned) {
        if (selectedId) setSelectedId(null)
        else { setTool('draw'); setDraft([g.p]) }
      }
      return
    }
    if (g.kind === 'measure') return
    if (g.kind === 'newShape') {
      const shape = draftShape
      setDraftShape(null)
      if (!shape || shape.w < 4 * pxPerScreenPx || shape.h < 4 * pxPerScreenPx) return
      // Rectangles become 4 free corners (each can be dragged on its own to
      // follow a window at an angle); ovals keep a box with resize handles.
      const s = shape.type === 'rect'
        ? { ...draftStrand(pen, boxCorners(shape)), closed: true }
        : { ...draftStrand(pen, shapePoints(shape)), shape: { ...shape, lock: lockShape } }
      update(`Added ${strandLabel(s)}`, (x) => { x.strands.push(s); return x })
      setSelectedId(s.id)
      return
    }
    if (g.moved && live) {
      const label = g.bent ? 'Bent the line (added a pin)' : g.kind === 'resize' ? 'Resized shape' : g.kind === 'point' ? 'Moved a pin'
        : g.kind === 'decor' ? 'Moved decoration' : 'Moved whole strand'
      commit(live, label)
    } else setLive(null)
  }

  // ---- Actions ----------------------------------------------------------
  function finishStrand() {
    if (draft.length >= 2) {
      const s = draftStrand(pen, draft)
      update(`Added ${strandLabel(s)}`, (x) => { x.strands.push(s); return x })
    }
    setDraft([])
  }
  function applyMeasure(feet) {
    const scale = measure && scaleFrom(measure.a, measure.b, Number(feet))
    if (!scale || dist(measure.a, measure.b) < 4) return setBusy('First drag across something you know (end to end), then pick or type its length.')
    update(`Set scale (${feet} ft)`, (x) => { x.scale = { ...scale, source: x.satellite?.feet === Number(feet) ? 'satellite' : 'photo' }; return x })
    setMeasure(null)
    setFeetInput('')
    setBusy(null)
    setTool('select')
  }
  async function satellite() {
    setBusy('Opening satellite view…')
    const r = await onSatelliteMeasure?.().catch(() => null)
    setBusy(r ? 'Now drag across that same edge on the photo, then tap the 🛰 button.' : null)
    if (r) update(`Measured on satellite (${r.feet} ft)`, (x) => { x.satellite = r; return x })
  }
  const patchStrand = (label, p, merge) => update(label, (x) => { Object.assign(x.strands.find((s) => s.id === selectedId), p); return x }, merge)
  const patchDecor = (label, p, merge) => update(label, (x) => { Object.assign(x.decorations.find((d) => d.id === selectedId), p); return x }, merge)
  function removeSelected() {
    const what = selStrand ? strandLabel(selStrand) : DECORATIONS[selDecor?.type]?.label.toLowerCase() ?? 'item'
    update(`Deleted ${what}`, (x) => { x.strands = x.strands.filter((s) => s.id !== selectedId); x.decorations = x.decorations.filter((d) => d.id !== selectedId); return x })
    setSelectedId(null)
  }
  function deletePin() {
    if (!selStrand || selectedPoint == null) return
    if (selStrand.points.length <= (selStrand.closed ? 3 : 2)) return removeSelected() // a line needs 2 pins, a closed shape 3
    update('Deleted a pin', (x) => { x.strands.find((st) => st.id === selectedId).points.splice(selectedPoint, 1); return x })
    setSelectedPoint(null)
  }
  const setPenColors = (colors) => { setPen((p) => ({ ...p, colors })); if (selStrand) patchStrand(`Colors: ${colorName(colors)}`, { colors }) }
  // Switching tools finishes the line being drawn and clears the selection,
  // so color picks apply to what you draw next, not to the last thing you drew.
  // 'shape' opens the last shape used (Rectangle or Oval).
  const pickTool = (k) => {
    if (draft.length) finishStrand()
    const t = k === 'shape' ? shapeTool : k
    if (t === 'rect' || t === 'oval') setShapeTool(t)
    setTool(t); setMeasure(null); setDraftShape(null); setBefore(false)
    if (t !== 'select') setSelectedId(null)
  }

  async function exportBlob(d = design) {
    const c = document.createElement('canvas')
    c.width = d.photo.width
    c.height = d.photo.height
    const ctx = c.getContext('2d')
    renderDesign(ctx, d, img)
    if (stamp) await stamp(ctx, c.width, c.height) // the caller's own mark (the public designer's logo, design/photo.js)
    else if (brand) {
      const s = Math.max(14, c.width / 55)
      ctx.font = `600 ${s}px sans-serif`
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillText(brand, c.width - s + 1, c.height - s + 1)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(brand, c.width - s, c.height - s)
    }
    return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))
  }
  // Phones (a finger, not a mouse): the share sheet, where Save Image puts the
  // picture in Photos (a download lands in Files on an iPhone) and Messages is
  // one tap away. Computers, or no share sheet: a normal download.
  async function download() {
    const d = finished()
    const blob = await exportBlob(d)
    const name = `${(d.name || title).replace(/[^\w-]+/g, '-')}.jpg`
    const file = typeof File === 'function' ? new File([blob], name, { type: 'image/jpeg' }) : null
    if (file && window.matchMedia?.('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title }); return } catch (err) { if (err?.name === 'AbortError') return }
    }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name })
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    setBusy('Picture saved to your downloads ✓')
    setTimeout(() => setBusy(null), 2500)
  }
  async function save() {
    const d = finished()
    if (draft.length) finishStrand()
    setBusy('Saving…')
    try {
      const blob = await exportBlob(d)
      const send = () => onSave?.(d, { blob, stats: designStats(d) })
      if (backCloses) return leave(send) // the host closes the designer on save
      await send()
      setBusy('Saved ✓')
      setTimeout(() => setBusy(null), 1500)
    } catch (err) {
      setBusy(`Couldn’t save: ${err.message}`)
    }
  }

  // Which tool you're on, on the photo itself, so you don't have to look up.
  const modeHint = before ? '👀 Before · tap the photo for the lights' : {
    select: '👆 Select · tap an empty spot to draw',
    draw: draft.length ? `✏️ Drawing · ${draft.length} point${draft.length === 1 ? '' : 's'} · tap the next corner` : '✏️ Lights · tap to draw · drag lights to adjust',
    rect: '▭ Rectangle · drag corner to corner',
    oval: '◯ Oval · drag corner to corner',
    erase: '🧽 Erase · rub over bulbs',
    decor: '🎀 Decorate · tap to place',
    measure: '📏 Measure · drag across something you know',
  }[tool]

  // The palette always stays on screen (it used to vanish after a delete):
  // it edits the selected strand, or sets up the next one when none is selected.
  // Hidden while a decoration is selected, and for measuring, decorating and erasing.
  const editing = selStrand ?? (selDecor || tool === 'measure' || tool === 'decor' || tool === 'erase' ? null : pen)
  const multicolor = editing?.colors.length > 1
  const pinWord = selStrand?.closed ? 'corner' : 'pin'

  return (
    <div ref={dialog} className="fixed inset-0 z-50 flex flex-col bg-night-950" role="dialog" aria-modal="true" aria-label={title}>
      <header className="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-white/10 px-3 py-2 sm:gap-2 [&>button]:shrink-0">
        <button type="button" onClick={close} className={square} aria-label="Close designer">✕</button>
        {call && <a href={call.href} className={`${square} text-glow-300`} aria-label={call.label}><svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></a>}
        <p className="min-w-0 flex-1 truncate font-semibold"><span className="hidden sm:inline">{title}</span></p>
        <button type="button" onClick={undo} disabled={hist.at === 0 && !draft.length} className={`${square} disabled:opacity-30`} aria-label={draft.length ? 'Undo the last point' : 'Undo'}>↶</button>
        {/* Phones, website: no room for Redo next to Save (it's the rarest of the three). */}
        <button type="button" onClick={redo} disabled={hist.at >= hist.list.length - 1} className={`${simple ? `hidden sm:grid ${round}` : square} disabled:opacity-30`} aria-label="Redo">↷</button>
        {!simple && <button type="button" onClick={() => setShowHistory((v) => !v)} className={showHistory ? on : off} aria-label="History">🕘<span className="hidden sm:inline"> History</span></button>}
        <button type="button" onClick={download} className={off} aria-label="Save a picture of the design"><span aria-hidden="true">⬇</span>&nbsp;Save<span className="hidden sm:inline">&nbsp;picture</span></button>
        {onSave && <button type="button" onClick={save} className={draft.length ? ghost : cta}><span className="sm:hidden">{saveLabelShort ?? saveLabel}</span><span className="hidden sm:inline">{saveLabel}</span></button>}
      </header>

      {/* Upright screens: tools, photo, view bar and controls, stacked. Sideways
          (a phone turned, a tablet, a computer): the photo and its view bar on
          the left, tools and controls in a column on the right. Nothing the
          controls show changes the photo area's size (a re-fit resets the zoom). */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] [grid-template-areas:'tools'_'photo'_'view'_'panel'] sideways:grid-cols-[minmax(0,1fr)_20rem] sideways:grid-rows-[auto_minmax(0,1fr)_auto] sideways:[grid-template-areas:'photo_tools'_'photo_panel'_'view_panel']">
        <div className={`border-b border-white/10 px-3 py-2 [grid-area:tools] sideways:border-l ${simple ? 'grid grid-cols-4 gap-1 sideways:grid-cols-2' : 'flex gap-1.5 overflow-x-auto sideways:flex-wrap'}`}>
          {tools.map(([k, icon, label]) => {
            const chosen = k === tool || (k === 'shape' && (tool === 'rect' || tool === 'oval'))
            return <button key={k} type="button" onClick={() => pickTool(k)} aria-pressed={chosen} className={`${toolShape} ${chosen ? ON : OFF} shrink-0`}><span aria-hidden="true">{icon}</span>{label}</button>
          })}
        </div>

        <div ref={box} className="relative min-h-0 touch-none select-none overflow-hidden [grid-area:photo]"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ cursor: before ? 'pointer' : tool === 'select' ? 'default' : tool === 'erase' ? 'cell' : 'crosshair' }}
          onPointerLeave={() => setBrush(null)}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, width: fit.w, height: fit.h }}>
            <canvas ref={canvas} width={photo.width} height={photo.height} className="block h-full w-full" />
          </div>
          {!img && <p className="absolute inset-0 grid place-items-center text-slate-400">Loading photo…</p>}
          {img && (
            <div className="pointer-events-none absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
              <p className="max-w-full truncate rounded-full bg-night-900/90 px-3 py-1.5 text-xs font-semibold shadow" role="status">{modeHint}</p>
              {tip && tipOpen && !introOpen && <p className="rounded-2xl bg-glow-400 px-3 py-1.5 text-xs font-semibold text-night-950 shadow">{tip}</p>}
            </div>
          )}

          {showHistory && (
            <div className="absolute right-2 top-2 max-h-[80%] w-64 overflow-y-auto rounded-2xl border border-white/10 bg-night-900/95 p-2 text-sm shadow-xl" onPointerDown={(e) => e.stopPropagation()}>
              <p className="px-2 pb-1 text-xs uppercase tracking-wider text-slate-400">Tap a step to go back to it</p>
              <ol>
                {hist.list.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => (
                  <li key={i}>
                    <button type="button" onClick={() => { setHist((x) => ({ ...x, at: i })); setSelectedId(null); setLive(null) }}
                      className={`w-full rounded-lg px-2 py-1.5 text-left ${i === hist.at ? 'bg-glow-400 text-night-950' : i > hist.at ? 'text-slate-500 line-through' : 'hover:bg-white/10'}`}>
                      {h.label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {introOpen && (
            <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-night-950/80 p-3 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-night-900 p-4 shadow-xl" role="group" aria-labelledby="designer-intro">
                <p id="designer-intro" className="font-display text-lg font-extrabold">{intro.title}</p>
                <ol className="mt-2 space-y-2 text-sm text-slate-200">
                  {intro.steps.map((s, i) => (
                    <li key={s} className="flex gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-glow-400 text-xs font-bold text-night-950" aria-hidden="true">{i + 1}</span>{s}</li>
                  ))}
                </ol>
                {intro.hint && <p className="mt-2 text-xs text-slate-400">{intro.hint}</p>}
                <button type="button" data-autofocus="" onClick={() => { rememberIntro(); setIntroOpen(false) }} className={`${cta} mt-3 w-full`}>{intro.ok}</button>
              </div>
            </div>
          )}
        </div>

        {/* The view bar: compare with the plain photo, night level, zoom. Under
            the photo, never on it (audit 2026-10-14: they covered the house). */}
        <div className="flex items-center gap-2 border-t border-white/10 px-3 py-1 [grid-area:view]">
          <button type="button" onClick={() => setBefore((b) => !b)} aria-pressed={before} className={before ? on : off}>Before</button>
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold lg:max-w-md">
            <span aria-hidden="true">🌙</span><span className="sr-only sm:not-sr-only">Night</span>
            <input type="range" className="h-11 min-w-0 flex-1" min="0" max="1" step="0.05" value={shown.night}
              onChange={(e) => commit({ ...design, night: Number(e.target.value) }, 'Changed night level', true)} />
          </label>
          <div className="ml-auto flex shrink-0 rounded-full bg-white/10">
            <button type="button" onClick={() => zoomButton(1 / 1.5)} className={`${zoomBtn} text-lg`} aria-label="Zoom out">−</button>
            <button type="button" onClick={() => zoomButton(1.5)} className={`${zoomBtn} text-lg`} aria-label="Zoom in">+</button>
            <button type="button" onClick={refit} className={`${zoomBtn} text-xs`} aria-label="Fit photo">Fit</button>
          </div>
        </div>

        {/* Upright: a fixed height, so what's selected changes the controls,
            never the photo area. Sideways: the rest of the right-hand column. */}
        <div className="h-[30vh] min-h-52 space-y-2 overflow-y-auto border-t border-white/10 px-3 py-2 text-sm [grid-area:panel] sideways:h-auto sideways:min-h-0 sideways:border-l sideways:border-t-0">
          {busy && <p className="text-glow-300" role="status">{busy}</p>}

          {tool === 'draw' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-slate-400">{draft.length === 0 ? 'Tap along a roofline, corner to corner. Two fingers to zoom.' : draft.length === 1 ? 'Now tap the next corner.' : `${draft.length} points. Keep tapping, then Done.`}</span>
              {draft.length > 0 && <button type="button" onClick={() => setDraft((d) => d.slice(0, -1))} className={off}>Undo point</button>}
              {draft.length >= 2 && <button type="button" onClick={finishStrand} className={cta}>Done</button>}
            </div>
          )}
          {(tool === 'rect' || tool === 'oval') && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {SHAPES.map(([k, label]) => <button key={k} type="button" onClick={() => pickTool(k)} aria-pressed={tool === k} className={tool === k ? on : off}>{label}</button>)}
                <label className="flex min-h-11 items-center gap-2 pl-1"><input type="checkbox" className="size-5" checked={lockShape} onChange={(e) => setLockShape(e.target.checked)} /> Keep {tool === 'rect' ? 'square' : 'circle'}</label>
              </div>
              <p className="text-slate-400">Drag from corner to corner {tool === 'oval' ? 'around a round window or wreath' : 'around a window or door'}.</p>
            </div>
          )}
          {tool === 'measure' && (
            <div className="space-y-2">
              <p className="text-slate-400">Drag across something you know, end to end. Then pick what it is:</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {onSatelliteMeasure && !design.satellite && <button type="button" onClick={satellite} className={off}>🛰 Measure on satellite</button>}
                {design.satellite && (
                  <>
                    <button type="button" onClick={() => applyMeasure(design.satellite.feet)} disabled={!measure} className={`${cta} disabled:opacity-40`}>🛰 {design.satellite.label}: {design.satellite.feet} ft</button>
                    {onSatelliteMeasure && <button type="button" onClick={satellite} className={off} aria-label="Measure on satellite again">↻</button>}
                  </>
                )}
                {MEASURE_PRESETS.map(([label, ft]) => <button key={label} type="button" onClick={() => applyMeasure(ft)} disabled={!measure} className={`${off} disabled:opacity-40`}>{label} ({ft} ft)</button>)}
                <input value={feetInput} onChange={(e) => setFeetInput(e.target.value)} inputMode="decimal" placeholder="other ft" className="min-h-11 w-24 rounded-lg border border-white/15 bg-night-900 px-2 py-1.5" />
                <button type="button" onClick={() => applyMeasure(feetInput)} disabled={!measure || !feetInput} className={`${cta} disabled:opacity-40`}>Set</button>
              </div>
            </div>
          )}
          {tool === 'erase' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-400">Rub over the bulbs to remove (e.g. in front of a tree trunk). Zoom in for small spots.</span>
              <label className="flex items-center gap-1.5">Brush<input type="range" className="h-11" min="8" max="60" step="2" value={brushPx} onChange={(e) => setBrushPx(Number(e.target.value))} /></label>
            </div>
          )}
          {tool === 'decor' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(DECORATIONS).map(([k, v]) => <button key={k} type="button" onClick={() => setDecor(k)} className={decor === k ? on : off}>{v.label}</button>)}
              <span className="text-slate-400">Tap the photo to place it.</span>
            </div>
          )}
          {tool === 'select' && !selStrand && !selDecor && (
            <p className="text-slate-400">{simple
              ? 'Tap a strand or shape to change it. Tap an empty spot to start drawing lights there.'
              : 'Tap a strand, shape or decoration to change it. Drag empty space to move around the photo. Tap an empty spot to start drawing lights there.'}</p>
          )}
          {tool === 'select' && selStrand && !selStrand.shape && (
            <p className="text-slate-400">{simple
              ? `Drag a ${pinWord} to move it, ${selStrand.closed ? 'a side' : 'the line'} to bend it, ✥ to move it all.`
              : `Drag a ${pinWord} to move just that one · drag ${selStrand.closed ? 'a side' : 'the line between pins'} to bend it · drag ✥ to move the whole ${kindOf(selStrand)}.`}</p>
          )}

          {editing && (
            <div className="space-y-2 rounded-xl bg-white/5 p-2">
              {/* What's being changed, and its Delete right beside it (audit
                  2026-10-14: Delete sat a screen below the visible panel). */}
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={`mr-auto ${selStrand ? 'font-semibold capitalize' : 'text-xs uppercase tracking-wider text-slate-400'}`}>{selStrand ? strandLabel(selStrand) : 'For the next strand'}</p>
                {selStrand?.gaps?.length > 0 && <button type="button" onClick={() => patchStrand('Restored erased lights', { gaps: [] })} className={off}>Restore erased lights</button>}
                {selStrand && !selStrand.shape && selectedPoint != null && <button type="button" onClick={deletePin} className={`${off} text-berry-300`}>Delete {pinWord}</button>}
                {selStrand && <button type="button" onClick={removeSelected} className={`${off} text-berry-300`}>Delete {kindOf(selStrand)}</button>}
              </div>
              {styles.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {styles.map(([k, v]) => (
                    <button key={k} type="button" onClick={() => { setPen((p) => ({ ...p, style: k })); if (selStrand) patchStrand(`Style: ${v.label}`, { style: k, spacingIn: v.spacingIn }) }}
                      className={(selStrand?.style ?? pen.style) === k ? on : off}>{v.label}</button>
                  ))}
                </div>
              )}
              {/* One row that scrolls sideways on phones (the first ones are the
                  favorites); wrapped on big screens. */}
              <div className="flex gap-1.5 overflow-x-auto lg:flex-wrap">
                {Object.entries(COLOR_SETS).map(([name, list]) => (
                  <button key={name} type="button" onClick={() => setPenColors(list)} aria-pressed={colorName(editing.colors) === name}
                    className={`${colorName(editing.colors) === name ? on : off} shrink-0 gap-1.5 capitalize`}>
                    <span className="flex">{list.map((c) => <span key={c} className="size-3 rounded-full border border-black/40" style={{ background: COLORS[c].hex }} />)}</span>{name}
                  </button>
                ))}
              </div>
              {(multicolor || !simple || selStrand) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {(multicolor || !simple) && (
                    <label className="flex items-center gap-1.5">{simple ? 'Colors change every' : 'Pattern'}
                      <select value={editing.groupSize ?? 1} onChange={(e) => { const g = Number(e.target.value); setPen((p) => ({ ...p, groupSize: g })); if (selStrand) patchStrand(`Pattern ${g}×${g}`, { groupSize: g }) }}
                        className="min-h-11 rounded-lg border border-white/15 bg-night-900 px-2 py-1">
                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{simple ? EVERY[n - 1] : `${n}×${n}`}</option>)}
                      </select>
                    </label>
                  )}
                  {selStrand && (
                    <>
                      {!simple && (
                        <label className="flex items-center gap-1.5">Spacing
                          <input type="number" min="2" max="24" value={selStrand.spacingIn} onChange={(e) => patchStrand('Changed spacing', { spacingIn: Number(e.target.value) || 12 }, true)} className="min-h-11 w-16 rounded-lg border border-white/15 bg-night-900 px-2 py-1" />in
                        </label>
                      )}
                      <label className="flex items-center gap-1.5">{simple ? 'Size' : 'Bulb size'}
                        <input type="range" className="h-11 w-28" min="0.5" max="2.5" step="0.1" value={selStrand.size} onChange={(e) => patchStrand('Changed bulb size', { size: Number(e.target.value) }, true)} />
                      </label>
                      {!simple && <span className="text-slate-400">{Math.round(stats.perStrand.find((s) => s.id === selStrand.id)?.feet ?? 0)} ft</span>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {selDecor && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-2">
              <span className="font-semibold">{DECORATIONS[selDecor.type]?.label}</span>
              <button type="button" onClick={removeSelected} className={`${off} ml-auto text-berry-300`}>Delete</button>
              <label className="flex items-center gap-1.5">Size<input type="range" className="h-11" min="0.3" max="3" step="0.1" value={selDecor.size} onChange={(e) => patchDecor('Resized decoration', { size: Number(e.target.value) }, true)} /></label>
              <label className="flex items-center gap-1.5">Turn<input type="range" className="h-11" min="-45" max="45" step="1" value={selDecor.rotation} onChange={(e) => patchDecor('Turned decoration', { rotation: Number(e.target.value) }, true)} /></label>
            </div>
          )}

          {!simple && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span><strong>{stats.measured ? '' : '≈ '}{Math.round(stats.feet)} ft</strong> · {stats.bulbs} bulbs{stats.measured ? '' : <span className="text-glow-300"> (📏 Measure for real feet)</span>}</span>
              <label className="flex items-center gap-1.5">$/ft
                <input type="number" min="0" step="0.25" value={design.pricePerFoot ?? ''} onChange={(e) => update('Changed price per foot', (x) => { x.pricePerFoot = e.target.value ? Number(e.target.value) : null; return x }, true)} className="min-h-11 w-20 rounded-lg border border-white/15 bg-night-900 px-2 py-1" />
              </label>
              {stats.price != null && <strong className="text-glow-300">≈ ${stats.price.toLocaleString()}</strong>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
