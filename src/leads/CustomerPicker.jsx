import { useMemo, useState } from 'react'
import { INSTALL_STATUSES, TAKEDOWN_STATUSES } from '../lib/customers'
import { formatMiles, milesBetween } from '../lib/geo'
import { STOP_KINDS } from '../lib/router'
import { select } from './ui'

const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// The customer list with locations, for picking route stops: filter, sort by
// distance from home base, tick, add. Shows who's already on another route.
export default function CustomerPicker({ customers, season, home, routes, routeId, onStops, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [area, setArea] = useState('')
  const [mode, setMode] = useState('install')
  const [status, setStatus] = useState('*')
  const [type, setType] = useState('')
  const [sort, setSort] = useState(home ? 'near' : 'name')
  const [hideRouted, setHideRouted] = useState(false)
  const [picked, setPicked] = useState(() => new Set())

  const areas = useMemo(() => [...new Set(customers.map((c) => c.locationBlock).filter(Boolean))].sort(), [customers])
  // Customer -> the other open route they're on (to avoid booking twice).
  const onRoute = useMemo(() => {
    const m = new Map()
    for (const r of routes ?? []) {
      if (r.id === routeId || r.status === 'done') continue
      for (const s of r.stops ?? []) if (s.customerId && s.status !== 'done') m.set(s.customerId, r)
    }
    return m
  }, [routes, routeId])

  const key = mode === 'takedown' ? 'takedownStatus' : 'installStatus'
  const statuses = mode === 'takedown' ? TAKEDOWN_STATUSES : INSTALL_STATUSES
  const needle = q.trim().toLowerCase()
  const rows = customers
    .filter((c) => !onStops.has(c.id))
    .filter((c) => (!needle || `${c.fullName} ${c.address} ${c.neighborhood ?? ''}`.toLowerCase().includes(needle))
      && (!area || c.locationBlock === area)
      && (!type || c.installType === type)
      && (status === '*' || (c.seasons?.[season]?.[key] ?? '') === status)
      && !(hideRouted && onRoute.has(c.id)))
    .map((c) => ({ c, miles: home && c.geo?.lat != null ? milesBetween(home, c.geo) : null }))
    .sort((a, b) => (sort === 'near' ? (a.miles ?? 1e9) - (b.miles ?? 1e9) : (a.c.fullName ?? '').localeCompare(b.c.fullName ?? '')))

  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allShown = rows.length > 0 && rows.every(({ c }) => picked.has(c.id))
  const setShown = (on) => setPicked((s) => { const n = new Set(s); rows.forEach(({ c }) => (on ? n.add(c.id) : n.delete(c.id))); return n })

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Pick customers">
      <div className="mx-auto max-w-3xl space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">Customers</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 text-sm">Close</button>
        </div>

        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, street, neighborhood"
          className="block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select value={mode} onChange={(e) => { setMode(e.target.value); setStatus('*') }} className={select} aria-label="Install or takedown">
            <option value="install">Installs</option>
            <option value="takedown">Takedowns</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={select} aria-label="Status">
            <option value="*">Any status</option>
            {statuses.map((s) => <option key={s || 'blank'} value={s}>{s || 'Not set'}</option>)}
          </select>
          <select value={area} onChange={(e) => setArea(e.target.value)} className={select} aria-label="Area">
            <option value="">All areas</option>
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={select} aria-label="Install type">
            <option value="">Early + regular</option>
            <option>Early Install</option>
            <option>Regular Install</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={select} aria-label="Sort">
            {home && <option value="near">Nearest first</option>}
            <option value="name">By name</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={hideRouted} onChange={(e) => setHideRouted(e.target.checked)} /> Hide people already on another route
          </label>
          <span className="flex items-center gap-2">
            <span className="text-slate-400">{rows.length} shown · <strong className="text-slate-100">{picked.size} picked</strong></span>
            <button type="button" onClick={() => setShown(!allShown)} className="rounded-full bg-white/10 px-3.5 py-2">{allShown ? 'Untick shown' : 'Select all shown'}</button>
          </span>
        </div>

        <ul className="max-h-[50vh] divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/10">
          {rows.map(({ c, miles }) => {
            const r = onRoute.get(c.id)
            const st = c.seasons?.[season]?.[key]
            return (
              <li key={c.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-white/5">
                  <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.fullName}</span>
                    <span className="block truncate text-sm text-slate-400">{c.address || 'No address'}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[c.locationBlock, st, r && `on ${dayLabel(r.day)} route`].filter(Boolean).join(' · ')}
                      {c.geo?.lat == null && c.address ? ' · not on the map yet' : ''}
                    </span>
                  </span>
                  {miles != null && <span className="shrink-0 text-sm text-slate-400">{formatMiles(miles)}</span>}
                  {r && <span className="shrink-0 rounded-full bg-glow-400/15 px-2 py-0.5 text-xs text-glow-300">routed</span>}
                </label>
              </li>
            )
          })}
          {!rows.length && <li className="px-3 py-6 text-center text-sm text-slate-400">Nobody matches.</li>}
        </ul>

        <div className="flex flex-wrap gap-2">
          {['install', 'takedown', 'service'].map((k) => (
            <button key={k} type="button" disabled={!picked.size}
              onClick={() => { onAdd(customers.filter((c) => picked.has(c.id)), k); onClose() }}
              className={`flex-1 rounded-full py-3 font-semibold disabled:opacity-40 ${k === (mode === 'takedown' ? 'takedown' : 'install') ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
              Add {picked.size || ''} as {STOP_KINDS[k].toLowerCase()}{picked.size > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
