import { useMemo, useState } from 'react'
import { FILED_STATUSES as FILED, findCustomer, pastGroup } from '../lib/oldEstimates'
import { textMessages } from '../lib/messages'
import Icon from '../components/Icon'
import { EmailQueue } from './BulkEmail'
import ComposeEmail from './ComposeEmail'
import { TextButton } from './Reach'
import { select } from './ui'

const action = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15'
const PAST_STATUSES = ['', 'Interested', 'Estimate booked', 'Not interested', 'Moved / bad info', 'Deceased', 'Personal (family/friends)', 'Junk / spam']
// Never contacted again: no text, email or "Email these".
const DO_NOT_CONTACT = ['customer', 'Not interested', 'Moved / bad info', ...FILED]
const STATUS_LABEL = { '': 'Not contacted yet' }

// Where each person stands: became a customer, a status staff set, or
// emailed from the list (any template this season). Filed-away statuses win over all.
function stateOf(r, customer, season) {
  if (FILED.includes(r.status)) return r.status
  if (customer) return 'customer'
  if (r.status) return r.status
  return r.seasons?.[season]?.emailsSent ? 'Emailed' : ''
}

// Who they were to us: paid or were invoiced before (win-backs), asked for an
// estimate, or only texted/called the business line.
const GROUPS = [
  ['winback', 'Win-backs', 'Paid us or were invoiced before, not current customers now.', (r) => pastGroup(r) === 'winback'],
  ['asked', 'Past requests', 'Asked for an estimate but never paid us.', (r) => pastGroup(r) === 'asked'],
  ['voice', 'Texted us', 'Texted or called the business line a lot, or a saved contact; no form or payment.', (r) => pastGroup(r) === 'voice'],
]
const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`
const yearsOf = (a, b) => (a && b && a.slice(0, 4) !== b.slice(0, 4) ? `${a.slice(0, 4)}–${b.slice(0, 4)}` : (b || a || '').slice(0, 4))

function summary(r) {
  if (r.payments?.length) {
    return r.paid > 0 ? `Paid ${usd(r.paid)} · ${yearsOf(r.firstPaid, r.lastPaid)}` : `Invoiced ${yearsOf(r.firstPaid, r.lastPaid)}`
  }
  if (!r.requests?.length) return r.voice?.summary ?? ''
  return `Asked ${r.lastAsked}${r.requests.length > 1 ? ` · ${r.requests.length} times` : ''}`
}

const FILTERS = [
  ['todo', 'To contact', (s) => s === ''],
  ['Emailed', 'Emailed', (s) => s === 'Emailed'],
  ['Interested', 'Interested', (s) => s === 'Interested' || s === 'Estimate booked'],
  ['done', 'Not interested / bad', (s) => s === 'Not interested' || s === 'Moved / bad info'],
  ['customer', 'Already customers', (s) => s === 'customer'],
  ['Deceased', 'Deceased', (s) => s === 'Deceased'],
  ['filed', 'Personal / junk', (s) => s === 'Personal (family/friends)' || s === 'Junk / spam'],
  ['all', 'All', () => true],
]

function PastCard({ r, customer, state, season, onUpdate, onMakeCustomer, onOpenCustomer }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const last = r.requests?.at(-1)
  const filed = FILED.includes(state)
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
              {summary(r)}{r.contactBy && ` · prefers ${r.contactBy}`}
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
            {r.phone && !filed && <a className={action} href={`tel:${r.phone.replace(/\D/g, '')}`}><Icon name="phone" className="size-4" /> Call</a>}
            {!filed && <TextButton phone={r.phone} className={action} message={(r.payments?.length ? textMessages.comeback : textMessages.winback)(r, season)} />}
            {!filed && <ComposeEmail person={r} season={season} target={{ pastRequestId: r.id }} start={r.payments?.length ? 'comeback' : 'winback'} className={action} />}
            {!customer && !filed && onMakeCustomer && (
              <button type="button" onClick={make} disabled={busy} className={`${action} text-glow-300`}>{busy ? 'Adding…' : '+ Make customer'}</button>
            )}
          </div>
          <dl className="space-y-1 text-sm">
            {r.email && <div><dt className="inline text-slate-400">Email: </dt><dd className="inline break-all">{r.email}</dd></div>}
            {r.otherEmails?.length > 0 && <div><dt className="inline text-slate-400">Also used: </dt><dd className="inline break-all">{r.otherEmails.join(', ')}</dd></div>}
            {r.phone && <div><dt className="inline text-slate-400">Phone: </dt><dd className="inline">{r.phone}</dd></div>}
            {r.address && <div><dt className="inline text-slate-400">Address: </dt><dd className="inline">{[r.address, r.city].filter(Boolean).join(', ')}</dd></div>}
          </dl>
          {r.payments?.length > 0 && (
            <ul className="space-y-1 text-sm">
              {[...r.payments].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                <li key={`${x.date}${x.invoice}${x.amount}${x.kind}`} className="rounded-xl bg-night-950 px-3 py-2 text-slate-400">
                  <span className="text-slate-500">{x.date}: </span>
                  {x.kind === 'payment' ? `💲 Paid ${usd(x.amount)}` : `🧾 Invoiced ${usd(x.amount)}`} by {x.via}{x.invoice && ` · #${x.invoice}`}
                  {x.items && <span className="block text-xs">{x.items}</span>}
                </li>
              ))}
            </ul>
          )}
          {r.voice?.summary && r.requests?.length > 0 && <p className="text-sm text-slate-400">📞 {r.voice.summary}</p>}
          {r.requests?.length > (r.payments?.length ? 0 : 1) && (
            <ul className="space-y-2 text-sm">
              {[...(r.payments?.length ? r.requests : r.requests.slice(0, -1))].reverse().map((q) => (
                <li key={q.date + q.message} className="rounded-xl bg-night-950 px-3 py-2 text-slate-400"><span className="text-slate-500">{q.date}: </span>{q.message || '(no message)'}</li>
              ))}
            </ul>
          )}
          {(!customer || filed) && (
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
  const [group, setGroup] = useState('winback')
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
  const groupTest = GROUPS.find(([k]) => k === group)[3]
  const inGroup = rows.filter(({ r }) => groupTest(r))
  const inYear = inGroup.filter(({ r }) => (!year || r.year === year)
    && (!q || [r.fullName, r.email, r.phone, r.address, r.requests?.map((x) => x.message).join(' ')].join(' ').toLowerCase().includes(q)))
  const test = Object.fromEntries(FILTERS.map(([k, , t]) => [k, t]))
  // Missed requests first; in "Texted us", named people (saved contacts) before
  // bare numbers, most texts first.
  const named = (r) => Number(!/^[\d\s()+-]*$/.test(r.fullName ?? ''))
  const shown = inYear.filter(({ state }) => test[filter](state)).sort((a, b) => Number(Boolean(b.r.missed)) - Number(Boolean(a.r.missed))
    || (group === 'voice' ? named(b.r) - named(a.r) || (b.r.voice?.entries ?? 0) - (a.r.voice?.entries ?? 0) : 0))
  const emailable = shown.filter(({ r, state }) => r.email && !DO_NOT_CONTACT.includes(state)).map(({ r }) => r)

  if (error) return <p className="mt-6 text-berry-500" role="alert">Couldn’t load past requests: {error}</p>
  if (!requests) return <p className="mt-6 text-slate-400">Loading…</p>
  if (!requests.length) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-night-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">No past requests yet</p>
        <p className="mt-1">Go to <a href="#import" className="text-glow-300 underline">Import</a> and pick <strong>past-requests-plus.csv</strong> from the <strong>old-site-backup</strong> folder. Spam is filtered out and repeat requests are merged.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-white/5 p-1" role="tablist" aria-label="Who">
        {GROUPS.map(([k, label, , t]) => (
          <button key={k} type="button" role="tab" aria-selected={group === k} onClick={() => { setGroup(k); setFilter('todo') }}
            className={`min-h-11 rounded-full px-2 text-sm font-semibold ${group === k ? 'bg-glow-400 text-night-950' : 'text-slate-300'}`}>
            {label} <span className="block text-xs font-normal opacity-70 sm:inline">{rows.filter(({ r }) => t(r)).length}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {GROUPS.find(([k]) => k === group)[2]} Anyone already in Customers is matched by email, phone or name.
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
      {emailing && <EmailQueue rows={emailable} season={season} onUpdate={onUpdate} targetOf={(x) => ({ pastRequestId: x.id })} templateId={group === 'winback' ? 'comeback' : 'winback'} onClose={() => setEmailing(false)} />}
    </>
  )
}
