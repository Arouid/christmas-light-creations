import { useState } from 'react'
import { REINSTALL_PCT, addOnId, draftsFromText, yearlyPrice } from '../../lib/addOns'
import { seasonYear } from '../../lib/customers'
import { money, parseMoney } from '../../lib/discounts'
import { updateField } from '../staffStore'

// Staff: a customer's add-ons and the yearly price they lead to
// (docs/specs/add-ons.md). Customers see the same breakdown on /account/
// once "Customer can see this" is ticked.
const fmt = (c) => (c == null ? '—' : money(c / 100))
const small = 'min-h-11 rounded-lg border border-white/15 bg-night-950 px-3 py-2 text-sm'
const btn = 'min-h-11 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15'
const SOURCE = { staff: 'typed in', history: 'from old notes', proposal: 'signed proposal' }

export default function AddOnsPanel({ customer: c, user }) {
  const season = seasonYear()
  const y = yearlyPrice(c, season)
  const list = c.addOns ?? []
  const save = (path, value) => updateField(user, 'customers', c.id, path, value)
  const setList = (next) => save('addOns', next)
  const onFile = parseMoney(c.seasons?.[season]?.install?.rate)
  const mismatch = y.yearlyCents != null && onFile != null && Math.round(onFile * 100) !== y.yearlyCents
  const [drafts, setDrafts] = useState(null)
  const [found, setFound] = useState(0)

  return (
    <div className="space-y-4 text-sm">
      {y.originalCents == null
        ? <p className="text-glow-300">Set this customer’s <strong>Original rate</strong> (first-year full price, before discounts) in Edit details to work out the yearly price.</p>
        : (
          <table className="w-full text-left">
            <tbody>
              <tr><td className="py-1.5 pr-2">Re-install ({REINSTALL_PCT}% of original {fmt(y.originalCents)}{y.since ? `, ${y.since}` : ''})</td><td className="text-right tabular-nums">{fmt(y.baseCents)}</td></tr>
              {y.lines.map((l) => <tr key={l.id} className="border-t border-white/10"><td className="py-1.5 pr-2">＋ {l.what} <span className="text-slate-400">({l.season}, {REINSTALL_PCT}% of {fmt(l.priceCents)})</span></td><td className="text-right tabular-nums">{fmt(l.addsCents)}</td></tr>)}
              <tr className="border-t border-white/20 font-semibold"><td className="py-1.5">Yearly price {season} (before discounts)</td><td className="text-right tabular-nums">{fmt(y.yearlyCents)}</td></tr>
            </tbody>
          </table>
        )}
      {y.thisSeason.map((l) => <p key={l.id} className="text-slate-300">New in {season}: {l.what}, {fmt(l.priceCents)} billed in full this season; +{fmt(l.addsCents)} a year from {Number(season) + 1}.</p>)}
      {mismatch && <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-glow-300">This season’s rate on file is {money(onFile)}, but the add-on math gives {fmt(y.yearlyCents)}. Check one of them.</p>}

      <div className="space-y-2">
        <p className="font-semibold">Add-ons ({list.length})</p>
        {list.length > 0 && (
          <ul className="divide-y divide-white/5">
            {list.toSorted((a, b) => String(a.season).localeCompare(String(b.season))).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{a.season}</span>
                <span className="min-w-0 flex-1">{a.what}</span>
                <span className="tabular-nums">{money(Number(a.price) || 0)}</span>
                <span className="text-xs text-slate-400">{SOURCE[a.source] ?? a.source}</span>
                <button type="button" onClick={() => { if (window.confirm(`Remove “${a.what}” (${a.season})?`)) setList(list.filter((x) => x.id !== a.id)) }} className="min-h-11 px-2 text-slate-400" aria-label={`Remove ${a.what}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <AddOnForm season={season} onAdd={(a) => setList([...list, { ...a, id: addOnId(), source: 'staff' }])} />
      </div>

      {String(c.installHistory ?? '').trim() && (
        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <p className="font-semibold">Old notes: Install / add-on history {c.addOnsChecked && <span className="font-normal text-emerald-300">· checked ✓</span>}</p>
          <p className="whitespace-pre-wrap text-slate-300">{c.installHistory}</p>
          {!c.addOnsChecked && !drafts && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { const d = draftsFromText(c.installHistory).map((x) => ({ ...x, key: addOnId() })); setFound(d.length); setDrafts(d) }} className={btn}>Make add-ons from these notes</button>
              <button type="button" onClick={() => save('addOnsChecked', true)} className={btn}>No add-ons here ✓</button>
            </div>
          )}
          {drafts && (
            <div className="space-y-2">
              {!drafts.length && <p className="text-slate-400">{found ? 'All found items handled.' : 'Nothing with a year or price found. Add any by hand above.'}</p>}
              {drafts.map((d) => (
                <Draft key={d.key} draft={d} season={season}
                  onAdd={(a) => { setList([...list, { ...a, id: addOnId(), source: 'history' }]); setDrafts((x) => x.filter((k) => k.key !== d.key)) }}
                  onSkip={() => setDrafts((x) => x.filter((k) => k.key !== d.key))} />
              ))}
              <button type="button" onClick={() => { save('addOnsChecked', true); setDrafts(null) }} className={btn}>Done checking these notes ✓</button>
            </div>
          )}
        </div>
      )}

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={Boolean(c.priceShown)} disabled={y.yearlyCents == null} onChange={(e) => save('priceShown', e.target.checked)} />
        <span>Customer can see this breakdown on their account{y.yearlyCents == null ? ' (needs Original rate)' : ''}</span>
      </label>
    </div>
  )
}

function AddOnForm({ season, onAdd, initial, label = '＋ Add add-on', onSkip }) {
  const [f, setF] = useState(initial ?? { season, what: '', price: '' })
  const ok = /^20\d\d$/.test(String(f.season)) && f.what.trim() && Number(f.price) > 0
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-2 sm:grid-cols-[5rem_1fr_8rem_auto]">
      <input value={f.season} onChange={(e) => setF({ ...f, season: e.target.value.trim() })} inputMode="numeric" placeholder="Year" aria-label="Season added" className={small} />
      <input value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} placeholder="What (e.g. Arch over driveway)" aria-label="What was added" className={`${small} min-w-0`} />
      <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="$ before discount" aria-label="Price before discount" className={`${small} col-span-2 min-w-0 sm:col-span-1`} />
      <div className="col-span-2 flex gap-2 sm:col-span-1">
        <button type="button" disabled={!ok} onClick={() => { onAdd({ season: f.season, what: f.what.trim(), price: Number(f.price) }); if (!initial) setF({ season, what: '', price: '' }) }} className={`${btn} disabled:opacity-40`}>{label}</button>
        {onSkip && <button type="button" onClick={onSkip} className={btn}>Skip</button>}
      </div>
    </div>
  )
}

function Draft({ draft, season, onAdd, onSkip }) {
  return (
    <div className="space-y-1 rounded-lg bg-white/5 p-2">
      <p className="text-xs text-slate-400">From: “{draft.from}”</p>
      <AddOnForm season={season} initial={{ season: draft.season, what: draft.what, price: draft.price === '' ? '' : String(draft.price) }} label="Add" onAdd={onAdd} onSkip={onSkip} />
    </div>
  )
}
