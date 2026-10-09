import { useMemo, useState } from 'react'
import { findCustomer } from '../lib/oldEstimates'
import { textMessages } from '../lib/messages'
import Icon from '../components/Icon'
import { EmailQueue } from './BulkEmail'
import ComposeEmail from './ComposeEmail'
import { TextButton } from './Reach'
import { select } from './ui'

const action = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15'
const PAST_STATUSES = ['', 'Interested', 'Estimate booked', 'Not interested', 'Moved / bad info']
const STATUS_LABEL = { '': 'Not contacted yet' }

// Where each person stands: became a customer, a status staff set, or
// emailed from the list (any template this season).
function stateOf(r, customer, season) {
  if (customer) return 'customer'
  if (r.status) return r.status
  return r.seasons?.[season]?.emailsSent ? 'Emailed' : ''
}

const FILTERS = [
  ['todo', 'To contact', (s) => s === ''],
  ['Emailed', 'Emailed', (s) => s === 'Emailed'],
  ['Interested', 'Interested', (s) => s === 'Interested' || s === 'Estimate booked'],
  ['done', 'Not interested / bad', (s) => s === 'Not interested' || s === 'Moved / bad info'],
  ['customer', 'Already customers', (s) => s === 'customer'],
  ['all', 'All', () => true],
]

function PastCard({ r, customer, state, season, onUpdate, onMakeCustomer, onOpenCustomer }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const last = r.requests?.at(-1)
  const set = (path, value) => onUpdate(r.id, path, value)

  async function make() {
    setBusy(true)
    try {
      const id = await onMakeCustomer(r)
      await set('customerId', id)
      onOpenCustomer(id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-night-900">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 text-left" aria-expanded={open}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.fullName}</p>
            <p className="text-sm text-slate-400">
              Asked {r.lastAsked}{r.requests?.length > 1 && ` · ${r.requests.length} times`}{r.contactBy && ` · prefers ${r.contactBy}`}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${state === 'customer' ? 'bg-emerald-500/20 text-emerald-300' : state ? 'bg-white/10' : 'bg-glow-400 text-night-950'}`}>
            {state === 'customer' ? 'Customer' : state || 'New'}
          </span>
        </div>
        {r.missed && state !== 'customer' && (
          <p className="mt-2 rounded-lg bg-berry-600/20 px-2.5 py-1.5 text-xs text-berry-500">⚠ The old site’s email to us failed, so nobody saw this request at the time.</p>
        )}
        {last?.message && <p className={`mt-2 text-sm text-slate-300 ${open ? '' : 'line-clamp-2'}`}>{last.message}</p>}
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 p-4">
          {customer ? (
            <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Already a customer: <button type="button" onClick={() => onOpenCustomer(customer.id)} className="font-semibold underline">{customer.fullName}</button>
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {r.phone && <a className={action} href={`tel:${r.phone.replace(/\D/g, '')}`}><Icon name="phone" className="size-4" /> Call</a>}
            <TextButton phone={r.phone} className={action} message={textMessages.winback(r, season)} />
            <ComposeEmail person={r} season={season} start="winback" className={action} />
            {!customer && onMakeCustomer && (
              <button type="button" onClick={make} disabled={busy} className={`${action} text-glow-300`}>{busy ? 'Adding…' : '+ Make customer'}</button>
            )}
          </div>
          <dl className="space-y-1 text-sm">
            {r.email && <div><dt className="inline text-slate-400">Email: </dt><dd className="inline break-all">{r.email}</dd></div>}
            {r.otherEmails?.length > 0 && <div><dt className="inline text-slate-400">Also used: </dt><dd className="inline break-all">{r.otherEmails.join(', ')}</dd></div>}
            {r.phone && <div><dt className="inline text-slate-400">Phone: </dt><dd className="inline">{r.phone}</dd></div>}
            {r.address && <div><dt className="inline text-slate-400">Address: </dt><dd className="inline">{[r.address, r.city].filter(Boolean).join(', ')}</dd></div>}
          </dl>
          {r.requests?.length > 1 && (
            <ul className="space-y-2 text-sm">
              {r.requests.slice(0, -1).reverse().map((q) => (
                <li key={q.date + q.message} className="rounded-xl bg-night-950 px-3 py-2 text-slate-400"><span className="text-slate-500">{q.date}: </span>{q.message || '(no message)'}</li>
              ))}
            </ul>
          )}
          {!customer && (
            <label className="block text-sm text-slate-400">Status
              <select value={r.status ?? ''} onChange={(e) => set('status', e.target.value)} className={`${select} mt-1 w-full`}>
                {PAST_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm text-slate-400">Notes
            <textarea defaultValue={r.notes ?? ''} rows={2} onBlur={(e) => e.target.value !== (r.notes ?? '') && set('notes', e.target.value)}
              className="mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2 text-base text-slate-100" />
          </label>
        </div>
      )}
    </li>
  )
}

// People who asked for an estimate on the old website (2015–2026), as a
// list to win back: who's already a customer, who to contact, email in a row.
export default function PastRequestsView({ requests, error, customers, season, onUpdate, onMakeCustomer, onOpenCustomer }) {
  const [filter, setFilter] = useState('todo')
  const [year, setYear] = useState('')
  const [search, setSearch] = useState('')
  const [emailing, setEmailing] = useState(false)

  const rows = useMemo(() => (requests ?? []).map((r) => {
    const customer = (r.customerId && customers.find((c) => c.id === r.customerId)) || findCustomer(r, customers)
    return { r, customer, state: stateOf(r, customer, season) }
  }), [requests, customers, season])

  const years = useMemo(() => [...new Set(rows.map(({ r }) => r.year).filter(Boolean))].sort().reverse(), [rows])
  const q = search.trim().toLowerCase()
  const inYear = rows.filter(({ r }) => (!year || r.year === year)
    && (!q || [r.fullName, r.email, r.phone, r.address, r.requests?.map((x) => x.message).join(' ')].join(' ').toLowerCase().includes(q)))
  const test = Object.fromEntries(FILTERS.map(([k, , t]) => [k, t]))
  const shown = inYear.filter(({ state }) => test[filter](state)).sort((a, b) => Number(Boolean(b.r.missed)) - Number(Boolean(a.r.missed)))
  const emailable = shown.filter(({ r, state }) => r.email && !['customer', 'Not interested', 'Moved / bad info'].includes(state)).map(({ r }) => r)

  if (error) return <p className="mt-6 text-berry-500" role="alert">Couldn’t load past requests: {error}</p>
  if (!requests) return <p className="mt-6 text-slate-400">Loading…</p>
  if (!requests.length) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-night-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">No past requests yet</p>
        <p className="mt-1">Go to <a href="#import" className="text-glow-300 underline">Import</a> and pick <strong>past-requests-all.csv</strong> from the <strong>old-site-backup</strong> folder. Spam is filtered out and repeat requests are merged.</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-slate-400">
        People who asked for an estimate on the old website. Anyone already in Customers is matched by email, phone or name.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:flex lg:items-center">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, street, message…"
          className="col-span-2 block w-full rounded-xl border border-white/15 bg-night-900 px-4 py-2.5 text-base placeholder:text-slate-500 lg:max-w-sm" />
        <select value={year} onChange={(e) => setYear(e.target.value)} className={select} aria-label="Year asked">
          <option value="">All years</option>
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        {emailable.length > 0 && (
          <button type="button" onClick={() => setEmailing(true)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold lg:ml-auto">
            ✉ Email these {emailable.length}
          </button>
        )}
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Filter">
        {FILTERS.map(([k, label, t]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${filter === k ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
            {label} <span className="opacity-70">{inYear.filter(({ state }) => t(state)).length}</span>
          </button>
        ))}
      </div>
      {!shown.length && <p className="mt-6 text-slate-400">Nobody here.</p>}
      <ul className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        {shown.map(({ r, customer, state }) => (
          <PastCard key={r.id} r={r} customer={customer} state={state} season={season}
            onUpdate={onUpdate} onMakeCustomer={onMakeCustomer} onOpenCustomer={onOpenCustomer} />
        ))}
      </ul>
      {emailing && <EmailQueue rows={emailable} season={season} onUpdate={onUpdate} templateId="winback" onClose={() => setEmailing(false)} />}
    </>
  )
}
