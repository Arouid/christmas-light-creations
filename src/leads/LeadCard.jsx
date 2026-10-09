import { useState } from 'react'
import { LEAD_STATUSES, STATUS_LABELS } from '../lib/firebase'
import { leadToCustomer, seasonYear } from '../lib/customers'
import Icon from '../components/Icon'
import ComposeEmail from './ComposeEmail'
import StreetViewPhoto from './StreetViewPhoto'
import DesignsPanel from './designs/DesignsPanel'
import ProposalsPanel from './proposals/ProposalsPanel'
import { TextButton } from './Reach'
import { textMessages } from '../lib/messages'

const statusColor = {
  new: 'bg-glow-400 text-night-950',
  called: 'bg-sky-500/20 text-sky-300',
  'estimate-sent': 'bg-violet-500/20 text-violet-300',
  booked: 'bg-pine-500/25 text-emerald-300',
  lost: 'bg-white/10 text-slate-400',
  spam: 'bg-berry-600/30 text-berry-500',
}

const when = (d) =>
  d ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now'

const action = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15'

function CustomerLink({ lead, onMakeCustomer, onOpenCustomer }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  if (lead.customerId) {
    return (
      <button type="button" onClick={() => onOpenCustomer(lead.customerId)}
        className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-sm font-semibold text-emerald-300">
        Customer record ✓ Open it
      </button>
    )
  }
  async function make() {
    setBusy(true)
    setError(null)
    try {
      onOpenCustomer(await onMakeCustomer(lead))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <div>
      <button type="button" onClick={make} disabled={busy}
        className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold disabled:opacity-50">
        {busy ? 'Creating…' : 'Make this a customer'}
      </button>
      {error && <p className="mt-1 text-sm text-berry-500" role="alert">{error}</p>}
    </div>
  )
}

export default function LeadCard({ lead, onUpdate, onDelete, onMakeCustomer, onOpenCustomer }) {
  const [open, setOpen] = useState(lead.status === 'new')
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const fullAddress = [lead.address, lead.city, 'TX', lead.zip].filter(Boolean).join(', ')
  const phoneDigits = lead.phone?.replace(/[^\d+]/g, '')

  async function save(changes, action) {
    setSaving(true)
    setSaveError(false)
    try {
      await (action ? action() : onUpdate(lead.id, changes))
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-night-900">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="truncate font-semibold">{lead.firstName} {lead.lastName}</p>
          <p className="mt-0.5 truncate text-sm text-slate-400">{lead.city || 'No city'} · {when(lead.createdAt)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor[lead.status]}`}>
          {STATUS_LABELS[lead.status]}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          <StreetViewPhoto address={fullAddress} />
          <DesignsPanel owner={{ type: 'lead', id: lead.id, name: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim(), address: fullAddress }} />
          <ProposalsPanel owner={{ type: 'lead', id: lead.id, name: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim(), address: fullAddress, email: lead.email, phone: lead.phone }} />
          <p className="text-sm text-slate-400">
            Prefers: <span className="font-medium text-slate-200">{lead.contactMethod}</span>
            {lead.source && <> · Heard from: <span className="font-medium text-slate-200">{lead.source}</span></>}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {phoneDigits && <a className={action} href={`tel:${phoneDigits}`}><Icon name="phone" className="size-4" /> Call</a>}
            <TextButton phone={lead.phone} className={action} />
            <ComposeEmail person={leadToCustomer(lead, seasonYear())} season={seasonYear()} start="estimate-thanks" className={action} />
            <a className={action} target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}>Map</a>
          </div>
          {onMakeCustomer && <CustomerLink lead={lead} onMakeCustomer={onMakeCustomer} onOpenCustomer={onOpenCustomer} />}
          {lead.status === 'booked' && (
            <div className="rounded-xl border border-glow-400/30 bg-glow-400/5 p-3">
              <p className="text-sm text-slate-300">Booked! Ask for a Google review:</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:flex">
                <TextButton phone={lead.phone} className={action} label="Text review link" message={textMessages.review(lead)} />
                <ComposeEmail person={leadToCustomer(lead, seasonYear())} season={seasonYear()} start="review" label="Email review link" className={action} />
              </div>
            </div>
          )}
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-slate-400">Address: </dt><dd className="inline">{fullAddress}</dd></div>
            <div><dt className="inline text-slate-400">Email: </dt><dd className="inline break-all">{lead.email}</dd></div>
            {lead.phone && <div><dt className="inline text-slate-400">Phone: </dt><dd className="inline">{lead.phone}</dd></div>}
          </dl>
          <blockquote className="whitespace-pre-wrap rounded-xl bg-night-950 p-3 text-slate-200">{lead.message}</blockquote>

          <label className="block text-sm font-medium text-slate-300">Status
            <select value={lead.status} disabled={saving} onChange={(e) => save({ status: e.target.value, notes })}
              className="mt-1.5 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-3 text-base">
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-300">Notes
            <textarea value={notes} rows={3} maxLength={5000} onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-3 text-base"
              placeholder="Called, left voicemail…" />
          </label>
          <div className="flex items-center gap-3">
            <button type="button" disabled={saving || notes === (lead.notes ?? '')}
              onClick={() => save({ status: lead.status, notes })}
              className="rounded-full bg-glow-400 px-5 py-2.5 text-sm font-semibold text-night-950 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save notes'}
            </button>
            {lead.updatedBy && <p className="text-xs text-slate-500">Last changed by {lead.updatedBy}</p>}
            {saveError && <p className="text-sm text-berry-500" role="alert">Couldn’t save. Try again.</p>}
          </div>
          {lead.status === 'spam' && onDelete && (
            <button type="button" disabled={saving}
              onClick={() => window.confirm(`Delete this request from ${lead.firstName || 'this person'} for good? This can’t be undone.`) && save(null, () => onDelete(lead.id))}
              className="min-h-11 rounded-full border border-berry-500/50 px-5 py-2.5 text-sm font-semibold text-berry-500">
              Delete for good
            </button>
          )}
        </div>
      )}
    </li>
  )
}
