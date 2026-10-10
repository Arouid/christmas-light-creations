import { useState } from 'react'
import { updateField, useLiveQuery } from './staffStore'

// Red banner when the website reported a problem (functions/health.js):
// failed alert emails, payment trouble, sync stopped. Shows even when email
// is down. Anyone on staff can mark a problem seen once it's dealt with.
const LABEL = {
  'lead-alert': 'New-request alert email didn’t go out',
  payment: 'Customer payment problem',
  paypal: 'PayPal didn’t answer',
  email: 'Email to a customer didn’t go out',
  sync: 'Texts/emails stopped syncing',
  push: 'Phone notifications didn’t go out',
  other: 'Something went wrong',
}
const newestFirst = (a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0)
const when = (t) => (t?.toDate ? t.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

export default function IncidentsBanner({ user }) {
  const list = useLiveQuery(user, 'incidents', 'open', true, newestFirst) ?? []
  const [open, setOpen] = useState(false)
  if (!list.length) return null
  return (
    <div className="bg-berry-600/90 px-4 py-2 text-sm">
      <button type="button" onClick={() => setOpen(!open)} className="mx-auto flex min-h-11 w-full max-w-3xl items-center justify-between gap-3 text-left font-semibold lg:max-w-7xl">
        <span>⚠ {list.length} website problem{list.length === 1 ? '' : 's'} to look at</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="mx-auto max-w-3xl space-y-2 pb-2 lg:max-w-7xl">
          {list.map((x) => (
            <li key={x.id} className="rounded-xl bg-night-950/60 p-3">
              <p className="font-semibold">{LABEL[x.kind] ?? LABEL.other} <span className="font-normal text-slate-300">· {when(x.at)}</span></p>
              <p className="text-slate-200">{x.message}</p>
              <button type="button" onClick={() => updateField(user, 'incidents', x.id, 'open', false)} className="mt-2 min-h-11 rounded-full bg-white/15 px-4 font-semibold">Dealt with ✓</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
