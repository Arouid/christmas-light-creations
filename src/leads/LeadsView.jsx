import { useMemo, useState } from 'react'
import { LEAD_STATUSES, STATUS_LABELS } from '../lib/firebase'
import LeadCard from './LeadCard'

export default function LeadsView({ leads, error, onUpdate }) {
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]))
    leads?.forEach((l) => { c[l.status] = (c[l.status] ?? 0) + 1 })
    return c
  }, [leads])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (leads ?? []).filter((l) =>
      (filter === 'all' || (filter === 'open' ? !['booked', 'lost'].includes(l.status) : l.status === filter))
      && (!q || [l.firstName, l.lastName, l.city, l.address, l.phone, l.email].join(' ').toLowerCase().includes(q)))
  }, [leads, filter, search])

  const chips = [['open', 'Open', (counts.new ?? 0) + (counts.called ?? 0) + (counts['estimate-sent'] ?? 0)],
    ...LEAD_STATUSES.map((s) => [s, STATUS_LABELS[s], counts[s]]), ['all', 'All', leads?.length ?? 0]]

  return (
    <>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, phone…"
        className="block w-full rounded-xl border border-white/15 bg-night-900 px-4 py-3 text-base placeholder:text-slate-500" />
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Filter by status">
        {chips.map(([key, label, n]) => (
          <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${filter === key ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
            {label} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-berry-500" role="alert">Couldn’t load leads: {error}</p>}
      {leads === null && !error && <p className="mt-6 text-slate-400">Loading leads…</p>}
      {leads && shown.length === 0 && <p className="mt-6 text-slate-400">No leads here.</p>}
      <ul className="mt-3 space-y-3">
        {shown.map((l) => <LeadCard key={l.id} lead={l} onUpdate={onUpdate} />)}
      </ul>
    </>
  )
}
