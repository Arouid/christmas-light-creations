import { useMemo, useState } from 'react'
import { INSTALL_STATUSES, TAKEDOWN_STATUSES } from '../lib/customers'
import { matchesView, statusKey } from '../lib/views'
import BulkEmail from './BulkEmail'
import SeasonResults from './SeasonResults'
import { blankFor, select } from './ui'

export default function SeasonView({ customers, season, gates, onOpen, onUpdate }) {
  const [mode, setMode] = useState('install')
  const [stage, setStage] = useState('all')
  const [area, setArea] = useState('')
  const [type, setType] = useState('')
  const list = mode === 'takedown' ? TAKEDOWN_STATUSES : INSTALL_STATUSES

  const areas = useMemo(() => [...new Set(customers.map((c) => c.locationBlock).filter(Boolean))].sort(), [customers])
  const base = { mode, areas: area ? [area] : [], installType: type }
  const inFilters = customers.filter((c) => matchesView(c, base, season))
  const statusOf = (c) => c.seasons?.[season]?.[statusKey(mode)] ?? ''

  const counts = new Map(list.map((s) => [s, 0]))
  inFilters.forEach((c) => counts.set(statusOf(c), (counts.get(statusOf(c)) ?? 0) + 1))
  const shown = stage === 'all' ? inFilters : inFilters.filter((c) => statusOf(c) === stage)

  return (
    <>
      <div className="flex gap-2" role="tablist" aria-label="Install or takedown">
        {['install', 'takedown'].map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setStage('all') }}
            className={`flex-1 rounded-xl py-2.5 font-semibold capitalize lg:flex-none lg:px-8 ${mode === m ? 'bg-white text-night-950' : 'bg-white/10'}`}>
            {m}s {season}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:flex lg:items-center">
        <select value={area} onChange={(e) => setArea(e.target.value)} className={select} aria-label="Location block">
          <option value="">All areas</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={select} aria-label="Install type">
          <option value="">Early + regular</option>
          <option>Early Install</option>
          <option>Regular Install</option>
        </select>
        <div className="col-span-2 lg:ml-auto"><BulkEmail rows={shown} season={season} onUpdate={onUpdate} /></div>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2" aria-label="Filter by status">
        <button type="button" onClick={() => setStage('all')}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${stage === 'all' ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
          All <span className="opacity-70">{inFilters.length}</span>
        </button>
        {[...counts].filter(([, n]) => n > 0).map(([s, n]) => (
          <button key={s || 'blank'} type="button" onClick={() => setStage(s)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${stage === s ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
            {s || blankFor(mode)} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-2">
        <SeasonResults rows={shown} mode={mode} season={season} gates={gates} onOpen={onOpen} onUpdate={onUpdate}
          columns={['name', 'area', 'type', 'week', 'day', 'date', 'timeframe', 'status', 'ask', 'review']} />
      </div>
    </>
  )
}
