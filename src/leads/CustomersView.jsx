import { useMemo, useState } from 'react'
import { BLANK_LABEL } from '../lib/customers'
import { COLUMNS_KEY, CUSTOMER_COLUMNS, DEFAULT_CUSTOMER_COLUMNS, columnValue, readColumns } from '../lib/customerColumns'
import DataTable from './DataTable'
import ViewTab from './ViewTab'

const chip = (on) => `inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3.5 text-sm font-medium ${on ? 'bg-glow-400 text-night-950' : 'bg-white/10 hover:bg-white/15'}`
const WIDTH = { address: 'max-w-xs truncate', area: 'max-w-[14rem] truncate', notes: 'max-w-xs truncate', email: 'max-w-[14rem] truncate', phone: 'whitespace-nowrap' }
const storedColumns = () => { try { return readColumns(localStorage.getItem(COLUMNS_KEY)) } catch { return DEFAULT_CUSTOMER_COLUMNS } }

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

// Pick the table's columns (desktop); remembered on this device.
function ColumnPicker({ cols, onChange }) {
  const toggle = (k) => onChange(cols.includes(k) ? cols.filter((x) => x !== k) : [...cols, k])
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-night-900 p-3" aria-label="Table columns">
      {CUSTOMER_COLUMNS.map(([k, label]) => (
        <label key={k} className={`cursor-pointer ${chip(cols.includes(k))}`}>
          <input type="checkbox" className="sr-only" checked={cols.includes(k)} onChange={() => toggle(k)} />{label}
        </label>
      ))}
      <button type="button" onClick={() => onChange(DEFAULT_CUSTOMER_COLUMNS)} className="min-h-11 px-2 text-sm text-slate-400 underline">Reset</button>
    </div>
  )
}

// adding / picking (the + Add form and the Columns picker) are toggled from
// the chip row above, so the list starts right under the search box.
function AllCustomers({ customers, season, gates, onOpen, onCreate, adding, onDoneAdding, picking }) {
  const [search, setSearch] = useState('')
  const [cols, setCols] = useState(storedColumns)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      [c.fullName, c.address, c.city, c.neighborhood, c.phone, c.email, c.locationBlock].join(' ').toLowerCase().includes(q))
  }, [customers, search])

  const changeCols = (next) => {
    const keys = next.length ? next : DEFAULT_CUSTOMER_COLUMNS
    setCols(keys)
    try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(keys)) } catch { /* private mode: fine */ }
  }
  const columns = CUSTOMER_COLUMNS.filter(([k]) => cols.includes(k)).map(([k, label]) => ({
    key: k, label: k === 'status' ? `${season} status` : label, className: WIDTH[k] ?? '',
    get: (c) => columnValue(c, k, season, gates),
    ...(k === 'name' ? { render: (c) => <span className="font-medium">{c.fullName}</span> } : {}),
  }))

  return (
    <>
      <div className="relative">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${customers.length} customers: name, street, phone…`} className={`${input} ${search ? 'pr-28' : ''}`} />
        {search && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400" aria-live="polite">{shown.length} match{shown.length === 1 ? '' : 'es'}</span>}
      </div>
      {adding && <AddCustomer onCreate={onCreate} onDone={(id) => { onDoneAdding(); if (id) onOpen(id) }} />}
      {picking && <div className="hidden lg:block"><ColumnPicker cols={cols} onChange={changeCols} /></div>}
      <div className="mt-2 hidden lg:block">
        <DataTable label="Customers" rows={shown} onRowClick={onOpen} columns={columns} />
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

// Customers tab: the whole list, or one of the saved filters (#view-<id>),
// picked from the chip row. Filters used to be their own tabs in the top bar;
// moved here 2026-10-10 because the bar got too long.
export default function CustomersView({ customers, season, gates = [], views = [], viewId = null, onOpen, onCreate, onUpdate, onNewView, onEditView, onDeleteView }) {
  const view = viewId ? views.find((v) => v.id === viewId) : null
  const [adding, setAdding] = useState(false)
  const [picking, setPicking] = useState(false)
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Saved filters">
          <a href="#customers" role="tab" aria-selected={!viewId} className={chip(!viewId)}>All <span className="opacity-70">{customers.length}</span></a>
          {views.map((v) => (
            <a key={v.id} href={`#view-${v.id}`} role="tab" aria-selected={viewId === v.id} className={chip(viewId === v.id)}>{v.name}</a>
          ))}
          <button type="button" onClick={onNewView} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-glow-400 hover:text-glow-300">+ New filter</button>
        </div>
        {!viewId && (
          <>
            <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking}
              className="hidden min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-sm font-semibold lg:inline-flex lg:items-center">Columns {picking ? '▴' : '▾'}</button>
            {!adding && <button type="button" onClick={() => setAdding(true)} className="min-h-11 shrink-0 rounded-full bg-glow-400 px-4 text-sm font-semibold text-night-950">+ Add</button>}
          </>
        )}
      </div>
      {viewId && !view && <p className="mt-6 text-slate-400">This filter was deleted. <a href="#customers" className="text-glow-300 underline">All customers</a></p>}
      {view && (
        <ViewTab view={view} customers={customers} season={season} gates={gates} onOpen={onOpen} onUpdate={onUpdate}
          onEdit={() => onEditView(view)} onDelete={() => onDeleteView(view.id)} />
      )}
      {!viewId && <AllCustomers customers={customers} season={season} gates={gates} onOpen={onOpen} onCreate={onCreate} adding={adding} onDoneAdding={() => setAdding(false)} picking={picking} />}
    </>
  )
}
