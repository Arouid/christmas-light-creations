import { useMemo, useState } from 'react'
import { buildIndex, searchAccounts } from '../../lib/accountSearch'
import { seasonYear, todayISO } from '../../lib/customers'
import { KIND_SHORT, STATE_LABEL, invoiceCents, invoiceState, listTotals, longDate, money, newInvoice, paidInfo, sendProblems } from '../../lib/invoices'
import DataTable from '../DataTable'
import { noAutofill, select } from '../ui'
import InvoiceEditor from './InvoiceEditor'
import { STATE_STYLE, numberLabel, useInvoicesContext } from './useInvoices'

const FILTERS = [['open', 'Open'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['draft', 'Drafts'], ['void', 'Cancelled'], ['all', 'All']]
const matches = (s, f) => f === 'all' || s === f || (f === 'open' && s === 'overdue')
const when = (i, s) => (s === 'paid' ? `paid ${longDate(paidInfo(i)?.date)}` : s === 'draft' ? 'not sent' : s === 'void' ? 'cancelled' : `due ${longDate(i.dueDate)}`)

// "＋ New invoice": search a customer (same search as Accounts), tap to start.
function PickCustomer({ customers, onPick, onClose }) {
  const [q, setQ] = useState('')
  const index = useMemo(() => buildIndex({ customers }), [customers])
  const results = useMemo(() => searchAccounts(index, q, 12), [index, q])
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/95 p-3 backdrop-blur sm:p-6" role="dialog" aria-modal="true" aria-label="New invoice: pick a customer">
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">New invoice for…</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">Close</button>
        </div>
        <input type="search" autoFocus {...noAutofill} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers" aria-label="Search customers"
          className="block min-h-11 w-full rounded-full border border-white/20 bg-night-950 px-4 text-base" />
        {q.trim() ? (
          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
            {results.map((e) => (
              <li key={e.key}>
                <button type="button" onClick={() => onPick(customers.find((c) => c.id === e.id))} className="block min-h-11 w-full px-4 py-2.5 text-left hover:bg-white/5">
                  <span className="block truncate font-medium">{e.name || e.email || e.phone}</span>
                  <span className="block truncate text-sm text-slate-400">{[e.address, e.phone].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
            {!results.length && <li className="px-4 py-4 text-sm text-slate-400">No customer matches “{q}”. A website lead must be made a customer first (Accounts → ＋ Make customer).</li>}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Type their name, street, phone or email. Billing a whole season? <a href="#season" onClick={onClose} className="text-glow-300 underline">Season → 🧾 Invoice these N</a>.</p>
        )}
      </div>
    </div>
  )
}

// Invoices tab: what's owed (open, overdue), what came in, drafts to send.
export default function InvoicesView({ customers = [] }) {
  const ctx = useInvoicesContext()
  const [filter, setFilter] = useState('open')
  const [season, setSeason] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(null)
  const today = todayISO()
  const all = useMemo(() => (ctx?.invoices ?? []).map((i) => ({ ...i, state: invoiceState(i, today) })), [ctx?.invoices, today])
  const index = useMemo(() => buildIndex({ customers }), [customers])
  if (!ctx) return null
  if (ctx.error) return <p className="mt-6 text-slate-400">Invoices aren’t available yet: the database rules need publishing (firestore.rules). Everything else works.</p>
  if (!ctx.invoices) return <p className="mt-6 text-slate-400">Loading invoices…</p>

  const seasons = [...new Set(all.map((i) => i.season).filter(Boolean))].sort().reverse()
  const term = q.trim().toLowerCase()
  const inSeason = all.filter((i) => (!season || i.season === season) && (!term || `${i.number} ${i.customer?.name} ${i.customer?.address} ${i.customer?.email} ${i.customer?.phone}`.toLowerCase().includes(term)))
  const totals = listTotals(inSeason, today)
  // While searching, every matching invoice shows (any status), then matching customers to start one.
  const shown = term ? inSeason : inSeason.filter((i) => matches(i.state, filter))
  const people = term ? searchAccounts(index, q, 6) : []
  const startFor = (c) => setOpen({ id: null, invoice: newInvoice(c, { season: seasonYear() }) })
  const drafts = inSeason.filter((i) => i.state === 'draft')
  const ready = drafts.filter((i) => !sendProblems(i).length)

  async function sendAll() {
    if (!window.confirm(`Send ${ready.length} invoice${ready.length === 1 ? '' : 's'} (${money(ready.reduce((t, i) => t + invoiceCents(i), 0))})? Each customer with an email gets theirs from info@.`)) return
    for (const [n, i] of ready.entries()) {
      setBusy(`Sending ${n + 1} of ${ready.length}…`)
      try { await ctx.send(i.id, i) } catch (e) { setBusy(`Stopped at ${i.customer?.name}: ${e.message}`); return }
    }
    setBusy(`Sent ${ready.length} ✓`)
  }

  const columns = [
    { key: 'number', label: 'Invoice', get: numberLabel },
    { key: 'name', label: 'Customer', get: (i) => i.customer?.name ?? '' },
    { key: 'for', label: 'For', get: (i) => `${KIND_SHORT[i.kind] ?? ''} ${i.season ?? ''}` },
    { key: 'amount', label: 'Amount', get: (i) => String(invoiceCents(i)).padStart(10, '0'), render: (i) => <span className="tabular-nums">{money(invoiceCents(i))}</span>, className: 'text-right' },
    { key: 'when', label: 'Due / paid', get: (i) => (i.state === 'paid' ? paidInfo(i)?.date : i.dueDate) ?? '', render: (i) => when(i, i.state) },
    { key: 'state', label: 'Status', get: (i) => STATE_LABEL[i.state], render: (i) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[i.state]}`}>{STATE_LABEL[i.state]}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <h1 className="font-display text-3xl font-extrabold">Invoices</h1>
          <button type="button" onClick={() => setPicking(true)} className="min-h-11 shrink-0 rounded-full bg-glow-400 px-5 font-semibold text-night-950 hover:bg-glow-300">＋ New invoice</button>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input type="search" {...noAutofill} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an invoice or customer" aria-label="Find an invoice or customer"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-night-900 px-3 text-base sm:w-72" />
          <select value={season} onChange={(e) => setSeason(e.target.value)} aria-label="Season" className={`${select} min-h-11 shrink-0`}>
            <option value="">All seasons</option>
            {seasons.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['open', 'Open (unpaid)'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['draft', 'Drafts']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setFilter(k); setQ('') }} aria-pressed={!term && filter === k}
            className={`rounded-2xl border p-3 text-left ${!term && filter === k ? 'border-glow-400 bg-glow-400/10' : 'border-white/10 bg-night-900'}`}>
            <span className="block text-sm text-slate-400">{label} · {totals[k].n}</span>
            <span className={`block text-xl font-bold tabular-nums ${k === 'overdue' && totals[k].n ? 'text-berry-500' : ''}`}>{money(totals[k].cents)}</span>
          </button>
        ))}
      </div>

      {term ? (
        <p className="text-sm text-slate-400">Invoices matching “{q.trim()}” (any status) · <button type="button" onClick={() => setQ('')} className="min-h-11 text-glow-300 underline">Clear search</button></p>
      ) : (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" aria-label="Show">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${filter === k ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>{label}</button>
          ))}
        </div>
      )}

      {!term && filter === 'draft' && drafts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3">
          <button type="button" onClick={sendAll} disabled={!ready.length || !!busy} className="min-h-11 rounded-full bg-glow-400 px-5 font-semibold text-night-950 disabled:opacity-40">
            Send all {ready.length} draft{ready.length === 1 ? '' : 's'}
          </button>
          <span className="text-sm text-slate-400">{busy ?? (drafts.length > ready.length ? `${drafts.length - ready.length} need a fix first (open them).` : 'Check the amounts first.')}</span>
        </div>
      )}

      {shown.length ? (
        <>
          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-night-900 lg:hidden">
            {shown.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setOpen(i)} className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.customer?.name}</span>
                    <span className="block truncate text-sm text-slate-400">{numberLabel(i)} · {KIND_SHORT[i.kind] ?? ''} {i.season} · {when(i, i.state)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block tabular-nums">{money(invoiceCents(i))}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[i.state]}`}>{STATE_LABEL[i.state]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden lg:block">
            <DataTable rows={shown} columns={columns} onRowClick={(id) => setOpen(shown.find((i) => i.id === id))} label="Invoices" />
          </div>
        </>
      ) : (
        <p className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400">
          {term ? `No invoices for “${q.trim()}” yet.` : all.length ? 'Nothing here.' : 'No invoices yet. Tap ＋ New invoice and pick the customer, or Season → 🧾 Invoice these N for a whole season.'}
        </p>
      )}

      {term && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Customers</h2>
          {people.length ? (
            <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-night-900">
              {people.map((e) => (
                <li key={e.key} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.name || e.email || e.phone}</span>
                    <span className="block truncate text-sm text-slate-400">{[e.address, e.phone].filter(Boolean).join(' · ')}</span>
                  </span>
                  <button type="button" onClick={() => startFor(customers.find((c) => c.id === e.id))}
                    className="min-h-11 shrink-0 rounded-full bg-glow-400 px-4 text-sm font-semibold text-night-950 hover:bg-glow-300">＋ New invoice</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">No customer matches “{q.trim()}”. A website lead must be made a customer first (Accounts → ＋ Make customer).</p>}
        </section>
      )}

      {picking && <PickCustomer customers={customers} onClose={() => setPicking(false)}
        onPick={(c) => { setPicking(false); startFor(c) }} />}
      {open && <InvoiceEditor token={open.id} invoice={open.invoice ?? open} onClose={() => setOpen(null)} />}
    </div>
  )
}
