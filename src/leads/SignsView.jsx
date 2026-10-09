import { useMemo, useState } from 'react'
import { money, parseMoney } from '../lib/discounts'
import { milesBetween } from '../lib/geo'
import { SIGN_DEFAULTS, attribute, cornerCode, dailySeries, roiByCorner } from '../lib/signs'
import { locateAddress } from '../lib/streetView'
import DataTable from './DataTable'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const btn = 'rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15'
const SITE = 'https://christmas-light-creations.com/'
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const fmtDay = (s) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtWhen = (s) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const n1 = (x) => (Math.round(x * 10) / 10).toString()

// Log a sign: from the phone's location at the corner, or by cross streets.
function PlaceSign({ drops, onAdd, onClose }) {
  const [where, setWhere] = useState(null) // { lat, lng }
  const [streets, setStreets] = useState('')
  const [corner, setCorner] = useState('')
  const [placedAt, setPlacedAt] = useState(nowLocal)
  const [cost, setCost] = useState(String(SIGN_DEFAULTS.cost))
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const corners = useMemo(() => [...new Map(drops.map((d) => [d.code, d])).values()], [drops])
  const nearest = where && corners.map((c) => ({ c, mi: milesBetween(where, c) })).sort((a, b) => a.mi - b.mi)[0]
  const sameCorner = nearest && nearest.mi <= 0.15 ? nearest.c : null

  function useMyLocation() {
    setMsg('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      (p) => { setWhere({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg(null) },
      () => setMsg('Couldn’t get your location. Allow location for this site, or type the cross streets.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }
  async function findStreets() {
    setMsg('Looking up…')
    const found = await locateAddress(`${streets}, TX`).catch(() => null)
    if (!found) return setMsg('Couldn’t find that. Try “Broadway St & Hwy 288, Pearland”.')
    setWhere(found)
    setMsg(null)
  }
  async function save() {
    // Blank name: join the existing corner right here, else use the typed streets.
    const name = (corner.trim() || sameCorner?.corner || streets.replace(/,.*$/, '')).trim()
    if (!where || !name) return setMsg('Set the location and a corner name.')
    setBusy(true)
    await onAdd({ corner: name, code: cornerCode(name), lat: where.lat, lng: where.lng, placedAt: new Date(placedAt).toISOString(), cost: Number(cost) || 0 })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Place a sign">
      <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">📍 Place a sign</h2>
          <button type="button" onClick={onClose} className={btn}>Close</button>
        </div>
        <button type="button" onClick={useMyLocation} className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950">
          Use my location (I’m at the corner)
        </button>
        <div className="flex items-end gap-2">
          <label className="block flex-1 text-sm text-slate-400">…or cross streets
            <input value={streets} onChange={(e) => setStreets(e.target.value)} className={field} placeholder="Broadway & 288, Pearland" />
          </label>
          <button type="button" onClick={findStreets} disabled={!streets.trim()} className={`${btn} mb-0.5 disabled:opacity-40`}>Find</button>
        </div>
        {where && <p className="text-sm text-emerald-400">Location set ✓ {sameCorner && <span className="text-slate-300">Same corner as <strong>{sameCorner.corner}</strong>?</span>}</p>}
        <label className="block text-sm text-slate-400">Corner name {sameCorner ? <span>(blank = “{sameCorner.corner}”)</span> : streets.trim() && <span>(blank = “{streets.replace(/,.*$/, '').trim()}”)</span>}
          <input value={corner} onChange={(e) => setCorner(e.target.value)} list="sign-corners" className={field} placeholder="Broadway & 288" />
          <datalist id="sign-corners">{corners.map((c) => <option key={c.code} value={c.corner} />)}</datalist>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm text-slate-400">Placed
            <input type="datetime-local" value={placedAt} onChange={(e) => setPlacedAt(e.target.value)} className={field} />
          </label>
          <label className="block text-sm text-slate-400">Cost ($)
            <input value={cost} inputMode="decimal" onChange={(e) => setCost(e.target.value)} className={field} />
          </label>
        </div>
        {msg && <p className="text-sm text-glow-300" role="status">{msg}</p>}
        <button type="button" onClick={save} disabled={busy} className="w-full rounded-full bg-white py-3 font-semibold text-night-950 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save sign'}
        </button>
      </div>
    </div>
  )
}

async function downloadQr(code) {
  const { default: QRCode } = await import('qrcode')
  const url = await QRCode.toDataURL(`${SITE}?sign=${code}`, { errorCorrectionLevel: 'H', margin: 2, width: 1500 })
  const a = Object.assign(document.createElement('a'), { href: url, download: `qr-${code}.png` })
  a.click()
}

function Chart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.sign + d.other))
  return (
    <div className="rounded-2xl border border-white/10 bg-night-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Requests per day</p>
        <p className="flex gap-3 text-xs text-slate-400">
          <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-glow-400" />from signs</span>
          <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-white/25" />other</span>
          <span>📍 signs placed</span>
        </p>
      </div>
      {/* Opens scrolled to today (the right end) on narrow screens. */}
      <div className="mt-4 overflow-x-auto pb-1" ref={(el) => { if (el && !el.dataset.scrolled) { el.scrollLeft = el.scrollWidth; el.dataset.scrolled = '1' } }}>
        <div className="flex h-36 min-w-max items-end gap-1">
          {series.map((d) => (
            <div key={d.day} className="flex w-5 flex-col items-center justify-end gap-0.5" title={`${fmtDay(d.day + 'T12:00')}: ${d.sign} from signs, ${d.other} other, ${d.drops} signs placed`}>
              <div className="w-full rounded-t bg-white/25" style={{ height: `${(d.other / max) * 100}px` }} />
              <div className="w-full rounded-t bg-glow-400" style={{ height: `${(d.sign / max) * 100}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex min-w-max gap-1 text-[10px] text-slate-500">
          {series.map((d, i) => (
            <div key={d.day} className="w-5 text-center leading-tight">
              <div className="h-4">{d.drops ? `📍${d.drops > 1 ? d.drops : ''}` : ''}</div>
              <div>{i % 3 === 0 ? fmtDay(d.day + 'T12:00').replace(' ', ' ') : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Signs tab: log drops, see which corners bring requests and bookings.
export default function SignsView({ drops, error, leads, customers, season, settings, onSaveSettings, onAdd, onUpdate, onRemove, onUpdateLead }) {
  const [placing, setPlacing] = useState(false)
  const [locating, setLocating] = useState(null)
  const { signRadiusMiles, signLifeDays, signLagDays } = settings
  const opts = useMemo(() => ({
    radiusMiles: signRadiusMiles ?? SIGN_DEFAULTS.radiusMiles,
    lifeDays: signLifeDays ?? SIGN_DEFAULTS.lifeDays,
    lagDays: signLagDays ?? SIGN_DEFAULTS.lagDays,
  }), [signRadiusMiles, signLifeDays, signLagDays])

  const byCustomer = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  // A lead's home location: its own, or its linked customer's.
  const located = useMemo(() => (leads ?? []).map((l) => {
    const c = l.customerId && byCustomer.get(l.customerId)
    return { ...l, geo: l.geo?.lat != null ? l.geo : c?.geo?.lat != null ? c.geo : null }
  }), [leads, byCustomer])
  const list = useMemo(() => drops ?? [], [drops])
  const credit = useMemo(() => attribute(located, list, opts), [located, list, opts])
  const revenueOf = (l) => {
    const c = l?.customerId && byCustomer.get(l.customerId)
    return c ? parseMoney(c.seasons?.[season]?.install?.total) ?? 0 : 0
  }
  const rows = roiByCorner(list, located, credit, revenueOf)
  const days = 30
  const series = dailySeries(located, list, credit, days)
  const unlocated = located.filter((l) => !l.geo && l.address && !l.geoMissing)

  async function locateLeads() {
    for (const [i, l] of unlocated.entries()) {
      setLocating(`${i + 1}/${unlocated.length}`)
      const found = await locateAddress([l.address, l.city, 'TX', l.zip].filter(Boolean).join(', ')).catch(() => null)
      await onUpdateLead(l.id, found ? { geo: found } : { geoMissing: true })
    }
    setLocating('done')
  }

  const setOpt = (key) => (e) => { const v = Number(e.target.value); if (v > 0) onSaveSettings({ [key]: v }) }
  const totals = rows.reduce((t, r) => ({ cost: t.cost + r.cost, leads: t.leads + r.confirmed + r.likely, revenue: t.revenue + r.revenue }), { cost: 0, leads: 0, revenue: 0 })

  const columns = [
    { key: 'name', label: 'Corner', get: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'drops', label: 'Placed', get: (r) => r.drops },
    { key: 'cost', label: 'Cost', get: (r) => r.cost, render: (r) => `$${r.cost}` },
    { key: 'confirmed', label: 'Confirmed', get: (r) => r.confirmed, render: (r) => n1(r.confirmed) },
    { key: 'likely', label: 'Likely', get: (r) => r.likely, render: (r) => n1(r.likely) },
    { key: 'nearby', label: 'Nearby', get: (r) => r.nearby, render: (r) => <span className="text-slate-400">{n1(r.nearby)}</span> },
    { key: 'booked', label: 'Booked', get: (r) => r.booked, render: (r) => n1(r.booked) },
    { key: 'revenue', label: 'Revenue', get: (r) => r.revenue, render: (r) => (r.revenue ? money(r.revenue) : '—') },
    { key: 'cpl', label: '$ / lead', get: (r) => r.costPerLead ?? 1e9, render: (r) => (r.costPerLead == null ? '—' : `$${r.costPerLead.toFixed(0)}`) },
    { key: 'qr', label: 'QR', get: () => '', render: (r) => <button type="button" onClick={(e) => { e.stopPropagation(); downloadQr(r.code) }} className="text-glow-300 underline">Download</button> },
  ]

  if (error) return <p className="mt-6 text-berry-500" role="alert">Couldn’t load signs: {error}</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPlacing(true)} className="rounded-full bg-glow-400 px-5 py-3 font-semibold text-night-950">📍 Place sign here</button>
        <p className="text-sm text-slate-400">
          {list.length} placed · ${totals.cost} spent · {n1(totals.leads)} requests from signs{totals.revenue ? ` · ${money(totals.revenue)} booked` : ''}
        </p>
      </div>

      <Chart series={series} />

      <div>
        <p className="mb-2 text-sm text-slate-400">
          <strong className="text-slate-200">Confirmed</strong>: scanned that corner’s QR code.{' '}
          <strong className="text-slate-200">Likely</strong>: said “Road sign”, split across signs that were up (nearest first).{' '}
          <strong className="text-slate-200">Nearby</strong>: didn’t say, but lives within {opts.radiusMiles} mi of a sign that was up. A hint only.
        </p>
        {rows.length ? <DataTable rows={rows} columns={columns} label="Sign results by corner" /> : <p className="text-slate-400">No signs logged yet. Tap 📍 Place sign here at the corner.</p>}
      </div>

      {unlocated.length > 0 && (
        <p className="text-sm text-slate-400">
          {unlocated.length} requests aren’t on the map yet, so “nearby” can’t count them.{' '}
          <button type="button" onClick={locateLeads} disabled={!!locating && locating !== 'done'} className="text-glow-300 underline">
            {locating && locating !== 'done' ? `Locating ${locating}…` : 'Locate them'}
          </button>
        </p>
      )}

      <details className="rounded-2xl border border-white/10 bg-night-900 p-4">
        <summary className="cursor-pointer font-semibold">Recent signs ({list.length})</summary>
        <ul className="mt-3 divide-y divide-white/5 text-sm">
          {list.slice(0, 40).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{d.corner}</strong> <span className="text-slate-400">· {fmtWhen(d.placedAt)}{d.removedAt ? ` · pulled ${fmtWhen(d.removedAt)}` : ''}{d.updatedBy ? ` · ${d.updatedBy.split('@')[0]}` : ''}</span></span>
              <span className="flex gap-2">
                {!d.removedAt && <button type="button" onClick={() => onUpdate(d.id, 'removedAt', new Date().toISOString())} className={btn}>Gone</button>}
                <button type="button" onClick={() => window.confirm(`Delete this ${d.corner} sign? Only for mistakes.`) && onRemove(d.id)} className={`${btn} text-slate-400`}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      </details>

      <details className="rounded-2xl border border-white/10 bg-night-900 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">How it counts</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-slate-400">Nearby radius (miles)
            <input type="number" min="0.1" step="0.1" defaultValue={opts.radiusMiles} onBlur={setOpt('signRadiusMiles')} className={field} />
          </label>
          <label className="text-slate-400">A sign usually lasts (days)
            <input type="number" min="0.5" step="0.5" defaultValue={opts.lifeDays} onBlur={setOpt('signLifeDays')} className={field} />
          </label>
          <label className="text-slate-400">People call up to (days after)
            <input type="number" min="0" step="1" defaultValue={opts.lagDays} onBlur={setOpt('signLagDays')} className={field} />
          </label>
        </div>
        <p className="mt-3 text-slate-400">Revenue counts requests linked to a customer, using that customer’s {season} install total. Tap “Gone” when you see a sign was pulled.</p>
      </details>

      {placing && <PlaceSign drops={list} onAdd={onAdd} onClose={() => setPlacing(false)} />}
    </div>
  )
}
