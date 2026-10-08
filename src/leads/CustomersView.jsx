import { useMemo, useState } from 'react'
import { BLANK_LABEL } from '../lib/customers'
import DataTable from './DataTable'

const input = 'block w-full rounded-xl border border-white/15 bg-night-900 px-4 py-3 text-base placeholder:text-slate-500'

function AddCustomer({ onCreate, onDone }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const fields = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v))
    fields.fullName = `${fields.firstName ?? ''} ${fields.lastName ?? ''}`.trim()
    setBusy(true)
    setError(null)
    try {
      onDone(await onCreate(fields))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-night-900 p-4 sm:grid-cols-2">
      <input name="firstName" required placeholder="First name" className={input} />
      <input name="lastName" required placeholder="Last name" className={input} />
      <input name="phone" type="tel" placeholder="Phone" className={input} />
      <input name="email" type="email" placeholder="Email" className={input} />
      <input name="address" placeholder="Address, city, ZIP" className={`${input} sm:col-span-2`} />
      <input name="city" placeholder="City" className={input} />
      <div className="flex gap-2 sm:justify-end">
        <button type="button" onClick={() => onDone(null)} className="flex-1 rounded-full border border-white/20 px-5 py-3 font-semibold sm:flex-none">Cancel</button>
        <button disabled={busy} className="flex-1 rounded-full bg-glow-400 px-5 py-3 font-semibold text-night-950 disabled:opacity-50 sm:flex-none">Add</button>
      </div>
      {error && <p className="text-sm text-berry-500 sm:col-span-2" role="alert">{error}</p>}
    </form>
  )
}

export default function CustomersView({ customers, season, onOpen, onCreate }) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      [c.fullName, c.address, c.city, c.neighborhood, c.phone, c.email, c.locationBlock].join(' ').toLowerCase().includes(q))
  }, [customers, search])

  return (
    <>
      <div className="flex gap-2">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, street, phone…" className={input} />
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="shrink-0 rounded-xl bg-glow-400 px-4 font-semibold text-night-950">+ Add</button>
        )}
      </div>
      {adding && <AddCustomer onCreate={onCreate} onDone={(id) => { setAdding(false); if (id) onOpen(id) }} />}

      <p className="mt-4 text-sm text-slate-400">{shown.length} of {customers.length} customers</p>
      <div className="mt-2 hidden lg:block">
        <DataTable label="Customers" rows={shown} onRowClick={onOpen} columns={[
          { key: 'name', label: 'Name', get: (c) => c.lastName ? `${c.lastName} ${c.firstName ?? ''}` : c.fullName, render: (c) => <span className="font-medium">{c.fullName}</span> },
          { key: 'address', label: 'Address', get: (c) => c.address, className: 'max-w-xs truncate' },
          { key: 'city', label: 'City', get: (c) => c.city },
          { key: 'phone', label: 'Phone', get: (c) => c.phone, className: 'whitespace-nowrap' },
          { key: 'area', label: 'Area', get: (c) => c.locationBlock, className: 'max-w-[14rem] truncate' },
          { key: 'type', label: 'Type', get: (c) => c.installType?.replace(' Install', '') },
          { key: 'status', label: `${season} status`, get: (c) => c.seasons?.[season]?.installStatus || BLANK_LABEL.installStatus },
        ]} />
      </div>
      <ul className="mt-2 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-night-900 lg:hidden">
        {shown.map((c) => {
          const status = c.seasons?.[season]?.installStatus
          return (
            <li key={c.id}>
              <button type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.fullName}</span>
                  <span className="block truncate text-sm text-slate-400">{c.address || c.city || 'No address'}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-slate-400">{status || BLANK_LABEL.installStatus}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
