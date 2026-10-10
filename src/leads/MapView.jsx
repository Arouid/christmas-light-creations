import { useEffect, useRef, useState } from 'react'
import { BLANK_LABEL, gateFor } from '../lib/customers'
import { formatMiles, milesBetween } from '../lib/geo'
import { loadMaps, streetViewLink } from '../lib/streetView'
import HomeBase from './HomeBase'
import { matchesView, statusKey, viewSeason } from '../lib/views'
import { needsLocating } from './useCustomers'
import { select } from './ui'

const COLORS = {
  install: {
    '': '#64748b', 'Not Confirmed': '#f59e0b', 'Confirmed - Needs to be Scheduled': '#ffcf4d',
    'Install Scheduled': '#38bdf8', 'Install Completed': '#34d399', 'Off Scheduler': '#a78bfa', 'Not Servicing': '#3f3f46',
  },
  takedown: { '': '#64748b', 'Takedown Scheduled': '#38bdf8', 'Takedown Completed': '#34d399', 'No Takedown': '#3f3f46' },
}
const CALL = '#ff3b5c'
const HOME = '#ffffff'
// Where the map opens (owner, 2026-10-10): between Pearland and Clear Lake,
// Houston to Galveston on a computer, not "fit every pin" (a few far or
// roughly-found addresses zoomed it way out). 📌 Start here saves another
// view for everyone (settings/app.mapView).
const START_VIEW = { lat: 29.51, lng: -95.22, zoom: 10 }
const startOf = (v) => (Number.isFinite(v?.lat) && Number.isFinite(v?.lng) && Number.isFinite(v?.zoom) ? v : START_VIEW)

const NIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#08122b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8fa3cc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050b1a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cfe0ff' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a3166' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#22407f' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2f5fb3' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', stylers: [{ color: '#030816' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a4a8a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

// One HTML layer for all pins, so they can glow and pulse with CSS.
function pinLayer(maps, onPick) {
  class Pins extends maps.OverlayView {
    constructor() { super(); this.pins = []; this.selected = null; this.div = document.createElement('div') }
    setPins(pins, selected) { this.pins = pins; this.selected = selected; this.draw() }
    onAdd() { this.getPanes().overlayMouseTarget.appendChild(this.div) }
    onRemove() { this.div.remove() }
    draw() {
      const proj = this.getProjection()
      if (!proj) return
      this.div.replaceChildren(...this.pins.map((p) => {
        const pt = proj.fromLatLngToDivPixel(new maps.LatLng(p.lat, p.lng))
        const el = document.createElement('button')
        el.type = 'button'
        el.className = `pin pin-${p.kind}`
        el.style.left = `${pt.x}px`
        el.style.top = `${pt.y}px`
        el.style.setProperty('--c', p.color)
        el.title = p.title
        el.setAttribute('aria-label', p.title)
        el.setAttribute('aria-pressed', String(p.key === this.selected))
        el.addEventListener('click', (e) => { e.stopPropagation(); onPick(p) })
        return el
      }))
    }
  }
  return new Pins()
}

const panel = 'rounded-2xl border border-cyan-300/15 bg-night-950/80 backdrop-blur-md shadow-[0_0_30px_-10px] shadow-cyan-400/30'

function Stat({ label, value, color }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] uppercase tracking-[0.18em] text-cyan-200/60">{label}</p>
      <p className="font-mono text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

export default function MapView({ customers, calls, gates, views, settings, season, onOpen, onLocateAll, onSaveSettings }) {
  const wallRef = useRef(null)
  const mapDiv = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const fitted = useRef(true) // false = fit the pins once (after Put N addresses on the map)
  const [startMsg, setStartMsg] = useState('')
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [mode, setMode] = useState('install')
  const [area, setArea] = useState('')
  const [viewId, setViewId] = useState('')
  const [showCalls, setShowCalls] = useState(true)
  const [satellite, setSatellite] = useState(false)
  const [picked, setPicked] = useState(null)
  const [sv, setSv] = useState({ id: null, link: null }) // Street View link for the picked pin
  const [now, setNow] = useState(() => new Date())
  const [locating, setLocating] = useState(null)

  const view = views.find((v) => v.id === viewId)
  const year = view ? viewSeason(view, season) : season
  const activeMode = view?.mode ?? mode
  const key = statusKey(activeMode)
  const colors = COLORS[activeMode]
  const home = settings?.homeBase
  const byId = new Map(customers.map((c) => [c.id, c]))

  const inScope = customers.filter((c) => (view ? matchesView(c, view, year) : matchesView(c, { mode, areas: area ? [area] : [] }, year)))
  const located = inScope.filter((c) => c.geo?.lat != null)
  const openCalls = calls.filter((c) => c.status === 'Open' || c.status === 'Scheduled')
  const statusOf = (c) => c.seasons?.[year]?.[key] ?? ''

  const pins = [
    ...located.map((c) => ({
      key: `c-${c.id}`, kind: 'cust', id: c.id, lat: c.geo.lat, lng: c.geo.lng,
      color: colors[statusOf(c)] ?? '#94a3b8', title: `${c.fullName} — ${statusOf(c) || BLANK_LABEL[key]}`,
    })),
    ...(showCalls ? openCalls.flatMap((call) => {
      const c = byId.get(call.customerId)
      return c?.geo?.lat != null ? [{ key: `s-${call.id}`, kind: 'call', id: c.id, call, lat: c.geo.lat, lng: c.geo.lng, color: CALL, title: `Service: ${call.customerName} — ${call.issue}` }] : []
    }) : []),
    ...(home ? [{ key: 'home', kind: 'home', lat: home.lat, lng: home.lng, color: HOME, title: `Home base — ${home.address}` }] : []),
  ]

  // Map, once.
  useEffect(() => {
    let cancelled = false
    loadMaps().then(async (maps) => {
      const { Map } = await maps.importLibrary('maps')
      if (cancelled || !mapDiv.current) return
      const start = startOf(settings?.mapView)
      map.current = new Map(mapDiv.current, {
        center: { lat: start.lat, lng: start.lng }, zoom: start.zoom, styles: NIGHT, backgroundColor: '#050b1a',
        disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false,
      })
      map.current.addListener('click', () => setPicked(null))
      layer.current = pinLayer(maps, setPicked)
      layer.current.setMap(map.current)
      setReady(true)
    }).catch((e) => setLoadError(e.message))
    return () => { cancelled = true; layer.current?.setMap(null) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- the start view is read once, when the map is made

  // Pins whenever data or filters change; fit them after newly located addresses.
  useEffect(() => {
    if (!ready) return
    layer.current.setPins(pins, picked?.key)
    if (!fitted.current && pins.length > 1) {
      const b = new window.google.maps.LatLngBounds()
      pins.forEach((p) => b.extend(p))
      map.current.fitBounds(b, 60)
      fitted.current = true
    }
  })

  useEffect(() => {
    if (ready) map.current.setMapTypeId(satellite ? 'hybrid' : 'roadmap')
  }, [ready, satellite])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // 📌 Start here: this view becomes where the map opens, for everyone.
  async function saveStart() {
    const c = map.current.getCenter()
    await onSaveSettings({ mapView: { lat: Number(c.lat().toFixed(5)), lng: Number(c.lng().toFixed(5)), zoom: map.current.getZoom() } })
    setStartMsg('Saved ✓ The map opens here for everyone.')
    setTimeout(() => setStartMsg(''), 4000)
  }

  function fitAll() {
    if (!pins.length) return
    const b = new window.google.maps.LatLngBounds()
    pins.forEach((p) => b.extend(p))
    map.current.fitBounds(b, 60)
  }

  async function locateAll() {
    setLocating({ done: 0, total: customers.filter(needsLocating).length })
    await onLocateAll(customers, (done, total) => setLocating({ done, total }))
    setLocating(null)
    fitted.current = false
  }

  const counts = Object.keys(colors).map((s) => [s, inScope.filter((c) => statusOf(c) === s).length])
  const needLocate = customers.filter(needsLocating).length
  const notFound = customers.filter((c) => c.geo?.missing || (c.geo && c.geo.exact === false && c.geo.address === c.address))
  const areas = [...new Set(customers.map((c) => c.locationBlock).filter(Boolean))].sort()
  const pc = picked && byId.get(picked.id)
  // Look up the nearest street photo as soon as a pin is picked, so the
  // Street View button opens it straight away (a plain link: no pop-up blocking).
  const pcId = pc?.geo ? pc.id : null
  useEffect(() => {
    if (!pcId) return
    let off = false
    const geo = byId.get(pcId).geo
    streetViewLink(geo).then((link) => !off && setSv({ id: pcId, link: link ?? 'none' })).catch(() => !off && setSv({ id: pcId, link: 'none' }))
    return () => { off = true }
  }, [pcId]) // eslint-disable-line react-hooks/exhaustive-deps -- byId is rebuilt each render; the id decides
  const svLink = sv.id === pcId ? sv.link : null

  return (
    <div ref={wallRef} className="relative h-full w-full overflow-hidden bg-night-950">
      <div ref={mapDiv} className="absolute inset-0" aria-label="Map of customers" />
      {loadError && <p className="absolute inset-x-4 top-4 text-berry-500">Map couldn’t load: {loadError}</p>}

      {/* Top-left: title, clock, stats */}
      <div className={`absolute left-3 top-3 w-[min(26rem,calc(100%-1.5rem))] space-y-3 p-4 ${panel}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.25em] text-cyan-200">CLC · Mission Control</h2>
          <span className="font-mono text-xs tabular-nums text-cyan-100/70">
            {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label={view ? view.name : `${activeMode}s ${year}`} value={inScope.length} color="#e2e8f0" />
          <Stat label="On map" value={located.length} color="#67e8f9" />
          <Stat label="Service open" value={openCalls.length} color={openCalls.length ? CALL : '#34d399'} />
        </div>
        <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
          {counts.filter(([, n]) => n > 0).map(([s, n]) => (
            <li key={s || 'blank'} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[s], boxShadow: `0 0 8px ${colors[s]}` }} />
              <span className="min-w-0 flex-1 truncate text-slate-300">{s || BLANK_LABEL[key]}</span>
              <span className="font-mono tabular-nums text-slate-100">{n}</span>
            </li>
          ))}
          {showCalls && openCalls.length > 0 && (
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: CALL, boxShadow: `0 0 8px ${CALL}` }} />
              <span className="flex-1 text-slate-300">Open service call</span>
            </li>
          )}
        </ul>
        <HomeBase settings={settings} onSave={onSaveSettings} />
        {needLocate > 0 && (
          <button type="button" onClick={locateAll} disabled={!!locating}
            className="w-full rounded-xl bg-cyan-300/15 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/25 disabled:opacity-70">
            {locating ? `Locating… ${locating.done}/${locating.total}` : `Put ${needLocate} addresses on the map`}
          </button>
        )}
        {notFound.length > 0 && (
          <details className="text-xs text-glow-300">
            <summary className="cursor-pointer">{notFound.length} addresses only roughly found (check for typos)</summary>
            <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-slate-300">
              {notFound.map((c) => (
                <li key={c.id}><button type="button" onClick={() => onOpen(c.id)} className="text-left underline-offset-2 hover:underline">{c.fullName}: {c.address}</button></li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Top-right: filters and controls */}
      <div className={`absolute right-3 top-3 hidden w-64 space-y-2 p-3 md:block ${panel}`}>
        <select value={viewId} onChange={(e) => setViewId(e.target.value)} className={`w-full ${select}`} aria-label="Saved tab">
          <option value="">All customers</option>
          {views.map((v) => <option key={v.id} value={v.id}>Tab: {v.name}</option>)}
        </select>
        {!view && (
          <>
            <div className="flex gap-1">
              {['install', 'takedown'].map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize ${mode === m ? 'bg-white text-night-950' : 'bg-white/10'}`}>{m}s</button>
              ))}
            </div>
            <select value={area} onChange={(e) => setArea(e.target.value)} className={`w-full ${select}`} aria-label="Area">
              <option value="">All areas</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </>
        )}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showCalls} onChange={(e) => setShowCalls(e.target.checked)} /> Service calls</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={satellite} onChange={(e) => setSatellite(e.target.checked)} /> Satellite</label>
        <div className="flex gap-2">
          <button type="button" onClick={fitAll} className="flex-1 rounded-lg bg-white/10 py-1.5 text-sm">Fit all</button>
          <button type="button" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wallRef.current.requestFullscreen())}
            className="flex-1 rounded-lg bg-white/10 py-1.5 text-sm">Full screen</button>
        </div>
        <button type="button" onClick={saveStart} title="Open the map at this view, for everyone" className="w-full rounded-lg bg-white/10 py-1.5 text-sm">📌 Open the map here</button>
        {startMsg && <p className="text-xs text-emerald-300" role="status">{startMsg}</p>}
      </div>

      {/* Bottom: picked pin */}
      {picked && (pc || picked.kind === 'home') && (
        <div className={`absolute inset-x-3 bottom-3 mx-auto max-w-xl p-4 ${panel}`} role="dialog" aria-label="Pin details">
          {picked.kind === 'home' ? (
            <p className="font-semibold">◆ Home base · <span className="font-normal text-slate-300">{home.address}</span></p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{pc.fullName}</p>
                  <p className="truncate text-sm text-slate-400">{pc.address}</p>
                </div>
                <button type="button" onClick={() => setPicked(null)} className="text-slate-400" aria-label="Close">✕</button>
              </div>
              <p className="mt-2 text-sm">
                <span style={{ color: colors[statusOf(pc)] }}>● </span>{statusOf(pc) || BLANK_LABEL[key]}
                {gateFor(pc, gates) && <span className="text-glow-300"> · gate {gateFor(pc, gates).code}</span>}
                {home && pc.geo && <span className="text-slate-400"> · {formatMiles(milesBetween(home, pc.geo))} from home base</span>}
              </p>
              {picked.call && <p className="mt-1 text-sm" style={{ color: CALL }}>Service: {picked.call.issue}{picked.call.details ? ` — ${picked.call.details}` : ''}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button type="button" onClick={() => onOpen(pc.id)} className="rounded-full bg-glow-400 px-4 py-1.5 font-semibold text-night-950">Open customer</button>
                <a target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-4 py-1.5"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${pc.geo.lat},${pc.geo.lng}`}>Directions</a>
                {svLink === 'none'
                  ? <span className="rounded-full bg-white/5 px-4 py-1.5 text-slate-400">No Street View here</span>
                  : <a target="_blank" rel="noreferrer" className={`rounded-full bg-white/10 px-4 py-1.5 ${svLink ? '' : 'pointer-events-none opacity-50'}`}
                      aria-disabled={!svLink} href={svLink ?? undefined}>{svLink ? 'Street View' : 'Street View…'}</a>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
