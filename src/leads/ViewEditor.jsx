import { useState } from 'react'
import { INSTALL_STATUSES, TAKEDOWN_STATUSES } from '../lib/customers'
import { DEFAULT_COLUMNS, VIEW_COLUMNS, matchesView } from '../lib/views'
import { blankFor, select } from './ui'

const box = 'rounded-2xl border border-white/10 bg-night-950 p-4'
const chip = (on) => `cursor-pointer rounded-full px-3 py-1.5 text-sm ${on ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`

function Chips({ options, value, onChange, labelOf = (o) => o }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o || 'blank'} className={chip(value.includes(o))}>
          <input type="checkbox" className="sr-only" checked={value.includes(o)} onChange={() => toggle(o)} />
          {labelOf(o)}
        </label>
      ))}
    </div>
  )
}

export default function ViewEditor({ view, customers, season, onSave, onDelete, onClose }) {
  const [v, setV] = useState({
    name: '', mode: 'install', statuses: [], areas: [], installType: '', weekOf: '', columns: DEFAULT_COLUMNS, ...view,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }))

  const statuses = v.mode === 'takedown' ? TAKEDOWN_STATUSES : INSTALL_STATUSES
  const areas = [...new Set(customers.map((c) => c.locationBlock).filter(Boolean))].sort()
  const weeks = [...new Set(customers.map((c) => c.seasons?.[season]?.weekOf).filter(Boolean))].sort()
  const matches = customers.filter((c) => matchesView(c, v, season)).length

  async function save(e) {
    e.preventDefault()
    if (!v.name.trim()) return setError('Give the tab a name.')
    setBusy(true)
    try {
      const { id: _id, updatedAt: _u, updatedBy: _b, createdAt: _c, ...data } = v
      await onSave({ ...data, name: v.name.trim(), columns: VIEW_COLUMNS.map(([k]) => k).filter((k) => v.columns.includes(k)) })
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Edit tab">
      <form onSubmit={save} className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <h2 className="font-display text-2xl font-extrabold">{view?.id ? 'Edit tab' : 'New tab'}</h2>

        <label className="block text-sm text-slate-400">Tab name
          <input value={v.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} autoFocus placeholder="e.g. Nov week 3, Remaining jobs"
            className="mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100" />
        </label>

        <div className={box}>
          <p className="mb-2 text-sm font-semibold">Show</p>
          <div className="flex gap-2">
            {['install', 'takedown'].map((m) => (
              <button key={m} type="button" onClick={() => set({ mode: m, statuses: [] })}
                className={`flex-1 rounded-xl py-2 font-semibold capitalize ${v.mode === m ? 'bg-white text-night-950' : 'bg-white/10'}`}>{m}s {season}</button>
            ))}
          </div>
        </div>

        <div className={box}>
          <p className="mb-2 text-sm font-semibold">Status <span className="font-normal text-slate-400">(none ticked = all)</span></p>
          <Chips options={statuses} value={v.statuses} onChange={(statuses) => set({ statuses })} labelOf={(o) => o || blankFor(v.mode)} />
        </div>

        <div className={box}>
          <p className="mb-2 text-sm font-semibold">Area <span className="font-normal text-slate-400">(none ticked = all)</span></p>
          <Chips options={areas} value={v.areas} onChange={(a) => set({ areas: a })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-400">Early / regular
            <select value={v.installType} onChange={(e) => set({ installType: e.target.value })} className={`mt-1 w-full ${select}`}>
              <option value="">Both</option><option>Early Install</option><option>Regular Install</option>
            </select>
          </label>
          <label className="block text-sm text-slate-400">Week of
            <select value={v.weekOf} onChange={(e) => set({ weekOf: e.target.value })} className={`mt-1 w-full ${select}`}>
              <option value="">Any week</option>
              {weeks.map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>
        </div>

        <div className={box}>
          <p className="mb-2 text-sm font-semibold">Columns</p>
          <Chips options={VIEW_COLUMNS.map(([k]) => k)} value={v.columns} onChange={(columns) => set({ columns })}
            labelOf={(k) => Object.fromEntries(VIEW_COLUMNS)[k]} />
        </div>

        <p className="text-sm text-slate-300" role="status"><strong>{matches}</strong> {matches === 1 ? 'customer matches' : 'customers match'} right now.</p>
        {error && <p className="text-sm text-berry-500" role="alert">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className="flex-1 rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-50">Save tab</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/20 py-3 font-semibold">Cancel</button>
          {view?.id && (
            <button type="button" onClick={() => { if (window.confirm(`Delete the "${view.name}" tab for everyone? Customers are not affected.`)) onDelete() }}
              className="w-full rounded-full py-2 text-sm font-semibold text-berry-500 hover:bg-berry-600/10">Delete this tab</button>
          )}
        </div>
      </form>
    </div>
  )
}
