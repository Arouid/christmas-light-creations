import { useEffect, useRef, useState } from 'react'
import { milesBetween } from '../../lib/geo'
import { loadMaps, locateAddress } from '../../lib/streetView'

const FT_PER_MILE = 5280
const btn = 'rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40'

const feetAlong = (pts, closed) => {
  let ft = 0
  for (let i = 1; i < pts.length; i++) ft += milesBetween(pts[i - 1], pts[i]) * FT_PER_MILE
  if (closed && pts.length > 2) ft += milesBetween(pts.at(-1), pts[0]) * FT_PER_MILE
  return ft
}

// Measure a house from above: satellite view of the address; tap the roof's
// corners to get real feet (one edge, or the whole outline). Used to set the
// designer's scale without anyone measuring on site.
// onDone({ feet, label, outlineFeet? }) or onDone(null) if cancelled.
export default function SatelliteMeasure({ address, onDone }) {
  const mapDiv = useRef(null)
  const map = useRef(null)
  const line = useRef(null)
  const dots = useRef([])
  const [pts, setPts] = useState([])
  const [closed, setClosed] = useState(false)
  const [msg, setMsg] = useState('Finding the house…')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [maps, spot] = await Promise.all([loadMaps(), locateAddress(address).catch(() => null)])
      if (cancelled) return
      if (!spot) { setMsg('Google couldn’t find that address.'); return }
      const { Map, Polyline } = await maps.importLibrary('maps')
      map.current = new Map(mapDiv.current, {
        center: spot, zoom: 20, mapTypeId: 'satellite', tilt: 0, heading: 0,
        disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false,
        // Two quick taps on corners must be two corners, not a double-click zoom.
        disableDoubleClickZoom: true,
      })
      line.current = new Polyline({ map: map.current, strokeColor: '#ffcf4d', strokeWeight: 3 })
      map.current.addListener('click', (e) => setPts((p) => [...p, { lat: e.latLng.lat(), lng: e.latLng.lng() }]))
      setMsg(null)
    })().catch(() => setMsg('The satellite map didn’t load.'))
    return () => { cancelled = true }
  }, [address])

  // Draw the traced line and corner dots.
  useEffect(() => {
    const maps = window.google?.maps
    if (!maps || !line.current) return
    line.current.setPath(closed && pts.length > 2 ? [...pts, pts[0]] : pts)
    dots.current.forEach((d) => d.setMap(null))
    dots.current = pts.map((p) => new maps.Circle({ map: map.current, center: p, radius: 0.25, strokeColor: '#050b1a', strokeWeight: 1, fillColor: '#ffcf4d', fillOpacity: 1, clickable: false }))
  }, [pts, closed])

  const feet = feetAlong(pts, closed)
  const use = () => onDone({ feet: Math.round(feet * 10) / 10, label: closed ? 'House outline (satellite)' : pts.length === 2 ? 'Satellite edge' : 'Satellite line' })

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-night-950" role="dialog" aria-modal="true" aria-label="Measure on satellite">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button type="button" onClick={() => onDone(null)} className={btn}>✕</button>
        <p className="min-w-0 flex-1 truncate font-semibold">🛰 Measure on satellite</p>
      </header>
      <div className="relative min-h-0 flex-1">
        <div ref={mapDiv} className="absolute inset-0" />
        {msg && <p className="absolute inset-0 grid place-items-center text-slate-400">{msg}</p>}
      </div>
      <div className="space-y-2 border-t border-white/10 px-3 py-3 text-sm">
        <p className="text-slate-400">
          Tap the two ends of one roof edge you can also see in your photo (e.g. the front corners). Or tap every corner and tick “whole outline” for the total.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-lg text-glow-300">{pts.length > 1 ? `${feet.toFixed(1)} ft` : '—'}</strong>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} /> Whole outline</label>
          <button type="button" onClick={() => setPts((p) => p.slice(0, -1))} disabled={!pts.length} className={btn}>Undo corner</button>
          <button type="button" onClick={() => setPts([])} disabled={!pts.length} className={btn}>Clear</button>
          <button type="button" onClick={use} disabled={pts.length < 2} className="ml-auto rounded-full bg-glow-400 px-5 py-2 font-semibold text-night-950 disabled:opacity-40">Use this length</button>
        </div>
        <p className="text-xs text-slate-500">Satellite images can be a little off at the edges, so tap the roof’s outer corners. Imagery © Google.</p>
      </div>
    </div>
  )
}
