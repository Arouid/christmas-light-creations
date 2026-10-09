import { useMemo, useState } from 'react'
import { gateFor } from '../lib/customers'
import { loopLinks } from '../lib/geo'
import { gmailUrl } from '../lib/messages'
import { installsOn, routeSheet } from '../lib/route'
import { DEFAULT_MINUTES, STOP_KINDS, carryOver, clock, estimateMatrix, legsKey, newStopId, optimizeLoop, stopFromCustomer, timeline, withLegs } from '../lib/router'
import { drivingMatrix } from '../lib/routesApi'
import { locateAddress } from '../lib/streetView'
import CustomerPicker from './CustomerPicker'
import RouteDrive from './RouteDrive'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const small = 'rounded-lg border border-white/15 bg-night-950 px-2 py-1.5 text-sm text-slate-100'
const btn = 'rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40'
const primary = 'rounded-full bg-glow-400 px-5 py-2.5 font-semibold text-night-950 hover:bg-glow-300 disabled:opacity-50'
const todayISO = () => new Date().toLocaleDateString('en-CA')
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const STATUS = { draft: 'Draft', sent: 'Sent', done: 'Done' }
const appLink = (id) => `${window.location.origin}${window.location.pathname}#route-${id}`

// Office view of one route: stops, order, timing, send to the installer.
function RouteEditor({ route, routes, customers, gates, season, settings, carry, onSave, onSaveOther, onRemove, onDrive, onBack, onOpenCustomer }) {
  const [search, setSearch] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(null)
  const [to, setTo] = useState('')
  const [copied, setCopied] = useState(false)
  const [picking, setPicking] = useState(false)
  const stops = route.stops ?? []
  const home = route.home ?? settings.homeBase
  const fresh = route.legsKey === legsKey(stops)
  const { rows, homeAt } = timeline(stops, route.startTime, route.backMin)
  const setStops = (next, extra = {}) => onSave({ stops: next, ...extra })
  const patch = (id, p) => setStops(stops.map((s) => (s.id === id ? { ...s, ...p } : s)))

  function addCustomers(list, kind = 'install') {
    const have = new Set(stops.map((s) => s.customerId).filter(Boolean))
    const add = list.filter((c) => !have.has(c.id)).map((c) => stopFromCustomer(c, kind, gateFor(c, gates)?.code, settings.stopMinutes ?? DEFAULT_MINUTES))
    if (add.length) setStops([...stops, ...add])
    setSearch('')
  }
  async function addAddress() {
    const a = address.trim()
    if (!a) return
    const found = await locateAddress(a).catch(() => null)
    setStops([...stops, { id: newStopId(), customerId: null, name: a, address: a, lat: found?.lat ?? null, lng: found?.lng ?? null, phone: '', gate: '', notes: '', kind: 'other', minutes: DEFAULT_MINUTES.other, status: 'todo' }])
    setAddress('')
  }
  async function addCarry(s) {
    const copy = { ...s, id: newStopId(), status: 'todo', skipReason: null, skippedAt: null, carriedFrom: s.fromRoute }
    delete copy.fromRoute
    delete copy.fromDay
    await setStops([...stops, copy])
    await onSaveOther(s.fromRoute, s.id, { carriedTo: route.id })
  }

  async function optimize() {
    if (!home) return setBusy('Set the home base first (Map tab).')
    setBusy('Finding addresses…')
    let list = [...stops]
    for (const [i, s] of list.entries()) {
      if (s.lat == null && s.address) {
        const found = await locateAddress(s.address).catch(() => null)
        if (found) list[i] = { ...s, lat: found.lat, lng: found.lng }
      }
    }
    const done = list.filter((s) => s.status === 'done')
    const todo = list.filter((s) => s.status !== 'done' && s.status !== 'skipped' && s.lat != null)
    const rest = list.filter((s) => !done.includes(s) && !todo.includes(s)) // skipped or unmapped go last
    const ordered = [...done, ...todo]
    setBusy(`Getting drive times for ${ordered.length} stops…`)
    const points = [home, ...ordered]
    let matrix
    try { matrix = await drivingMatrix(points) } catch (e) { console.warn(e); matrix = estimateMatrix(points) }
    setBusy('Working out the best order…')
    const order = optimizeLoop(matrix.minutes, done.map((_, i) => i + 1))
    const sorted = order.map((i) => ordered[i - 1])
    // Legs need the matrix in the new order.
    const idx = [0, ...order]
    const sub = { minutes: idx.map((a) => idx.map((b) => matrix.minutes[a][b])), miles: idx.map((a) => idx.map((b) => matrix.miles[a][b])) }
    const legs = withLegs(sorted, sub)
    const final = [...legs.stops, ...rest.map((s) => ({ ...s, driveMin: 0, driveMiles: 0 }))]
    const miles = legs.stops.reduce((m, s) => m + s.driveMiles, 0) + legs.backMiles
    await onSave({ stops: final, backMin: legs.backMin, backMiles: legs.backMiles, miles: Math.round(miles), legsKey: legsKey(final), estimated: Boolean(matrix.estimated), home })
    setBusy(matrix.estimated ? 'Ordered by distance (Google drive times aren’t turned on yet).' : null)
  }

  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= stops.length) return
    const next = [...stops]
    ;[next[i], next[j]] = [next[j], next[i]]
    setStops(next)
  }

  const planned = installsOn(customers, season, route.day).filter((c) => !stops.some((s) => s.customerId === c.id))
  const q = search.trim().toLowerCase()
  const matches = q.length >= 2 ? customers.filter((c) => `${c.fullName} ${c.address}`.toLowerCase().includes(q) && !stops.some((s) => s.customerId === c.id)).slice(0, 6) : []
  const live = rows.filter((s) => s.status !== 'skipped' && s.status !== 'done')
  const links = home ? loopLinks(home.address, live.map((s) => s.address).filter(Boolean)) : []
  const message = routeSheet({ route, rows, homeAt, links, appUrl: appLink(route.id), clock })
  const installers = settings.installers ?? []
  const isEmail = to.includes('@')
  const digits = to.replace(/\D/g, '')
  const markSent = () => { if (route.status === 'draft' || !route.status) onSave({ status: 'sent' }) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className={btn}>← Routes</button>
        <div className="flex gap-2">
          <button type="button" onClick={onDrive} className={btn}>📱 Installer view</button>
          <select value={route.status ?? 'draft'} onChange={(e) => onSave({ status: e.target.value })} className={small} aria-label="Route status">
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-sm text-slate-400">Day<input type="date" value={route.day} onChange={(e) => onSave({ day: e.target.value })} className={field} /></label>
        <label className="text-sm text-slate-400">Leave at<input type="time" value={route.startTime ?? '08:00'} onChange={(e) => onSave({ startTime: e.target.value })} className={field} /></label>
        <label className="col-span-2 text-sm text-slate-400">Crew / name<input defaultValue={route.name ?? ''} onBlur={(e) => e.target.value !== (route.name ?? '') && onSave({ name: e.target.value })} className={field} placeholder="e.g. Crew 1, Katie" /></label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-night-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-4">
          <p className="font-semibold">
            {stops.length} stops{route.miles ? ` · ${route.miles} mi` : ''} · back ≈ {clock(homeAt)}
            {route.estimated && fresh && <span className="text-xs font-normal text-slate-400"> (estimated drive times)</span>}
          </p>
          <button type="button" onClick={optimize} disabled={!!busy && busy.endsWith('…') || stops.length < 1} className={primary}>⚡ Optimize route</button>
        </div>
        {busy && <p className="border-b border-white/10 px-4 py-2 text-sm text-glow-300" role="status">{busy}</p>}
        {!fresh && stops.length > 1 && <p className="border-b border-white/10 px-4 py-2 text-sm text-glow-300">Stops changed since the last optimize. Times are rough until you tap ⚡ Optimize.</p>}
        <ol className="divide-y divide-white/5">
          {home && <li className="px-4 py-2 text-sm text-slate-400">◆ Leave {home.address} at {clock(Number((route.startTime ?? '08:00').split(':')[0]) * 60 + Number((route.startTime ?? '08:00').split(':')[1]))}</li>}
          {rows.map((s, i) => (
            <li key={s.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${s.status === 'done' || s.status === 'skipped' ? 'opacity-60' : ''}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${s.status === 'done' ? 'bg-emerald-500 text-night-950' : s.status === 'skipped' ? 'bg-white/20' : 'bg-glow-400 text-night-950'}`}>
                {s.status === 'done' ? '✓' : s.status === 'skipped' ? '↷' : i + 1}
              </span>
              <button type="button" onClick={() => s.customerId && onOpenCustomer(s.customerId)} className="min-w-0 flex-1 text-left">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block truncate text-sm text-slate-400">
                  {s.eta != null && s.status !== 'skipped' ? `≈ ${clock(s.eta)} · ` : ''}{s.address}{s.lat == null ? ' · not on the map' : ''}
                </span>
              </button>
              <span className="flex shrink-0 items-center gap-1">
                <select value={s.kind} onChange={(e) => patch(s.id, { kind: e.target.value, minutes: (settings.stopMinutes ?? DEFAULT_MINUTES)[e.target.value] ?? s.minutes })} className={small} aria-label="Type">
                  {Object.entries(STOP_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="number" min="0" step="5" value={s.minutes} onChange={(e) => patch(s.id, { minutes: Number(e.target.value) })} className={`${small} w-16`} aria-label="Minutes on site" />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-lg bg-white/5 px-2 py-1.5 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down" className="rounded-lg bg-white/5 px-2 py-1.5 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => setStops(stops.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name}`} className="px-2 text-slate-400">✕</button>
              </span>
            </li>
          ))}
          {home && rows.length > 0 && <li className="px-4 py-2 text-sm text-slate-400">◆ Back home ≈ {clock(homeAt)}</li>}
          {!rows.length && <li className="px-4 py-6 text-center text-sm text-slate-400">No stops yet. Add them below, or use ＋ Route on any customer card or the Season list.</li>}
        </ol>

        <div className="space-y-3 border-t border-white/10 p-4">
          {planned.length > 0 && (
            <button type="button" onClick={() => addCustomers(planned, 'install')} className={btn}>＋ {planned.length} install{planned.length === 1 ? '' : 's'} planned for this day</button>
          )}
          {carry.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-glow-300">Carry-over from skipped stops ({carry.length})</p>
              <ul className="mt-1 space-y-1">
                {carry.map((s) => (
                  <li key={s.id}><button type="button" onClick={() => addCarry(s)} className="w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10">
                    ＋ {s.name} <span className="text-slate-400">· skipped {dayLabel(s.fromDay)}{s.skipReason ? `: ${s.skipReason}` : ''}</span>
                  </button></li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" onClick={() => setPicking(true)} className={`${btn} w-full py-3`}>📋 Pick from customer list</button>
          <label className="block text-sm text-slate-400">Add a customer
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or street" className={field} />
          </label>
          {matches.length > 0 && (
            <ul className="space-y-1">
              {matches.map((c) => (
                <li key={c.id} className="flex gap-1">
                  {['install', 'takedown', 'service'].map((k) => (
                    <button key={k} type="button" onClick={() => addCustomers([c], k)} className="rounded-lg bg-white/5 px-2 py-2 text-left text-sm hover:bg-white/10 first:flex-1">
                      {k === 'install' ? <>＋ {c.fullName} <span className="text-slate-400">{c.address}</span></> : STOP_KINDS[k]}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <label className="block flex-1 text-sm text-slate-400">…or any address
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Pearland" className={field} />
            </label>
            <button type="button" onClick={addAddress} disabled={!address.trim()} className={`${btn} mb-0.5`}>Add</button>
          </div>
        </div>
      </div>

      {live.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4">
          <p className="font-semibold">Send to the installer</p>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-night-950 p-3 text-sm text-slate-300">{message}</pre>
          <label className="block text-sm text-slate-400">Installer’s cell number or email
            <input value={to} onChange={(e) => setTo(e.target.value)} list="route-installers" className={field} placeholder="281-555-0123 or name@gmail.com" />
            <datalist id="route-installers">{installers.map((v) => <option key={v} value={v} />)}</datalist>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <a href={digits.length >= 10 && !isEmail ? `sms:+1${digits.slice(-10)}?&body=${encodeURIComponent(message)}` : undefined} onClick={markSent}
              className={`rounded-full py-3 text-center font-semibold ${digits.length >= 10 && !isEmail ? 'bg-glow-400 text-night-950' : 'pointer-events-none bg-white/10 text-slate-500'}`}>Text</a>
            <a href={isEmail ? gmailUrl({ to: to.trim(), subject: message.split('\n')[0], body: message }) : undefined} target="_blank" rel="noreferrer" onClick={markSent}
              className={`rounded-full py-3 text-center font-semibold ${isEmail ? 'bg-glow-400 text-night-950' : 'pointer-events-none bg-white/10 text-slate-500'}`}>Email</a>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2500); markSent() } catch { /* select instead */ } }} className="rounded-full bg-white/10 py-3 font-semibold">{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <p className="text-xs text-slate-500">The installer opens the app link (signed in with their Google account on the staff list) to navigate stop by stop, see gate codes and notes, and mark Done or Skip.</p>
        </div>
      )}

      {picking && (
        <CustomerPicker customers={customers} season={season} home={home} routes={routes} routeId={route.id}
          onStops={new Set(stops.map((s) => s.customerId).filter(Boolean))} onAdd={addCustomers} onClose={() => setPicking(false)} />
      )}

      {!stops.some((s) => s.status === 'done') && (
        <button type="button" onClick={() => window.confirm('Delete this route? Customers aren’t affected.') && onRemove()} className="text-sm text-slate-400 underline">Delete route</button>
      )}
    </div>
  )
}

// Routes tab: list of routes by day, carry-overs, and the route open now.
export default function RoutesView({ api, openId, mode, customers, gates, season, settings, onOpen, onOpenCustomer, onUpdateCustomer }) {
  const [day, setDay] = useState(todayISO)
  const routes = useMemo(() => api.routes ?? [], [api.routes])
  const carry = useMemo(() => carryOver(routes), [routes])
  const route = openId && routes.find((r) => r.id === openId)

  const save = (id) => (data) => api.save(id, data)
  async function saveOtherStop(routeId, stopId, p) {
    const r = routes.find((x) => x.id === routeId)
    if (r) await api.save(routeId, { stops: r.stops.map((s) => (s.id === stopId ? { ...s, ...p } : s)) })
  }
  async function create() {
    const id = await api.create({ day, status: 'draft', startTime: '08:00', stops: [], home: settings.homeBase ?? null })
    onOpen(id, 'edit')
  }

  if (api.error) return <p className="mt-6 text-berry-500" role="alert">Couldn’t load routes: {api.error === 'not-staff' ? 'the database refused. Republish firestore.rules (new routes list).' : api.error}</p>
  if (!api.routes) return <p className="mt-6 text-slate-400">Loading routes…</p>
  if (openId && !route) return <p className="mt-6 text-slate-400">This route was deleted. <button type="button" onClick={() => onOpen(null)} className="text-glow-300 underline">All routes</button></p>

  if (route && mode === 'drive') {
    return <RouteDrive route={route} customers={customers} onSaveStops={(stops) => api.save(route.id, { stops })} onCustomer={onUpdateCustomer} onBack={() => onOpen(route.id, 'edit')} />
  }
  if (route) {
    return (
      <RouteEditor route={route} routes={routes} customers={customers} gates={gates} season={season} settings={settings} carry={carry.filter((s) => s.fromRoute !== route.id)}
        onSave={save(route.id)} onSaveOther={saveOtherStop} onRemove={async () => { await api.remove(route.id); onOpen(null) }}
        onDrive={() => onOpen(route.id, 'drive')} onBack={() => onOpen(null)} onOpenCustomer={onOpenCustomer} />
    )
  }

  const upcoming = routes.filter((r) => r.status !== 'done' && r.day >= todayISO()).sort((a, b) => a.day.localeCompare(b.day))
  const past = routes.filter((r) => !upcoming.includes(r))
  const card = (r) => {
    const n = r.stops?.length ?? 0
    const done = r.stops?.filter((s) => s.status === 'done').length ?? 0
    const skipped = r.stops?.filter((s) => s.status === 'skipped').length ?? 0
    return (
      <li key={r.id}>
        <button type="button" onClick={() => onOpen(r.id, 'edit')} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900 p-4 text-left hover:border-white/25">
          <span className="min-w-0">
            <span className="block font-semibold">{dayLabel(r.day)}{r.name ? ` · ${r.name}` : ''}</span>
            <span className="block text-sm text-slate-400">{n} stop{n === 1 ? '' : 's'}{r.miles ? ` · ${r.miles} mi` : ''}{done ? ` · ${done} done` : ''}{skipped ? ` · ${skipped} skipped` : ''}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs">{STATUS[r.status] ?? 'Draft'}</span>
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-400">Day<input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={field} /></label>
        <button type="button" onClick={create} className={`${primary} mb-0.5`}>＋ New route</button>
      </div>
      {!settings.homeBase && <p className="text-sm text-glow-300">Set the home base on the Map tab so routes start and end there.</p>}
      {carry.length > 0 && <p className="rounded-xl bg-glow-400/10 px-4 py-3 text-sm text-glow-300">↷ {carry.length} skipped stop{carry.length === 1 ? '' : 's'} waiting to be carried over. Open a route to add {carry.length === 1 ? 'it' : 'them'}.</p>}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-glow-300">Upcoming</h2>
        {upcoming.length ? <ul className="grid gap-2 lg:grid-cols-2">{upcoming.map(card)}</ul> : <p className="text-sm text-slate-400">No routes planned. Start one above, or tap ＋ Route on a customer or the Season list.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Earlier and done</h2>
          <ul className="grid gap-2 lg:grid-cols-2">{past.slice(0, 20).map(card)}</ul>
        </section>
      )}
    </div>
  )
}
