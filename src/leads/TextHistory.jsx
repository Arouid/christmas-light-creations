import { useState } from 'react'
import { useLiveQuery } from './staffStore'

const newestFirst = (a, b) => (b.at ?? '').localeCompare(a.at ?? '')
const SHOW = 30

const when = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const KIND = { call: '📞 Call', voicemail: '🎙 Voicemail', missed: '📵 Missed call' }

// Past texts, calls and voicemails with this customer, imported from the old
// Google Voice account. Read-only history.
export default function TextHistory({ user, customerId }) {
  const items = useLiveQuery(user, 'messages', 'customerId', customerId, newestFirst)
  const [all, setAll] = useState(false)
  if (!items) return <p className="text-sm text-slate-400">Loading history…</p>
  if (!items.length) return <p className="text-sm text-slate-400">No past texts or calls on file.</p>

  const shown = all ? items : items.slice(0, SHOW)
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {shown.map((m) => {
          const out = m.direction === 'out'
          return (
            <li key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${out ? 'bg-sky-500/20 text-sky-50' : 'bg-white/10'}`}>
                {m.kind && m.kind !== 'text' && <p className="text-xs font-semibold">{KIND[m.kind] ?? m.kind}{m.duration ? ` · ${m.duration}` : ''}</p>}
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                <p className="mt-1 text-[11px] text-slate-400">{out ? 'Us' : 'Customer'} · {when(m.at)}</p>
              </div>
            </li>
          )
        })}
      </ul>
      {!all && items.length > SHOW && (
        <button type="button" onClick={() => setAll(true)} className="w-full rounded-xl bg-white/5 py-2 text-sm">
          Show all {items.length}
        </button>
      )}
      <p className="text-xs text-slate-500">From the business number’s old Google Voice account (before Oct 2026).</p>
    </div>
  )
}
