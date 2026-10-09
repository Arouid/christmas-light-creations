import { useState } from 'react'
import { REINSTALL_PCT, addOnId, draftsFromText, isSet, yearlyPrice } from '../../lib/addOns'
import { seasonYear } from '../../lib/customers'
import { money, parseMoney } from '../../lib/discounts'
import { updateField } from '../staffStore'

// Staff: a customer's add-ons, price changes and the yearly price they lead to
// (docs/specs/add-ons.md). 50% is only the default: the re-install price and
// each entry's per-year amount can be set by hand. Customers see the same
// breakdown on /account/ once "Customer can see this" is ticked.
const fmt = (c) => (c == null ? '—' : money(c / 100))
const signed = (c) => (c < 0 ? `−${money(-c / 100)}` : `+${money(c / 100)}`)
const small = 'min-h-11 rounded-lg border border-white/15 bg-night-950 px-3 py-2 text-sm'
const btn = 'min-h-11 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15'
const SOURCE = { staff: 'typed in', history: 'from old notes', proposal: 'signed proposal' }
const numOrNull = (v) => (isSet(v) ? Number(v) : null)

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
  const [editing, setEditing] = useState(null)
  const halfOriginal = y.originalCents == null ? null : Math.round(y.originalCents / 2)

  return (
    <div className="space-y-4 text-sm">
      {y.baseCents == null
        ? <p className="text-glow-300">Set this customer’s <strong>Original rate</strong> (first-year full price, before discounts) in Edit details, or type their re-install price below.</p>
        : (
          <table className="w-full text-left">
            <tbody>
              <tr><td className="py-1.5 pr-2">Re-install {y.baseCustom ? '(set by hand)' : `(${REINSTALL_PCT}% of original ${fmt(y.originalCents)}${y.since ? `, ${y.since}` : ''})`}</td><td className="text-right tabular-nums">{fmt(y.baseCents)}</td></tr>
              {y.lines.map((l) => (
                <tr key={l.id} className="border-t border-white/10">
                  <td className="py-1.5 pr-2">{l.kind === 'change' ? l.what : `＋ ${l.what}`} <span className="text-slate-400">({l.kind === 'change' ? `from ${l.season}` : `${l.season}${l.custom ? ', set by hand' : `, ${REINSTALL_PCT}% of ${fmt(l.priceCents)}`}`})</span></td>
                  <td className="text-right tabular-nums">{signed(l.addsCents)}</td>
                </tr>
              ))}
              <tr className="border-t border-white/20 font-semibold"><td className="py-1.5">Yearly price {season} (before discounts)</td><td className="text-right tabular-nums">{fmt(y.yearlyCents)}</td></tr>
            </tbody>
          </table>
        )}
      {y.thisSeason.map((l) => <p key={l.id} className="text-slate-300">New in {season}: {l.what}{l.priceCents ? `, ${fmt(l.priceCents)} billed in full this season` : ''}; {signed(l.addsCents)} a year from {Number(season) + 1}.</p>)}
      {mismatch && <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-glow-300">This season’s rate on file is {money(onFile)}, but this breakdown gives {fmt(y.yearlyCents)}. Fix one of them (or add a price change below).</p>}

      <label className="block text-slate-400">Re-install price per year, if it isn’t {REINSTALL_PCT}% of the original
        <input key={String(c.reinstallBase ?? '')} defaultValue={c.reinstallBase ?? ''} inputMode="decimal"
          placeholder={halfOriginal == null ? '$ per year' : `${REINSTALL_PCT}% = ${fmt(halfOriginal)}`}
          onBlur={(e) => { const v = numOrNull(e.target.value.replace(/[^0-9.]/g, '')); if (v !== (c.reinstallBase ?? null)) save('reinstallBase', v) }}
          className={`${small} mt-1 block w-40`} aria-label="Re-install price per year" />
      </label>

      <div className="space-y-2">
        <p className="font-semibold">Add-ons and price changes ({list.length})</p>
        {list.length > 0 && (
          <ul className="divide-y divide-white/5">
            {list.toSorted((a, b) => String(a.season).localeCompare(String(b.season))).map((a) => (editing === a.id
              ? <li key={a.id} className="py-2"><EntryForm season={season} initial={a} label="Save" onSave={(v) => { setList(list.map((x) => (x.id === a.id ? { ...x, ...v } : x))); setEditing(null) }} onCancel={() => setEditing(null)} /></li>
              : (
                <li key={a.id} className="flex items-center gap-2 py-1">
                  <div className="min-w-0 flex-1">
                    <p><span className="font-medium">{a.season}</span> · {a.kind === 'change' ? `Price change: ${a.what}` : a.what}</p>
                    <p className="text-xs text-slate-400">
                      {a.kind !== 'change' && `${money(Number(a.price) || 0)} · `}
                      <span className="tabular-nums text-slate-300">{isSet(a.adds) ? `${signed(Math.round(Number(a.adds) * 100))} a year` : `+${REINSTALL_PCT}% a year`}</span>
                      {' · '}{SOURCE[a.source] ?? a.source}
                    </p>
                  </div>
                  <button type="button" onClick={() => setEditing(a.id)} className="min-h-11 px-2 text-slate-300" aria-label={`Edit ${a.what}`}>✎</button>
                  <button type="button" onClick={() => { if (window.confirm(`Remove “${a.what}” (${a.season})?`)) setList(list.filter((x) => x.id !== a.id)) }} className="min-h-11 px-2 text-slate-400" aria-label={`Remove ${a.what}`}>✕</button>
                </li>
              )))}
          </ul>
        )}
        <EntryForm season={season} label="＋ Add" onSave={(v) => setList([...list, { ...v, id: addOnId(), source: 'staff' }])} />
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
                <div key={d.key} className="space-y-1 rounded-lg bg-white/5 p-2">
                  <p className="text-xs text-slate-400">From: “{d.from}”</p>
                  <EntryForm season={season} initial={{ kind: 'addon', season: d.season, what: d.what, price: d.price }} label="Add"
                    onSave={(v) => { setList([...list, { ...v, id: addOnId(), source: 'history' }]); setDrafts((x) => x.filter((k) => k.key !== d.key)) }}
                    onCancel={() => setDrafts((x) => x.filter((k) => k.key !== d.key))} cancelLabel="Skip" />
                </div>
              ))}
              <button type="button" onClick={() => { save('addOnsChecked', true); setDrafts(null) }} className={btn}>Done checking these notes ✓</button>
            </div>
          )}
        </div>
      )}

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={Boolean(c.priceShown)} onChange={(e) => save('priceShown', e.target.checked)} />
        <span>Customer can see this on their account: yearly price{y.yearlyCents == null ? ' (once Original rate or re-install price is set)' : ''} and what they paid each season (Seasons above)</span>
      </label>
    </div>
  )
}

// Add-on: year added, what, full price (billed that year), per year after
// (blank = 50% of the price). Price change: from which season, what, ± per year.
function EntryForm({ season, initial, label, onSave, onCancel, cancelLabel = 'Cancel' }) {
  const start = { kind: 'addon', season, what: '', price: '', adds: '', ...initial }
  const [f, setF] = useState({ ...start, price: start.price ?? '', adds: start.adds ?? '' })
  const change = f.kind === 'change'
  const ok = /^20\d\d$/.test(String(f.season)) && String(f.what).trim() && (change ? isSet(f.adds) && Number(f.adds) !== 0 : Number(f.price) > 0 || isSet(f.adds))
  const money$ = (v, neg) => v.replace(neg ? /[^0-9.-]/g : /[^0-9.]/g, '')
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[8.5rem_5rem_1fr_7rem_7rem]">
      <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={small} aria-label="Type">
        <option value="addon">Add-on</option>
        <option value="change">Price change</option>
      </select>
      <input value={f.season} onChange={(e) => setF({ ...f, season: e.target.value.trim() })} inputMode="numeric" placeholder={change ? 'From year' : 'Year added'} aria-label={change ? 'From season' : 'Season added'} className={small} />
      <input value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} placeholder={change ? 'Why (e.g. Price increase, Loyalty)' : 'What (e.g. Arch over driveway)'} aria-label="Description" className={`${small} col-span-2 min-w-0 sm:col-span-1`} />
      {change
        ? <span className="hidden sm:block" />
        : <input value={f.price} onChange={(e) => setF({ ...f, price: money$(e.target.value) })} inputMode="decimal" placeholder="$ before discount" aria-label="Full price before discount" className={`${small} min-w-0`} />}
      <input value={f.adds} onChange={(e) => setF({ ...f, adds: money$(e.target.value, true) })} inputMode="decimal"
        placeholder={change ? '± $ per year' : `per yr: ${REINSTALL_PCT}%`} aria-label={change ? 'Change per year, plus or minus' : 'Per year after, if not 50%'} className={`${small} min-w-0`} />
      <div className="col-span-2 flex gap-2 sm:col-span-5">
        <button type="button" disabled={!ok} onClick={() => {
          onSave({ kind: f.kind, season: f.season, what: String(f.what).trim(), price: change ? null : numOrNull(f.price), adds: numOrNull(f.adds) })
          if (!initial) setF({ kind: f.kind, season, what: '', price: '', adds: '' })
        }} className={`${btn} disabled:opacity-40`}>{label}</button>
        {onCancel && <button type="button" onClick={onCancel} className={btn}>{cancelLabel}</button>}
      </div>
    </div>
  )
}
