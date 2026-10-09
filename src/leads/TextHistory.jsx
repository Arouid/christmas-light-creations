import { useState } from 'react'
import { useLiveQuery } from './staffStore'

const newestFirst = (a, b) => (b.at ?? '').localeCompare(a.at ?? '')
const SHOW = 30

const when = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const KIND = { call: '📞 Call', voicemail: '🎙 Voicemail', missed: '📵 Missed call', email: '✉️ Email', payment: '💲 Payment', invoice: '🧾 Invoice', request: '📝 Estimate request' }

// One history entry. Long emails start folded (tap to open).
export function Bubble({ m, who }) {
  const [open, setOpen] = useState(false)
  const out = m.direction === 'out'
  const long = (m.text ?? '').length > 280
  return (
    <div className={`max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm ${out ? 'bg-sky-500/20 text-sky-50' : 'bg-white/10'}`}>
      {m.kind && m.kind !== 'text' && <p className="text-xs font-semibold">{KIND[m.kind] ?? m.kind}{m.duration ? ` · ${m.duration}` : ''}</p>}
      {m.subject && <p className="break-words font-medium">{m.subject}</p>}
      {m.text && (
        <p className={`whitespace-pre-wrap break-words ${long && !open ? 'line-clamp-5' : ''}`}>{m.text}</p>
      )}
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="py-1 text-xs font-semibold text-glow-300">
          {open ? 'Show less' : 'Show all'}
        </button>
      )}
      <p className="mt-1 text-[11px] text-slate-400">{who ?? (out ? 'Us' : 'Customer')} · {when(m.at)}</p>
    </div>
  )
}

// Texts, calls, voicemails and emails with this customer (or lead): the old
// Voice import plus what the message sync files from info@. Read-only.
export default function TextHistory({ user, customerId, field = 'customerId', value = customerId }) {
  const items = useLiveQuery(user, 'messages', field, value, newestFirst)
  const [all, setAll] = useState(false)
  if (!items) return <p className="text-sm text-slate-400">Loading history…</p>
  if (!items.length) return <p className="text-sm text-slate-400">No texts, calls or emails on file.</p>

  const shown = all ? items : items.slice(0, SHOW)
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {shown.map((m) => (
          <li key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
            <Bubble m={m} />
          </li>
        ))}
      </ul>
      {!all && items.length > SHOW && (
        <button type="button" onClick={() => setAll(true)} className="w-full rounded-xl bg-white/5 py-2 text-sm">
          Show all {items.length}
        </button>
      )}
      <p className="text-xs text-slate-500">Incoming texts, voicemails and info@ emails arrive within a few minutes. Our own texts and answered calls only show after a Google Voice export is imported.</p>
    </div>
  )
}
