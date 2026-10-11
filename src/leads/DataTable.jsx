import { useEffect, useRef, useState } from 'react'

// Desktop table with click-to-sort headers. Each column:
// { key, label, get(row) -> sort/display text, render?(row) -> cell, className? }
// Wide tables scroll sideways inside a screen-high box (so the scrollbar is
// always in reach), with ◀ ▶ buttons and the first column pinned.
export default function DataTable({ rows, columns, onRowClick, label }) {
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const box = useRef(null)
  const hint = useRef(null)
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
    const check = () => { row.hidden = !(el.scrollWidth > el.clientWidth + 1) }
    check()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check)
    ro?.observe(el)
    window.addEventListener('resize', check)
    return () => { ro?.disconnect(); window.removeEventListener('resize', check) }
  }, [columns.length, rows.length])

  const pin = (i, bg) => (i === 0 ? `sticky left-0 z-10 ${bg}` : '')

  return (
    <div>
      <div ref={hint} hidden className="mb-2 flex items-center justify-end gap-2 text-sm text-slate-300">
        <span>The table is wider than the screen. Scroll it:</span>
        <button type="button" onClick={() => slide(-1)} aria-label="Scroll table left" className="min-h-11 rounded-full border border-white/20 px-4 font-semibold hover:bg-white/10">◀ Left</button>
        <button type="button" onClick={() => slide(1)} aria-label="Scroll table right" className="min-h-11 rounded-full bg-glow-400 px-4 font-semibold text-night-950 hover:bg-glow-300">Right ▶</button>
      </div>
      <div ref={box} className="max-h-[calc(100svh-12rem)] overflow-auto rounded-2xl border border-white/10 bg-night-900">
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
