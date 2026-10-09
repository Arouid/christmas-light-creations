import { useEffect, useMemo, useRef, useState } from 'react'
import { dist, hitStrand } from './geometry.js'
import { loadImage } from './image.js'
import { COLORS, COLOR_SETS, DECORATIONS, STYLES, newDecoration, newDesign, newStrand, normalize, pxPerFoot } from './model.js'
import { renderDesign } from './render.js'
import { designStats, scaleFrom } from './stats.js'

const btn = 'rounded-full px-3 py-2 text-sm font-semibold'
const off = `${btn} bg-white/10 hover:bg-white/15`
const on = `${btn} bg-glow-400 text-night-950`
const TOOLS = [['select', '👆 Select'], ['draw', '✏️ Lights'], ['decor', '🎀 Decorate'], ['measure', '📏 Measure']]

// The light designer: draw lights on a house photo, measure, export.
// Standalone: give it a photo and (optionally) a saved design; it calls
// onSave(design, { blob }) and onClose(). No app/database code in here.
export default function Designer({ photo, design: initial, defaults = {}, title = 'Light design', brand = '', onSave, onClose }) {
  const canvas = useRef(null)
  const [img, setImg] = useState(null)
  const [hist, setHist] = useState(() => ({ list: [initial ? normalize(initial) : newDesign({ width: photo.width, height: photo.height, pricePerFoot: defaults.pricePerFoot ?? null })], at: 0 }))
  const design = hist.list[hist.at]
  const [live, setLive] = useState(null) // design while dragging (not in history yet)
  const shown = live ?? design
  const [tool, setTool] = useState(design.strands.length ? 'select' : 'draw')
  const [draft, setDraft] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [pen, setPen] = useState({ style: 'c9', colors: ['warm'], groupSize: 1 })
  const [decor, setDecor] = useState('wreath')
  const [before, setBefore] = useState(false)
  const [measure, setMeasure] = useState(null) // { a, b }
  const [feetInput, setFeetInput] = useState('')
  const [busy, setBusy] = useState(null)
  const drag = useRef(null)

  useEffect(() => { loadImage(photo.src).then(setImg).catch(() => setBusy('Couldn’t load the photo.')) }, [photo.src])

  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    renderDesign(c.getContext('2d'), shown, img, { before, handles: !before, selectedId, draft, measure: measure && { ...measure } })
  }, [shown, img, before, selectedId, draft, measure])

  const stats = useMemo(() => designStats(design), [design])
  const commit = (next) => { setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), next].slice(-60), at: Math.min(h.at + 1, 59) })); setLive(null) }
  const update = (fn) => commit(fn(structuredClone(design)))
  const undo = () => setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }))
  const redo = () => setHist((h) => ({ ...h, at: Math.min(h.list.length - 1, h.at + 1) }))

  const selStrand = design.strands.find((s) => s.id === selectedId)
  const selDecor = design.decorations.find((d) => d.id === selectedId)

  function toImg(e) {
    const r = canvas.current.getBoundingClientRect()
    return [((e.clientX - r.left) * design.photo.width) / r.width, ((e.clientY - r.top) * design.photo.height) / r.height]
  }
  const tol = () => (14 * design.photo.width) / canvas.current.getBoundingClientRect().width

  function down(e) {
    // Ignore taps before the photo has a size on screen (would give NaN points).
    if (before || !img || !canvas.current.getBoundingClientRect().width) return
    canvas.current.setPointerCapture(e.pointerId)
    const p = toImg(e)
    if (tool === 'draw') return setDraft((d) => [...d, p])
    if (tool === 'measure') { setMeasure({ a: p, b: p }); drag.current = { kind: 'measure' }; return }
    if (tool === 'decor') {
      const d = newDecoration(decor, p[0], p[1])
      update((x) => { x.decorations.push(d); return x })
      setSelectedId(d.id)
      setTool('select')
      return
    }
    // Select: decorations first (on top), then strand handles, then lines.
    const ppf = pxPerFoot(design)
    const dec = [...design.decorations].reverse().find((d) => dist(p, [d.x, d.y]) <= ((DECORATIONS[d.type]?.sizeFt ?? 2) * ppf * (d.size || 1)) / 2)
    if (dec) { setSelectedId(dec.id); drag.current = { kind: 'decor', id: dec.id, from: p, orig: [dec.x, dec.y] }; return }
    const hit = hitStrand(design.strands, p, tol())
    if (!hit) return setSelectedId(null)
    setSelectedId(hit.id)
    const s = design.strands.find((x) => x.id === hit.id)
    drag.current = hit.pointIndex != null ? { kind: 'point', id: hit.id, i: hit.pointIndex } : { kind: 'strand', id: hit.id, from: p, orig: s.points }
  }

  function move(e) {
    const g = drag.current
    if (!g) return
    const p = toImg(e)
    if (g.kind === 'measure') return setMeasure((m) => ({ ...m, b: p }))
    const next = structuredClone(design)
    if (g.kind === 'point') next.strands.find((s) => s.id === g.id).points[g.i] = p
    if (g.kind === 'strand') next.strands.find((s) => s.id === g.id).points = g.orig.map(([x, y]) => [x + p[0] - g.from[0], y + p[1] - g.from[1]])
    if (g.kind === 'decor') { const d = next.decorations.find((x) => x.id === g.id); d.x = g.orig[0] + p[0] - g.from[0]; d.y = g.orig[1] + p[1] - g.from[1] }
    g.moved = true
    setLive(next)
  }

  function up() {
    const g = drag.current
    drag.current = null
    if (!g) return
    if (g.kind === 'measure') return
    if (g.moved && live) commit(live)
    else setLive(null)
  }

  function finishStrand() {
    if (draft.length >= 2) {
      const s = { ...newStrand(pen.style, pen.colors), groupSize: pen.groupSize, points: draft }
      update((x) => { x.strands.push(s); return x })
    }
    setDraft([])
  }
  function applyMeasure() {
    const scale = measure && scaleFrom(measure.a, measure.b, Number(feetInput))
    if (!scale) return setBusy('Draw a line over something you know, then type its length in feet.')
    update((x) => { x.scale = scale; return x })
    setMeasure(null)
    setFeetInput('')
    setBusy(null)
    setTool('select')
  }
  const patchStrand = (p) => update((x) => { Object.assign(x.strands.find((s) => s.id === selectedId), p); return x })
  const patchDecor = (p) => update((x) => { Object.assign(x.decorations.find((d) => d.id === selectedId), p); return x })
  const removeSelected = () => { update((x) => { x.strands = x.strands.filter((s) => s.id !== selectedId); x.decorations = x.decorations.filter((d) => d.id !== selectedId); return x }); setSelectedId(null) }
  const setPenColors = (colors) => { setPen((p) => ({ ...p, colors })); if (selStrand) patchStrand({ colors }) }

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
    } catch (e) {
      setBusy(`Couldn’t save: ${e.message}`)
    }
  }

  const colorKey = (list) => Object.entries(COLOR_SETS).find(([, v]) => v.join() === list.join())?.[0]
  const editing = selStrand ?? (tool === 'draw' ? pen : null)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night-950" role="dialog" aria-modal="true" aria-label={title}>
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button type="button" onClick={onClose} className={off}>✕</button>
        <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>
        <button type="button" onClick={undo} disabled={hist.at === 0} className={`${off} disabled:opacity-30`} aria-label="Undo">↶</button>
        <button type="button" onClick={redo} disabled={hist.at >= hist.list.length - 1} className={`${off} disabled:opacity-30`} aria-label="Redo">↷</button>
        <button type="button" onClick={download} className={off}>⬇ Image</button>
        {onSave && <button type="button" onClick={save} className={on}>Save</button>}
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-3 py-2">
        {TOOLS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => { if (draft.length) finishStrand(); setTool(k); setMeasure(null) }} className={tool === k ? on : off}>{label}</button>
        ))}
        <button type="button" onPointerDown={() => setBefore(true)} onPointerUp={() => setBefore(false)} onPointerLeave={() => setBefore(false)} className={`${off} ml-auto`}>Hold: before</button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <canvas ref={canvas} width={design.photo.width} height={design.photo.height}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          className="mx-auto block h-auto max-h-full w-auto max-w-full touch-none select-none" style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }} />
        {!img && <p className="absolute inset-0 grid place-items-center text-slate-400">Loading photo…</p>}
      </div>

      <div className="max-h-[42vh] space-y-2 overflow-y-auto border-t border-white/10 px-3 py-2 text-sm">
        {busy && <p className="text-glow-300" role="status">{busy}</p>}

        {tool === 'draw' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">{draft.length ? `${draft.length} points: keep tapping along the roofline.` : 'Tap along a roofline, corner to corner.'}</span>
            {draft.length > 0 && <button type="button" onClick={() => setDraft((d) => d.slice(0, -1))} className={off}>Undo point</button>}
            <button type="button" onClick={finishStrand} disabled={draft.length < 2} className={`${on} disabled:opacity-40`}>Done with this strand</button>
          </div>
        )}
        {tool === 'measure' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Drag across something you know (garage door ≈ 16 ft, front door ≈ 3 ft), then:</span>
            <input value={feetInput} onChange={(e) => setFeetInput(e.target.value)} inputMode="decimal" placeholder="feet" className="w-20 rounded-lg border border-white/15 bg-night-900 px-2 py-1.5" />
            <button type="button" onClick={applyMeasure} className={on}>Set scale</button>
          </div>
        )}
        {tool === 'decor' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(DECORATIONS).map(([k, v]) => <button key={k} type="button" onClick={() => setDecor(k)} className={decor === k ? on : off}>{v.label}</button>)}
            <span className="text-slate-400">Tap the photo to place it.</span>
          </div>
        )}

        {editing && (
          <div className="space-y-2 rounded-xl bg-white/5 p-2">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STYLES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => { setPen((p) => ({ ...p, style: k })); if (selStrand) patchStrand({ style: k, spacingIn: v.spacingIn }) }}
                  className={(selStrand?.style ?? pen.style) === k ? on : off}>{v.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(COLOR_SETS).map(([name, list]) => (
                <button key={name} type="button" onClick={() => setPenColors(list)}
                  className={`${colorKey(editing.colors) === name ? on : off} inline-flex items-center gap-1.5 capitalize`}>
                  <span className="flex">{list.map((c) => <span key={c} className="size-3 rounded-full border border-black/40" style={{ background: COLORS[c].hex }} />)}</span>{name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5">Pattern
                <select value={editing.groupSize ?? 1} onChange={(e) => { const g = Number(e.target.value); setPen((p) => ({ ...p, groupSize: g })); if (selStrand) patchStrand({ groupSize: g }) }}
                  className="rounded-lg border border-white/15 bg-night-900 px-2 py-1">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}×{n}</option>)}
                </select>
              </label>
              {selStrand && (
                <>
                  <label className="flex items-center gap-1.5">Spacing
                    <input type="number" min="2" max="24" value={selStrand.spacingIn} onChange={(e) => patchStrand({ spacingIn: Number(e.target.value) || 12 })} className="w-16 rounded-lg border border-white/15 bg-night-900 px-2 py-1" />in
                  </label>
                  <label className="flex items-center gap-1.5">Bulb size
                    <input type="range" min="0.5" max="2.5" step="0.1" value={selStrand.size} onChange={(e) => patchStrand({ size: Number(e.target.value) })} />
                  </label>
                  <span className="text-slate-400">{Math.round(stats.perStrand.find((s) => s.id === selStrand.id)?.feet ?? 0)} ft</span>
                  <button type="button" onClick={removeSelected} className={`${off} ml-auto text-berry-500`}>Delete strand</button>
                </>
              )}
            </div>
          </div>
        )}
        {selDecor && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-2">
            <span className="font-semibold">{DECORATIONS[selDecor.type]?.label}</span>
            <label className="flex items-center gap-1.5">Size<input type="range" min="0.3" max="3" step="0.1" value={selDecor.size} onChange={(e) => patchDecor({ size: Number(e.target.value) })} /></label>
            <label className="flex items-center gap-1.5">Turn<input type="range" min="-45" max="45" step="1" value={selDecor.rotation} onChange={(e) => patchDecor({ rotation: Number(e.target.value) })} /></label>
            <button type="button" onClick={removeSelected} className={`${off} ml-auto text-berry-500`}>Delete</button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2">🌙 Night
            <input type="range" min="0" max="1" step="0.05" value={design.night} onChange={(e) => setLive({ ...design, night: Number(e.target.value) })} onPointerUp={(e) => commit({ ...design, night: Number(e.target.value) })} />
          </label>
          <span><strong>{stats.measured ? '' : '≈ '}{Math.round(stats.feet)} ft</strong> · {stats.bulbs} bulbs{stats.measured ? '' : <span className="text-glow-300"> (tap 📏 Measure for real feet)</span>}</span>
          <label className="flex items-center gap-1.5">$/ft
            <input type="number" min="0" step="0.25" value={design.pricePerFoot ?? ''} onChange={(e) => update((x) => { x.pricePerFoot = e.target.value ? Number(e.target.value) : null; return x })} className="w-20 rounded-lg border border-white/15 bg-night-900 px-2 py-1" />
          </label>
          {stats.price != null && <strong className="text-glow-300">≈ ${stats.price.toLocaleString()}</strong>}
        </div>
      </div>
    </div>
  )
}
