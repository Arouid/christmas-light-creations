import { useState } from 'react'
import { SERVICE_ISSUES, SERVICE_STATUSES, gateFor, todayISO } from '../lib/customers'
import Icon from '../components/Icon'
import Field from './Field'
import { TextButton } from './Reach'
import { textMessages } from '../lib/messages'

const control = 'block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base'
const action = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium'

const niceDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function LogCallForm({ customers, customer, onLog, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const who = customer ?? customers.find((c) => c.id === f.get('customerId'))
    if (!who) return setError('Pick a customer.')
    setBusy(true)
    try {
      await onLog(who, f.get('issue'), String(f.get('details')).trim())
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-glow-400/30 bg-night-900 p-4">
      {!customer && (
        <select name="customerId" required defaultValue="" className={control} aria-label="Customer">
          <option value="" disabled>Pick the customer…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}{c.city ? ` (${c.city})` : ''}</option>)}
        </select>
      )}
      <select name="issue" className={control} aria-label="Problem">
        {SERVICE_ISSUES.map((i) => <option key={i}>{i}</option>)}
      </select>
      <input name="details" placeholder="Details (which side, what they said…)" className={control} />
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="flex-1 rounded-full border border-white/20 py-2.5 font-semibold">Cancel</button>
        <button disabled={busy} className="flex-1 rounded-full bg-glow-400 py-2.5 font-semibold text-night-950 disabled:opacity-50">Log call</button>
      </div>
      {error && <p className="text-sm text-berry-500" role="alert">{error}</p>}
    </form>
  )
}

export function ServiceCallCard({ call, customer, gates, onUpdate, onOpen }) {
  const phone = customer?.phone?.replace(/[^\d+]/g, '')
  const gate = customer && gateFor(customer, gates)

  async function setStatus(status) {
    await onUpdate(call.id, 'status', status)
    if (status === 'Done' && !call.completed) await onUpdate(call.id, 'completed', todayISO())
  }

  return (
    <li className="space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {onOpen ? (
            <button type="button" onClick={() => onOpen(call.customerId)} className="block truncate text-left font-semibold underline-offset-4 hover:underline">
              {call.customerName}
            </button>
          ) : <p className="font-semibold">{call.issue}</p>}
          <p className="text-sm text-slate-400">
            {onOpen && <>{call.issue} · </>}received {niceDate(call.received)}{call.completed && ` · done ${niceDate(call.completed)}`}
          </p>
        </div>
        <select value={call.status} onChange={(e) => setStatus(e.target.value)} aria-label="Service call status"
          className={`shrink-0 rounded-full border-0 px-3 py-1.5 text-sm font-semibold ${call.status === 'Open' ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
          {SERVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {call.details && <p className="text-slate-200">{call.details}</p>}
      {onOpen && customer && (
        <>
          <p className="text-sm text-slate-400">{customer.address}{gate && <> · <span className="text-glow-300">gate {gate.code}</span></>}</p>
          <div className="flex flex-wrap gap-2">
            {phone && <a className={action} href={`tel:${phone}`}><Icon name="phone" className="size-4" /> Call</a>}
            <TextButton phone={customer.phone} className={action}
              {...(call.status === 'Done' ? { label: 'Text: fixed + review', message: textMessages.repaired(customer) } : {})} />
            {customer.address && (
              <a className={action} target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}>Map</a>
            )}
          </div>
        </>
      )}
      <Field label="Notes" value={call.notes} rows={2} onSave={(v) => onUpdate(call.id, 'notes', v)} />
    </li>
  )
}

export default function ServiceView({ calls, customers, gates, onLog, onUpdate, onOpen }) {
  const [filter, setFilter] = useState('active')
  const [logging, setLogging] = useState(false)
  const byId = new Map(customers.map((c) => [c.id, c]))
  const active = (c) => c.status === 'Open' || c.status === 'Scheduled'
  const shown = calls.filter((c) => (filter === 'all' ? true : filter === 'active' ? active(c) : c.status === filter))
  const chips = [['active', 'To do', calls.filter(active).length], ['Done', 'Done', calls.filter((c) => c.status === 'Done').length], ['all', 'All', calls.length]]

  return (
    <>
      {logging
        ? <LogCallForm customers={customers} onLog={onLog} onDone={() => setLogging(false)} />
        : <button type="button" onClick={() => setLogging(true)} className="w-full rounded-xl lg:w-auto lg:px-6 bg-glow-400 py-3 font-semibold text-night-950">+ Log a service call</button>}
      <div className="mt-3 flex gap-2">
        {chips.map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium ${filter === k ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
            {label} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-3">
        {shown.map((c) => (
          <ServiceCallCard key={c.id} call={c} customer={byId.get(c.customerId)} gates={gates} onUpdate={onUpdate} onOpen={onOpen} />
        ))}
        {shown.length === 0 && <li className="py-6 text-center text-slate-400">{filter === 'active' ? 'No open service calls 🎉' : 'Nothing here.'}</li>}
      </ul>
    </>
  )
}
