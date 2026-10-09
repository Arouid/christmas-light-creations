import { useMemo, useState } from 'react'
import { INSTALL_STATUSES } from '../lib/customers'
import { select } from './ui'

// Tick who gets an email: search and filters narrow the list, "Select all
// shown" ticks what's visible. Only customers with an email can be picked.
export default function RecipientPicker({ customers, season, templateLabel, initial = [], onNext, onClose }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [area, setArea] = useState('')
  const [status, setStatus] = useState('*')
  const [picked, setPicked] = useState(() => new Set(initial.map((c) => c.id)))

  const withEmail = useMemo(() => customers.filter((c) => c.email?.includes('@'))
    .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '')), [customers])
  const areas = useMemo(() => [...new Set(withEmail.map((c) => c.locationBlock).filter(Boolean))].sort(), [withEmail])
  const needle = q.trim().toLowerCase()
  const shown = withEmail.filter((c) =>
    (!needle || `${c.fullName} ${c.email} ${c.address}`.toLowerCase().includes(needle))
    && (!type || c.installType === type)
    && (!area || c.locationBlock === area)
    && (status === '*' || (c.seasons?.[season]?.installStatus ?? '') === status))

  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allShown = shown.length > 0 && shown.every((c) => picked.has(c.id))
  const setShown = (on) => setPicked((s) => { const n = new Set(s); shown.forEach((c) => (on ? n.add(c.id) : n.delete(c.id))); return n })

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Pick recipients">
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-extrabold">Who gets it?</h2>
            <p className="truncate text-sm text-slate-400">{templateLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 text-sm">Close</button>
        </div>

        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, address"
          className="block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className={select} aria-label="Install type">
            <option value="">Early + regular</option>
            <option>Early Install</option>
            <option>Regular Install</option>
          </select>
          <select value={area} onChange={(e) => setArea(e.target.value)} className={select} aria-label="Area">
            <option value="">All areas</option>
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={select} aria-label={`${season} install status`}>
            <option value="*">Any {season} status</option>
            {INSTALL_STATUSES.map((s) => <option key={s || 'blank'} value={s}>{s || 'Not contacted'}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-400">{shown.length} shown · <strong className="text-slate-100">{picked.size} picked</strong></span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShown(!allShown)} className="rounded-full bg-white/10 px-3.5 py-2">
              {allShown ? 'Untick shown' : `Select all shown (${shown.length})`}
            </button>
            {picked.size > 0 && <button type="button" onClick={() => setPicked(new Set())} className="rounded-full bg-white/10 px-3.5 py-2">Clear</button>}
          </div>
        </div>

        <ul className="max-h-[45vh] divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/10">
          {shown.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-white/5">
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="size-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.fullName}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[c.email, c.installType, c.seasons?.[season]?.emailsSent && `emailed: ${Object.keys(c.seasons[season].emailsSent).length}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {!shown.length && <li className="px-3 py-6 text-center text-sm text-slate-400">Nobody matches.</li>}
        </ul>
        {customers.length > withEmail.length && (
          <p className="text-xs text-slate-500">{customers.length - withEmail.length} customers have no email on file and aren’t listed.</p>
        )}

        <button type="button" disabled={!picked.size} onClick={() => onNext(withEmail.filter((c) => picked.has(c.id)))}
          className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-40">
          Next: review the email ({picked.size})
        </button>
      </div>
    </div>
  )
}
