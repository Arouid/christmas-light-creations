import { useMemo, useState } from 'react'
import { buildIndex, searchAccounts } from '../lib/accountSearch'
import Icon from '../components/Icon'
import { TextButton, pill } from './Reach'
import { Bubble } from './TextHistory'
import { saveRecord, useLiveQuery } from './staffStore'

const newestFirst = (a, b) => (b.at ?? '').localeCompare(a.at ?? '')
const prettyPhone = (p) => {
  const d = String(p ?? '').replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p
}

// "Link to customer": search by name, street or phone, tap one.
function LinkPicker({ customers, onPick, onCancel }) {
  const [q, setQ] = useState('')
  const index = useMemo(() => buildIndex({ customers }), [customers])
  const hits = searchAccounts(index, q, 6)
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-night-950 p-2">
      <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer name, street or phone"
        className="block w-full rounded-xl border border-white/15 bg-night-900 px-3 py-2.5 text-base placeholder:text-slate-500" />
      <ul className="space-y-1">
        {hits.map((h) => (
          <li key={h.key}>
            <button type="button" onClick={() => onPick(h.id)} className="min-h-11 w-full rounded-xl bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10">
              <span className="font-medium">{h.name}</span> <span className="text-slate-400">{h.address}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onCancel} className="min-h-11 w-full rounded-xl text-sm text-slate-400">Cancel</button>
    </div>
  )
}

function Row({ m, user, customers }) {
  const [linking, setLinking] = useState(false)
  const [busy, setBusy] = useState(false)
  const save = async (data) => {
    setBusy(true)
    try { await saveRecord(user, 'messages', m.id, data) } finally { setBusy(false) }
  }
  const digits = String(m.phone ?? '').replace(/\D/g, '')
  return (
    <li className="rounded-2xl bg-white/5 p-3">
      <p className="mb-2 font-semibold">{m.phone ? prettyPhone(m.phone) : m.name || 'Unknown'}</p>
      <Bubble m={m} who={m.phone ? 'Unknown number' : 'Unknown'} />
      <div className="mt-2 flex flex-wrap gap-2">
        {digits && <a className={pill} href={`tel:${digits}`}><Icon name="phone" className="size-4" /> Call</a>}
        {m.phone && <TextButton phone={m.phone} />}
        {customers && <button type="button" disabled={busy} onClick={() => setLinking(!linking)} className={pill}>Link to customer</button>}
        <button type="button" disabled={busy} onClick={() => save({ dismissed: true })} className={pill}>Dismiss</button>
      </div>
      {linking && <LinkPicker customers={customers} onCancel={() => setLinking(false)}
        onPick={(customerId) => save({ customerId, unmatched: false, dismissed: false })} />}
    </li>
  )
}

// Texts, voicemails and missed calls from numbers that match no customer or
// lead (filed by the message sync). Staff link one to a customer or dismiss it.
export default function UnmatchedMessages({ user, customers }) {
  const items = useLiveQuery(user, 'messages', 'unmatched', true, newestFirst)
  const open = (items ?? []).filter((m) => !m.dismissed)
  if (!open.length) return null
  return (
    <details className="mb-4 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3" open={open.length <= 3}>
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-glow-300">
        📥 {open.length} {open.length === 1 ? 'message' : 'messages'} from unknown numbers
      </summary>
      <ul className="mt-2 space-y-3">
        {open.map((m) => <Row key={m.id} m={m} user={user} customers={customers} />)}
      </ul>
    </details>
  )
}
