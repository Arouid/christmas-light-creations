import { useState } from 'react'

// Desktop table with click-to-sort headers. Each column:
// { key, label, get(row) -> sort/display text, render?(row) -> cell, className? }
export default function DataTable({ rows, columns, onRowClick, label }) {
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const col = columns.find((c) => c.key === sort.key)
  const sorted = col
    ? [...rows].sort((a, b) => sort.dir * String(col.get(a) ?? '').localeCompare(String(col.get(b) ?? ''), undefined, { numeric: true }))
    : rows

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-night-900">
      <table className="w-full text-left text-sm" aria-label={label}>
        <thead className="sticky top-0 bg-night-800 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-3 py-2.5 font-semibold ${c.className ?? ''}`}
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
            <tr key={row.id} onClick={() => onRowClick?.(row.id)} className="cursor-pointer hover:bg-white/5">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className ?? ''}`}>{c.render ? c.render(row) : (c.get(row) || '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
