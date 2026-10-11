import { useEffect, useRef, useState } from 'react'

// Desktop table with click-to-sort headers. Each column:
// { key, label, get(row) -> sort/display text, render?(row) -> cell, className? }
// Wide tables scroll sideways, with ◀ ▶ buttons at each end of the row above
// with a slider between them, and the first column pinned (owner 2026-10-10).
export default function DataTable({ rows, columns, onRowClick, label }) {
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const box = useRef(null)
  const hint = useRef(null)
  const slider = useRef(null)
  const col = columns.find((c) => c.key === sort.key)
  const sorted = col
    ? [...rows].sort((a, b) => sort.dir * String(col.get(a) ?? '').localeCompare(String(col.get(b) ?? ''), undefined, { numeric: true }))
    : rows

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))
  const slide = (dir) => box.current?.scrollBy({ left: dir * Math.round(box.current.clientWidth * 0.7), behavior: 'smooth' })

  // Show the ◀ ▶ row only when the table is wider than its box: measured
  // right away and again whenever the box changes size (no state: hidden tabs
  // never paint, so frame-based checks would never run).
  useEffect(() => {
    const el = box.current
    const row = hint.current
    if (!el || !row) return
    const sync = () => { if (slider.current) slider.current.value = String(el.scrollLeft) }
    const check = () => {
      const max = el.scrollWidth - el.clientWidth
      row.hidden = !(max > 1)
      if (slider.current) slider.current.max = String(Math.max(0, max))
      sync()
    }
    check()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check)
    ro?.observe(el)
    window.addEventListener('resize', check)
    el.addEventListener('scroll', sync)
    return () => { ro?.disconnect(); window.removeEventListener('resize', check); el.removeEventListener('scroll', sync) }
  }, [columns.length, rows.length])

  const pin = (i, bg) => (i === 0 ? `sticky left-0 z-10 ${bg}` : '')

  return (
    <div>
      <div ref={hint} hidden className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => slide(-1)} aria-label="Scroll table left" className="size-11 shrink-0 rounded-full border border-white/20 font-semibold hover:bg-white/10">◀</button>
        {/* Drag to slide the table sideways; kept in step with the table's own scrolling. */}
        <input ref={slider} type="range" min="0" max="0" defaultValue="0" aria-label="Slide the table sideways"
          onInput={(e) => { if (box.current) box.current.scrollLeft = Number(e.target.value) }}
          className="range-slim mx-3 h-11 min-w-0 flex-1 cursor-pointer" />
        <button type="button" onClick={() => slide(1)} aria-label="Scroll table right" className="size-11 shrink-0 rounded-full border border-white/20 font-semibold hover:bg-white/10">▶</button>
      </div>
      <div ref={box} className="overflow-x-auto rounded-2xl border border-white/10 bg-night-900">
        <table className="w-full text-left text-sm" aria-label={label}>
          <thead className="sticky top-0 z-20 bg-night-800 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              {columns.map((c, i) => (
                <th key={c.key} scope="col" className={`px-3 py-2.5 font-semibold ${c.className ?? ''} ${pin(i, 'z-30 bg-night-800')}`}
                  aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-slate-100">
                    {c.label}
                    <span className="w-3 text-glow-400">{sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((row) => (
              <tr key={row.id} onClick={() => onRowClick?.(row.id)} className="group cursor-pointer hover:bg-white/5">
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className ?? ''} ${pin(i, 'bg-night-900 group-hover:bg-night-800')}`}>{c.render ? c.render(row) : (c.get(row) || '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
