import { useState } from 'react'
import { STOP_KINDS } from '../lib/router'
import { useRoutesContext } from './routesContext'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const tomorrow = () => new Date(Date.now() + 86400000).toLocaleDateString('en-CA')
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// "＋ Route" for one customer card or a whole list: pick a route (or start one
// for a day) and the customers become stops, with phone and gate code.
export default function AddToRoute({ customers, label, className, defaultKind = 'install' }) {
  const ctx = useRoutesContext()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('new')
  const [day, setDay] = useState(tomorrow)
  const [kind, setKind] = useState(defaultKind)
  const [done, setDone] = useState(null)
  if (!ctx || !customers.length) return null
  const openRoutes = (ctx.routes ?? []).filter((r) => r.status !== 'done')

  async function add() {
    const { added, id } = await ctx.addCustomers(target === 'new' ? { day } : target, customers, kind)
    setDone(`${added} added ✓`)
    setTimeout(() => { setOpen(false); setDone(null) }, 1200)
    return id
  }

  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true) }} className={className}>
        {label ?? '＋ Route'}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night-950/85 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Add to a route"
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}>
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5 text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Add {customers.length === 1 ? customers[0].fullName : `${customers.length} customers`} to a route</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400">✕</button>
            </div>
            <label className="block text-sm text-slate-400">Route
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
                <option value="new">New route…</option>
                {openRoutes.map((r) => <option key={r.id} value={r.id}>{dayLabel(r.day)}{r.name ? ` · ${r.name}` : ''} ({r.stops?.length ?? 0} stops)</option>)}
              </select>
            </label>
            {target === 'new' && (
              <label className="block text-sm text-slate-400">Day
                <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={field} />
              </label>
            )}
            <label className="block text-sm text-slate-400">Type of stop
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
                {Object.entries(STOP_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button type="button" onClick={add} disabled={!!done} className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950">
              {done ?? 'Add to route'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
