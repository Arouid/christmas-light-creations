import { useState } from 'react'
import Field from './Field'

const control = 'block w-full rounded-xl border border-white/15 bg-night-900 px-4 py-3 text-base placeholder:text-slate-500'

export default function GatesView({ gates, onUpdate, onAdd }) {
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const q = search.trim().toLowerCase()
  const shown = q ? gates.filter((g) => g.neighborhood?.toLowerCase().includes(q)) : gates

  async function add(e) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const neighborhood = String(f.get('neighborhood')).trim()
    if (gates.some((g) => g.neighborhood?.toLowerCase() === neighborhood.toLowerCase())) {
      return setError(`${neighborhood} is already on the list.`)
    }
    setError(null)
    await onAdd(neighborhood, String(f.get('code')).trim())
    form.reset()
  }

  return (
    <>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search neighborhood…" className={control} />
      <p className="mt-3 text-sm text-slate-400">
        A customer’s own gate code wins. If they don’t have one, their card shows the code for their <strong>Neighborhood</strong> when it matches a name here.
      </p>
      <ul className="mt-3 space-y-3">
        {shown.map((g) => (
          <li key={g.id} className="rounded-2xl border border-white/10 bg-night-900 p-4">
            <p className="font-semibold">{g.neighborhood}</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Code" value={g.code} onSave={(v) => onUpdate(g.id, 'code', v)} />
              <Field label="Alternative" value={g.alternative} onSave={(v) => onUpdate(g.id, 'alternative', v)} />
              <Field label="Notes" value={g.notes} className="col-span-2" onSave={(v) => onUpdate(g.id, 'notes', v)} />
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 grid grid-cols-[1fr_7rem] gap-2 rounded-2xl border border-white/10 bg-night-900 p-4">
        <input name="neighborhood" required placeholder="New neighborhood" className={control} />
        <input name="code" required placeholder="Code" className={control} />
        <button className="col-span-2 rounded-full bg-glow-400 py-2.5 font-semibold text-night-950">Add gate code</button>
        {error && <p className="col-span-2 text-sm text-berry-500" role="alert">{error}</p>}
      </form>
    </>
  )
}
