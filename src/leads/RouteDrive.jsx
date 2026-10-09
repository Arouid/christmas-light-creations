import { useState } from 'react'
import { STOP_KINDS, clock, timeline } from '../lib/router'
import Icon from '../components/Icon'

// Shape only; each button sets its own colors (two bg- classes would clash).
const shape = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold'
const btn = `${shape} bg-white/10 hover:bg-white/15`
const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2 text-base text-slate-100'
// The street address reads better in Google Maps than coordinates.
const navUrl = (s) => `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: s.address || `${s.lat},${s.lng}`, travelmode: 'driving' })}`

// One stop on the installer's screen: everything needed at the house.
function StopCard({ s, n, current, customer, onStop, onCustomer }) {
  const [skipping, setSkipping] = useState(false)
  const [reason, setReason] = useState('')
  const done = s.status === 'done'
  const skipped = s.status === 'skipped'
  const phoneDigits = String(s.phone ?? '').replace(/\D/g, '')

  // Gate code and phone belong to the customer: save there too.
  const saveContact = (key, value) => {
    onStop({ [key]: value })
    if (s.customerId) onCustomer(s.customerId, key === 'gate' ? 'gateCode' : 'phone', value)
  }

  return (
    <li className={`rounded-2xl border p-4 ${current ? 'border-glow-400 bg-night-900 shadow-[0_0_24px_-8px] shadow-glow-400' : 'border-white/10 bg-night-900/60'} ${done || skipped ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-emerald-500 text-night-950' : skipped ? 'bg-white/20' : 'bg-glow-400 text-night-950'}`}>
          {done ? '✓' : skipped ? '↷' : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{s.name || s.address}</p>
          <p className="text-sm text-slate-300">{s.address}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {STOP_KINDS[s.kind] ?? s.kind} · {s.minutes} min{s.eta != null && !skipped ? ` · arrive ≈ ${clock(s.eta)}` : ''}{s.driveMin ? ` · ${s.driveMin} min drive` : ''}
            {skipped && s.skipReason ? ` · skipped: ${s.skipReason}` : ''}
          </p>
        </div>
      </div>

      {(current || !done) && !skipped && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <a href={navUrl(s)} target="_blank" rel="noreferrer" className={`${shape} bg-glow-400 text-night-950 hover:bg-glow-300`}>Navigate</a>
            {phoneDigits ? <a href={`tel:${phoneDigits}`} className={btn}><Icon name="phone" className="size-4" /> Call</a> : <span />}
            {phoneDigits ? <a href={`sms:${phoneDigits}`} className={btn}><Icon name="chat" className="size-4" /> Text</a> : <span />}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <label className="text-slate-400">Gate code
              <input defaultValue={s.gate ?? ''} onBlur={(e) => e.target.value !== (s.gate ?? '') && saveContact('gate', e.target.value.trim())} className={field} placeholder="none" />
            </label>
            <label className="text-slate-400">Phone
              <input defaultValue={s.phone ?? ''} inputMode="tel" onBlur={(e) => e.target.value !== (s.phone ?? '') && saveContact('phone', e.target.value.trim())} className={field} />
            </label>
          </div>
          {customer?.notes && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300"><span className="text-slate-400">Customer notes: </span>{customer.notes}</p>}
          <label className="mt-3 block text-sm text-slate-400">Notes for this stop
            <textarea defaultValue={s.notes ?? ''} rows={2} onBlur={(e) => e.target.value !== (s.notes ?? '') && onStop({ notes: e.target.value })} className={field} placeholder="Breaker in garage, dog in back…" />
          </label>
          {skipping ? (
            <div className="mt-3 flex gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} mt-0 flex-1`} placeholder="Why? (no access, rain…)" autoFocus />
              <button type="button" onClick={() => { onStop({ status: 'skipped', skipReason: reason.trim(), skippedAt: new Date().toISOString() }); setSkipping(false) }} className={btn}>Skip</button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSkipping(true)} className={btn}>↷ Skip, carry over</button>
              <button type="button" onClick={() => onStop({ status: 'done', doneAt: new Date().toISOString() })} className={`${shape} bg-emerald-500 text-night-950 hover:bg-emerald-400`}>✓ Done</button>
            </div>
          )}
        </>
      )}
      {(done || skipped) && (
        <button type="button" onClick={() => onStop({ status: 'todo', doneAt: null, skippedAt: null, skipReason: null })} className="mt-2 text-xs text-slate-400 underline">Undo</button>
      )}
    </li>
  )
}

// The installer's screen for a route: next stop on top, one tap to navigate.
export default function RouteDrive({ route, customers, onSaveStops, onCustomer, onBack }) {
  const byId = new Map(customers.map((c) => [c.id, c]))
  const { rows, homeAt } = timeline(route.stops ?? [], route.startTime, route.backMin)
  const currentIdx = rows.findIndex((s) => s.status !== 'done' && s.status !== 'skipped')
  const doneCount = rows.filter((s) => s.status === 'done').length
  const updateStop = (id, patch) => onSaveStops(route.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={btn}>← Routes</button>
        <p className="text-sm text-slate-400">{doneCount}/{rows.length} done · back home ≈ {clock(homeAt)}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-500" style={{ width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%` }} /></div>
      {currentIdx === -1 && rows.length > 0 && <p className="rounded-2xl bg-emerald-500/15 p-4 text-center font-semibold text-emerald-300">All stops handled. Head home! 🏠</p>}
      <ol className="space-y-3">
        {rows.map((s, i) => (
          <StopCard key={s.id} s={s} n={i + 1} current={i === currentIdx} customer={s.customerId && byId.get(s.customerId)}
            onStop={(patch) => updateStop(s.id, patch)} onCustomer={onCustomer} />
        ))}
      </ol>
      {route.home?.address && (
        <a href={navUrl({ address: route.home.address, lat: route.home.lat, lng: route.home.lng })} target="_blank" rel="noreferrer" className={`${btn} w-full`}>◆ Navigate home</a>
      )}
    </div>
  )
}
