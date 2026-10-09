import { useMemo, useState } from 'react'
import { gateFor } from '../lib/customers'
import { loopLinks, loopMiles, planLoop } from '../lib/geo'
import { gmailUrl } from '../lib/messages'
import { installsOn, routeMessage } from '../lib/route'
import { needsLocating } from './useCustomers'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const btn = 'rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40'
const todayISO = () => new Date().toLocaleDateString('en-CA')

// Plan a day's route from home base through the stops and back, then send
// the list + directions to the installer.
export default function RouteView({ customers, gates, season, settings, onSaveSettings, onLocateAll, onOpen }) {
  const [day, setDay] = useState(todayISO)
  const [added, setAdded] = useState([]) // extra stop ids
  const [removed, setRemoved] = useState([])
  const [manual, setManual] = useState(null) // ids in a hand-edited order
  const [search, setSearch] = useState('')
  const [to, setTo] = useState('')
  const [locating, setLocating] = useState(null)
  const [copied, setCopied] = useState(false)
  const home = settings.homeBase

  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const planned = useMemo(() => installsOn(customers, season, day), [customers, season, day])
  const chosen = useMemo(() => [...planned.map((c) => c.id), ...added]
    .filter((id, i, a) => a.indexOf(id) === i && !removed.includes(id)).map((id) => byId.get(id)).filter(Boolean), [planned, added, removed, byId])
  const unlocated = chosen.filter((c) => c.geo?.lat == null)

  const best = useMemo(() => planLoop(home, chosen.filter((c) => c.geo?.lat != null)), [home, chosen])
  const order = manual ? manual.map((id) => byId.get(id)).filter((c) => c?.geo?.lat != null) : best.order
  const stops = [...order, ...unlocated] // unlocated go last, flagged
  const links = home ? loopLinks(home.address, stops.map((c) => c.address).filter(Boolean)) : []
  const miles = home && order.length ? loopMiles(home, order.map((c) => c.geo)) : null
  const message = routeMessage({ day, stops: stops.map((c) => ({ customer: c, gate: gateFor(c, gates)?.code })), links, totalMiles: miles, season, homeAddress: home?.address })

  const reset = () => setManual(null)
  function move(i, dir) {
    const ids = order.map((c) => c.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setManual(ids)
  }
  function changeDay(v) { setDay(v); setAdded([]); setRemoved([]); setManual(null) }
  function add(id) { setAdded((a) => [...a, id]); setRemoved((r) => r.filter((x) => x !== id)); setManual(null); setSearch('') }
  function remove(id) { setRemoved((r) => [...r, id]); setAdded((a) => a.filter((x) => x !== id)); setManual((m) => m?.filter((x) => x !== id) ?? null) }

  async function locate() {
    setLocating('…')
    await onLocateAll(unlocated.filter(needsLocating), (n) => setLocating(`${n}/${unlocated.length}`))
    setLocating(null)
  }

  const installers = settings.installers ?? []
  const isEmail = to.includes('@')
  const digits = to.replace(/\D/g, '')
  async function remember() {
    const v = to.trim()
    if (v && !installers.includes(v)) await onSaveSettings({ installers: [...installers, v].slice(-8) })
  }
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* select the text instead */ }
  }

  const q = search.trim().toLowerCase()
  const matches = q.length >= 2 ? customers.filter((c) => !chosen.includes(c) && `${c.fullName} ${c.address}`.toLowerCase().includes(q)).slice(0, 6) : []
  const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
        <label className="block text-sm text-slate-400">Day
          <input type="date" value={day} onChange={(e) => changeDay(e.target.value)} className={field} />
        </label>
        <p className="text-sm text-slate-400">
          {planned.length} install{planned.length === 1 ? '' : 's'} planned for {dayLabel} (the customer’s <strong className="text-slate-200">Planned date</strong> in {season}).
          {!home && <span className="text-glow-300"> Set the home base on the Map tab first, so the route starts and ends there.</span>}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-night-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-4">
          <p className="font-semibold">{stops.length} stops{miles ? ` · about ${Math.round(miles)} mi round trip` : ''}{manual ? ' · your order' : ''}</p>
          {manual && <button type="button" onClick={reset} className={btn}>Re-optimize</button>}
        </div>
        <ol className="divide-y divide-white/5">
          {home && <li className="px-4 py-2 text-sm text-slate-400">◆ Start: {home.address}</li>}
          {stops.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-glow-400 text-sm font-bold text-night-950">{i + 1}</span>
              <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate font-medium">{c.fullName}</span>
                <span className="block truncate text-sm text-slate-400">{c.address || 'No address'}{!c.geo?.lat && <span className="text-glow-300"> · not on the map</span>}</span>
              </button>
              {c.geo?.lat != null && (
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-lg bg-white/5 px-2 py-1.5 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i >= order.length - 1} aria-label="Move down" className="rounded-lg bg-white/5 px-2 py-1.5 disabled:opacity-30">↓</button>
                </span>
              )}
              <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.fullName}`} className="shrink-0 px-2 text-slate-400">✕</button>
            </li>
          ))}
          {home && stops.length > 0 && <li className="px-4 py-2 text-sm text-slate-400">◆ Back to: {home.address}</li>}
          {!stops.length && <li className="px-4 py-6 text-center text-sm text-slate-400">No stops for this day. Add some below.</li>}
        </ol>
        <div className="border-t border-white/10 p-4">
          <label className="block text-sm text-slate-400">Add a stop (service call, takedown, anyone)
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer name or street" className={field} />
          </label>
          {matches.length > 0 && (
            <ul className="mt-2 space-y-1">
              {matches.map((c) => (
                <li key={c.id}><button type="button" onClick={() => add(c.id)} className="w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10">+ {c.fullName} <span className="text-slate-400">{c.address}</span></button></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {unlocated.length > 0 && (
        <p className="text-sm text-glow-300">
          {unlocated.length} stop{unlocated.length === 1 ? ' isn’t' : 's aren’t'} on the map yet, so {unlocated.length === 1 ? 'it goes' : 'they go'} last.{' '}
          <button type="button" onClick={locate} disabled={!!locating} className="underline">{locating ? `Locating ${locating}` : 'Locate'}</button>
        </p>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">
              🗺 {links.length === 1 ? 'Open the route in Google Maps' : `Stops ${l.from}–${l.to}${l === links.at(-1) ? ' + home' : ''}`}
            </a>
          ))}
        </div>
      )}

      {stops.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4">
          <p className="font-semibold">Send to the installer</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-night-950 p-3 text-sm text-slate-300">{message}</pre>
          <label className="block text-sm text-slate-400">Installer’s cell number or email
            <input value={to} onChange={(e) => setTo(e.target.value)} list="installers" className={field} placeholder="281-555-0123 or name@gmail.com" />
            <datalist id="installers">{installers.map((v) => <option key={v} value={v} />)}</datalist>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <a href={digits.length >= 10 && !isEmail ? `sms:+1${digits.slice(-10)}?&body=${encodeURIComponent(message)}` : undefined}
              onClick={remember} aria-disabled={!(digits.length >= 10 && !isEmail)}
              className={`rounded-full py-3 text-center font-semibold ${digits.length >= 10 && !isEmail ? 'bg-glow-400 text-night-950' : 'pointer-events-none bg-white/10 text-slate-500'}`}>Text</a>
            <a href={isEmail ? gmailUrl({ to: to.trim(), subject: message.split('\n')[0], body: message }) : undefined} target="_blank" rel="noreferrer"
              onClick={remember} aria-disabled={!isEmail}
              className={`rounded-full py-3 text-center font-semibold ${isEmail ? 'bg-glow-400 text-night-950' : 'pointer-events-none bg-white/10 text-slate-500'}`}>Email</a>
            <button type="button" onClick={copy} className="rounded-full bg-white/10 py-3 font-semibold">{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <p className="text-xs text-slate-500">Text opens your phone’s messages with the route filled in. The links open turn-by-turn directions in Google Maps on their phone.</p>
        </div>
      )}
    </div>
  )
}
