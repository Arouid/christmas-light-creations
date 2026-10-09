import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MOVE_HANDLE_OFFSET, addGap, boxCorners, boxFrom, dist, hitOnStrand, hitStrand, length, shapePoints, strandCenter } from './geometry.js'
import { loadImage } from './image.js'
import { COLORS, COLOR_SETS, DECORATIONS, STYLES, newDecoration, newDesign, newStrand, normalize, pxPerFoot } from './model.js'
import { renderDesign } from './render.js'
import { designStats, scaleFrom, strandBulbs } from './stats.js'

const btn = 'rounded-full px-3 py-2 text-sm font-semibold'
const off = `${btn} bg-white/10 hover:bg-white/15`
const on = `${btn} bg-glow-400 text-night-950`
const TOOLS = [['select', '👆 Select'], ['draw', '✏️ Lights'], ['rect', '▭ Rectangle'], ['oval', '◯ Oval'], ['erase', '🧽 Erase'], ['decor', '🎀 Decorate'], ['measure', '📏 Measure']]
// Common things to measure from, so setting the scale is two taps.
const MEASURE_PRESETS = [['Double garage door', 16], ['Single garage door', 8], ['Front door', 3]]
const TAP_SLOP = 10 // screen px a finger can wander and still count as a tap
const colorName = (list) => Object.entries(COLOR_SETS).find(([, v]) => v.join() === list.join())?.[0] ?? 'custom colors'

// The light designer: draw lights on a house photo, measure, export.
// Standalone: give it a photo and (optionally) a saved design; it calls
// onSave(design, { blob, stats }) and onClose(). No app/database code here.
export default function Designer({ photo, design: initial, defaults = {}, title = 'Light design', brand = '', onSave, onClose }) {
  const canvas = useRef(null)
  const box = useRef(null) // the viewport the photo is zoomed/panned inside
  const [img, setImg] = useState(null)
  const [hist, setHist] = useState(() => ({
    list: [{ d: initial ? normalize(initial) : newDesign({ width: photo.width, height: photo.height, pricePerFoot: defaults.pricePerFoot ?? null }), label: initial ? 'Opened' : 'New design' }],
    at: 0,
  }))
  const design = hist.list[hist.at].d
  const [live, setLive] = useState(null) // design mid-drag (not in history yet)
  const shown = live ?? design
  const [tool, setTool] = useState(design.strands.length ? 'select' : 'draw')
  const [draft, setDraft] = useState([])
  const [draftShape, setDraftShape] = useState(null)
  const [lockShape, setLockShape] = useState(false)
  const [selectedId, setSelectedIdRaw] = useState(null)
  const [selectedPoint, setSelectedPoint] = useState(null) // pin index on the selected line
  const setSelectedId = (id) => { setSelectedIdRaw(id); if (id !== selectedId) setSelectedPoint(null) }
  const [pen, setPen] = useState({ style: 'c9', colors: ['warm'], groupSize: 1 })
  const [decor, setDecor] = useState('wreath')
  const [before, setBefore] = useState(false)
  const [measure, setMeasure] = useState(null) // { a, b }
  const [feetInput, setFeetInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [brushPx, setBrushPx] = useState(22) // eraser size in screen pixels
  const [brush, setBrush] = useState(null) // eraser ring position (photo px)
  const [busy, setBusy] = useState(null)
  // View: fit size of the photo in the viewport, plus zoom and pan.
  const [fit, setFit] = useState({ w: 0, h: 0, cw: 0, ch: 0 })
  const [view, setView] = useState({ z: 1, x: 0, y: 0 })
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  useEffect(() => { loadImage(photo.src).then(setImg).catch(() => setBusy('Couldn’t load the photo.')) }, [photo.src])

  // Fit the photo to the viewport (and re-fit when the screen size changes).
  const refit = useCallback(() => {
    const el = box.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    const k = Math.min(cw / photo.width, ch / photo.height)
    const w = photo.width * k
    const h = photo.height * k
    setFit({ w, h, cw, ch })
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

  const stats = useMemo(() => designStats(design), [design])
  const commit = (next, label) => {
    setHist((h) => {
      const list = [...h.list.slice(0, h.at + 1), { d: next, label }].slice(-80)
      return { list, at: list.length - 1 }
    })
    setLive(null)
  }
  const update = (label, fn) => commit(fn(structuredClone(design)), label)
  const undo = () => setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }))
  const redo = () => setHist((h) => ({ ...h, at: Math.min(h.list.length - 1, h.at + 1) }))

  const selStrand = design.strands.find((s) => s.id === selectedId)
  const selDecor = design.decorations.find((d) => d.id === selectedId)
  const strandLabel = (s) => `${s.shape ? (s.shape.type === 'rect' ? 'rectangle' : 'oval') : 'strand'} (${STYLES[s.style]?.label ?? s.style}, ${colorName(s.colors)})`

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
  // Escape deselects or finishes the line being drawn, Ctrl+Z / Ctrl+Y undo/redo.
  useEffect(() => {
    const onKey = (e) => {
      if (/^(input|textarea|select)$/i.test(e.target?.tagName ?? '')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); if (selectedPoint != null) deletePin(); else removeSelected() }
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
    if (before || !img || !fit.w) return
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
    if (tool === 'draw' || tool === 'decor') { gesture.current = { kind: 'tap', ...start }; return }
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
      const on = hitOnStrand(selStrand.points, p, tol())
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

  // Eraser: every bulb under the brush gets a gap around it (half a spacing
  // each side), so it disappears and its footage no longer counts.
  function eraseAt(base, p) {
    const r = brushPx * pxPerScreenPx
    const ppf = pxPerFoot(base)
    let changed = false
    const next = { ...base, strands: base.strands.map((st) => {
      const L = length(st.points)
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
    if (g.kind === 'pan') { if (g.deselect && !g.panned) setSelectedId(null); return }
    if (g.kind === 'measure') return
    if (g.kind === 'newShape') {
      const shape = draftShape
      setDraftShape(null)
      if (!shape || shape.w < 4 * pxPerScreenPx || shape.h < 4 * pxPerScreenPx) return
      const s = { ...newStrand(pen.style, pen.colors), groupSize: pen.groupSize, shape: { ...shape, lock: lockShape }, points: shapePoints(shape) }
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
      const s = { ...newStrand(pen.style, pen.colors), groupSize: pen.groupSize, points: draft }
      update(`Added ${strandLabel(s)}`, (x) => { x.strands.push(s); return x })
    }
    setDraft([])
  }
  function applyMeasure(feet) {
    const scale = measure && scaleFrom(measure.a, measure.b, Number(feet))
    if (!scale || dist(measure.a, measure.b) < 4) return setBusy('First drag across something you know (end to end), then pick or type its length.')
    update(`Set scale (${feet} ft)`, (x) => { x.scale = scale; return x })
    setMeasure(null)
    setFeetInput('')
    setBusy(null)
    setTool('select')
  }
  const patchStrand = (label, p) => update(label, (x) => { Object.assign(x.strands.find((s) => s.id === selectedId), p); return x })
  const patchDecor = (label, p) => update(label, (x) => { Object.assign(x.decorations.find((d) => d.id === selectedId), p); return x })
  function removeSelected() {
    const what = selStrand ? strandLabel(selStrand) : DECORATIONS[selDecor?.type]?.label.toLowerCase() ?? 'item'
    update(`Deleted ${what}`, (x) => { x.strands = x.strands.filter((s) => s.id !== selectedId); x.decorations = x.decorations.filter((d) => d.id !== selectedId); return x })
    setSelectedId(null)
  }
  function deletePin() {
    if (!selStrand || selectedPoint == null) return
    if (selStrand.points.length <= 2) return removeSelected() // a line needs 2 pins
    update('Deleted a pin', (x) => { x.strands.find((st) => st.id === selectedId).points.splice(selectedPoint, 1); return x })
    setSelectedPoint(null)
  }
  const setPenColors = (colors) => { setPen((p) => ({ ...p, colors })); if (selStrand) patchStrand(`Colors: ${colorName(colors)}`, { colors }) }
  // Switching tools clears the selection, so color picks apply to what you
  // draw next, not to the last thing you drew.
  const pickTool = (k) => { if (draft.length) finishStrand(); setTool(k); setMeasure(null); setDraftShape(null); if (k !== 'select') setSelectedId(null) }

  async function exportBlob() {
    const c = document.createElement('canvas')
    c.width = design.photo.width
    c.height = design.photo.height
    const ctx = c.getContext('2d')
    renderDesign(ctx, design, img)
    if (brand) {
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
  async function download() {
    const blob = await exportBlob()
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${(design.name || title).replace(/[^\w-]+/g, '-')}.jpg` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }
  async function save() {
    setBusy('Saving…')
    try {
      await onSave?.(design, { blob: await exportBlob(), stats })
      setBusy('Saved ✓')
      setTimeout(() => setBusy(null), 1500)
    } catch (err) {
      setBusy(`Couldn’t save: ${err.message}`)
    }
  }

  // The palette always stays on screen (it used to vanish after a delete):
  // it edits the selected strand, or sets up the next one when none is selected.
  // Hidden only while a decoration is selected or for measuring/decorating.
  const editing = selStrand ?? (selDecor || tool === 'measure' || tool === 'decor' ? null : pen)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night-950" role="dialog" aria-modal="true" aria-label={title}>
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button type="button" onClick={onClose} className={off} aria-label="Close designer">✕</button>
        <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>
        <button type="button" onClick={undo} disabled={hist.at === 0} className={`${off} disabled:opacity-30`} aria-label="Undo">↶</button>
        <button type="button" onClick={redo} disabled={hist.at >= hist.list.length - 1} className={`${off} disabled:opacity-30`} aria-label="Redo">↷</button>
        <button type="button" onClick={() => setShowHistory((v) => !v)} className={showHistory ? on : off}>History</button>
        <button type="button" onClick={download} className={off}>⬇ Image</button>
        {onSave && <button type="button" onClick={save} className={on}>Save</button>}
      </header>

      <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-2">
        {TOOLS.map(([k, label]) => <button key={k} type="button" onClick={() => pickTool(k)} className={`${tool === k ? on : off} shrink-0`}>{label}</button>)}
      </div>

      <div ref={box} className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ cursor: tool === 'select' ? 'default' : tool === 'erase' ? 'cell' : 'crosshair' }}
        onPointerLeave={() => setBrush(null)}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, width: fit.w, height: fit.h }}>
          <canvas ref={canvas} width={photo.width} height={photo.height} className="block h-full w-full" />
        </div>
        {!img && <p className="absolute inset-0 grid place-items-center text-slate-400">Loading photo…</p>}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => zoomButton(1.5)} className="grid size-10 place-items-center rounded-full bg-night-900/90 text-lg font-bold" aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomButton(1 / 1.5)} className="grid size-10 place-items-center rounded-full bg-night-900/90 text-lg font-bold" aria-label="Zoom out">−</button>
          <button type="button" onClick={refit} className="grid size-10 place-items-center rounded-full bg-night-900/90 text-xs font-bold" aria-label="Fit photo">Fit</button>
        </div>
        <button type="button" onPointerDown={(e) => { e.stopPropagation(); setBefore(true) }} onPointerUp={() => setBefore(false)} onPointerLeave={() => setBefore(false)}
          className="absolute bottom-2 left-2 rounded-full bg-night-900/90 px-3 py-2 text-sm font-semibold">Hold: before</button>

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
      </div>

      <div className="max-h-[42vh] space-y-2 overflow-y-auto border-t border-white/10 px-3 py-2 text-sm">
        {busy && <p className="text-glow-300" role="status">{busy}</p>}

        {tool === 'draw' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">{draft.length ? `${draft.length} points: keep tapping along the roofline.` : 'Tap along a roofline, corner to corner. Two fingers to zoom.'}</span>
            {draft.length > 0 && <button type="button" onClick={() => setDraft((d) => d.slice(0, -1))} className={off}>Undo point</button>}
            <button type="button" onClick={finishStrand} disabled={draft.length < 2} className={`${on} disabled:opacity-40`}>Done with this strand</button>
          </div>
        )}
        {(tool === 'rect' || tool === 'oval') && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400">Drag from corner to corner{tool === 'oval' ? ' (around a round window or wreath)' : ' (around a window or door)'}.</span>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={lockShape} onChange={(e) => setLockShape(e.target.checked)} /> Keep {tool === 'rect' ? 'square' : 'circle'}</label>
          </div>
        )}
        {tool === 'measure' && (
          <div className="space-y-2">
            <p className="text-slate-400">Drag across something you know, end to end. Then pick what it is:</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {MEASURE_PRESETS.map(([label, ft]) => <button key={label} type="button" onClick={() => applyMeasure(ft)} disabled={!measure} className={`${off} disabled:opacity-40`}>{label} ({ft} ft)</button>)}
              <input value={feetInput} onChange={(e) => setFeetInput(e.target.value)} inputMode="decimal" placeholder="other ft" className="w-24 rounded-lg border border-white/15 bg-night-900 px-2 py-1.5" />
              <button type="button" onClick={() => applyMeasure(feetInput)} disabled={!measure || !feetInput} className={`${on} disabled:opacity-40`}>Set</button>
            </div>
          </div>
        )}
        {tool === 'erase' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400">Rub over the bulbs to remove (e.g. in front of a tree trunk). Zoom in for small spots.</span>
            <label className="flex items-center gap-1.5">Brush<input type="range" min="8" max="60" step="2" value={brushPx} onChange={(e) => setBrushPx(Number(e.target.value))} /></label>
          </div>
        )}
        {tool === 'decor' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(DECORATIONS).map(([k, v]) => <button key={k} type="button" onClick={() => setDecor(k)} className={decor === k ? on : off}>{v.label}</button>)}
            <span className="text-slate-400">Tap the photo to place it.</span>
          </div>
        )}
        {tool === 'select' && !selStrand && !selDecor && <p className="text-slate-400">Tap a strand, shape or decoration to change it. Drag empty space to move around the photo.</p>}
        {tool === 'select' && selStrand && !selStrand.shape && <p className="text-slate-400">Drag a pin to move just that pin · drag the line between pins to bend it · drag ✥ to move the whole strand.</p>}

        {editing && (
          <div className="space-y-2 rounded-xl bg-white/5 p-2">
            <p className={selStrand ? 'font-semibold capitalize' : 'text-xs uppercase tracking-wider text-slate-400'}>{selStrand ? strandLabel(selStrand) : 'For the next strand'}</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STYLES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => { setPen((p) => ({ ...p, style: k })); if (selStrand) patchStrand(`Style: ${v.label}`, { style: k, spacingIn: v.spacingIn }) }}
                  className={(selStrand?.style ?? pen.style) === k ? on : off}>{v.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(COLOR_SETS).map(([name, list]) => (
                <button key={name} type="button" onClick={() => setPenColors(list)}
                  className={`${colorName(editing.colors) === name ? on : off} inline-flex items-center gap-1.5 capitalize`}>
                  <span className="flex">{list.map((c) => <span key={c} className="size-3 rounded-full border border-black/40" style={{ background: COLORS[c].hex }} />)}</span>{name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5">Pattern
                <select value={editing.groupSize ?? 1} onChange={(e) => { const g = Number(e.target.value); setPen((p) => ({ ...p, groupSize: g })); if (selStrand) patchStrand(`Pattern ${g}×${g}`, { groupSize: g }) }}
                  className="rounded-lg border border-white/15 bg-night-900 px-2 py-1">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}×{n}</option>)}
                </select>
              </label>
              {selStrand && (
                <>
                  <label className="flex items-center gap-1.5">Spacing
                    <input type="number" min="2" max="24" value={selStrand.spacingIn} onChange={(e) => patchStrand('Changed spacing', { spacingIn: Number(e.target.value) || 12 })} className="w-16 rounded-lg border border-white/15 bg-night-900 px-2 py-1" />in
                  </label>
                  <label className="flex items-center gap-1.5">Bulb size
                    <input type="range" min="0.5" max="2.5" step="0.1" value={selStrand.size} onChange={(e) => setLive({ ...design, strands: design.strands.map((s) => (s.id === selectedId ? { ...s, size: Number(e.target.value) } : s)) })}
                      onPointerUp={(e) => patchStrand('Changed bulb size', { size: Number(e.target.value) })} />
                  </label>
                  <span className="text-slate-400">{Math.round(stats.perStrand.find((s) => s.id === selStrand.id)?.feet ?? 0)} ft</span>
                  <span className="ml-auto flex gap-1.5">
                    {selStrand.gaps?.length > 0 && <button type="button" onClick={() => patchStrand('Restored erased lights', { gaps: [] })} className={off}>Restore erased lights</button>}
                    {!selStrand.shape && selectedPoint != null && <button type="button" onClick={deletePin} className={`${off} text-berry-500`}>Delete pin</button>}
                    <button type="button" onClick={removeSelected} className={`${off} text-berry-500`}>Delete {selStrand.shape ? 'shape' : 'strand'}</button>
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {selDecor && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-2">
            <span className="font-semibold">{DECORATIONS[selDecor.type]?.label}</span>
            <label className="flex items-center gap-1.5">Size<input type="range" min="0.3" max="3" step="0.1" value={selDecor.size} onChange={(e) => patchDecor('Resized decoration', { size: Number(e.target.value) })} /></label>
            <label className="flex items-center gap-1.5">Turn<input type="range" min="-45" max="45" step="1" value={selDecor.rotation} onChange={(e) => patchDecor('Turned decoration', { rotation: Number(e.target.value) })} /></label>
            <button type="button" onClick={removeSelected} className={`${off} ml-auto text-berry-500`}>Delete</button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2">🌙 Night
            <input type="range" min="0" max="1" step="0.05" value={shown.night} onChange={(e) => setLive({ ...design, night: Number(e.target.value) })} onPointerUp={(e) => commit({ ...design, night: Number(e.target.value) }, 'Changed night level')} />
          </label>
          <span><strong>{stats.measured ? '' : '≈ '}{Math.round(stats.feet)} ft</strong> · {stats.bulbs} bulbs{stats.measured ? '' : <span className="text-glow-300"> (📏 Measure for real feet)</span>}</span>
          <label className="flex items-center gap-1.5">$/ft
            <input type="number" min="0" step="0.25" value={design.pricePerFoot ?? ''} onChange={(e) => update('Changed price per foot', (x) => { x.pricePerFoot = e.target.value ? Number(e.target.value) : null; return x })} className="w-20 rounded-lg border border-white/15 bg-night-900 px-2 py-1" />
          </label>
          {stats.price != null && <strong className="text-glow-300">≈ ${stats.price.toLocaleString()}</strong>}
        </div>
      </div>
    </div>
  )
}
