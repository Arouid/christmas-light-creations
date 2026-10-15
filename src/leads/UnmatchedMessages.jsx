import { useMemo, useState } from 'react'
import { buildIndex, searchAccounts } from '../lib/accountSearch'
import { gmailUrl } from '../lib/messages'
import Icon from '../components/Icon'
import { TextButton, pill } from './Reach'
import { Bubble } from './TextHistory'
import { saveRecord, updateField, useLiveDoc, useLiveQuery } from './staffStore'
import { contactPatch, sameSender } from '../lib/linkSender'
import { logActivity } from './activity'
import { senderKey, withBlocked } from '../lib/blocklist'
import Handling from './Handling'
import SuggestReply from '../assistant/SuggestReply'
import { PLATFORMS } from '../../functions/listingNotices.js'

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

function Row({ m, user, customers, feed, blocked, siblings }) {
  const [linking, setLinking] = useState(false)
  const [busy, setBusy] = useState(false)
  const save = async (data) => {
    setBusy(true)
    try { await saveRecord(user, 'messages', m.id, data) } finally { setBusy(false) }
  }
  // Nextdoor and Yelp notices (docs/specs/listing-notices.md): a name, no number or address; answered on that site.
  const site = PLATFORMS[m.kind]
  const nd = Boolean(site)
  const who = m.phone ? prettyPhone(m.phone) : m.email || m.name || site?.someone || 'Unknown'
  // 🚫 Spam (owner 2026-10-13, docs/specs/spam-filters.md): dismiss and block the sender, so the
  // sync drops their next texts and emails before anyone sees them. Undo: ⚙ Settings → Blocked senders.
  async function spam() {
    const key = senderKey(m)
    setBusy(true)
    try {
      await saveRecord(user, 'messages', m.id, { dismissed: true, spam: true })
      if (key) await saveRecord(user, 'settings', 'app', { blockedSenders: withBlocked(blocked, key) })
      logActivity('spam', { type: 'message', id: m.id, name: who }, key)
    } finally { setBusy(false) }
  }
  // Link to customer (owner 2026-10-14, docs/specs/message-sync.md): this message, the sender's other open
  // messages, and the number or address onto the customer's record so the next one lands there by itself.
  async function link(customerId) {
    setBusy(true)
    try {
      const patch = { customerId, unmatched: false, dismissed: false }
      await saveRecord(user, 'messages', m.id, patch)
      for (const other of sameSender(siblings, m)) await saveRecord(user, 'messages', other.id, patch)
      const c = (customers ?? []).find((x) => x.id === customerId)
      for (const [field, value] of Object.entries(contactPatch(c, m))) await updateField(user, 'customers', customerId, field, value)
    } finally { setBusy(false) }
  }
  const digits = String(m.phone ?? '').replace(/\D/g, '')
  return (
    <li className="rounded-2xl bg-white/5 p-3">
      <p className="mb-2 break-all font-semibold">{who}</p>
      <Bubble m={m} who={nd ? `On ${site.label}` : m.phone ? 'Unknown number' : m.email ? 'New sender' : 'Unknown'} />
      <div className="mt-2 flex flex-wrap gap-2">
        {digits && <a className={pill} href={`tel:${digits}`}><Icon name="phone" className="size-4" /> Call</a>}
        {m.phone && <TextButton phone={m.phone} />}
        {m.email && <a className={pill} href={gmailUrl({ to: m.email, subject: m.subject && !/^re:/i.test(m.subject) ? `Re: ${m.subject}` : m.subject ?? '' })} target="_blank" rel="noreferrer">✉️ Reply in Gmail</a>}
        {nd && <a className={pill} href={site.url} target="_blank" rel="noopener noreferrer">{site.icon} Answer on {site.label} ↗</a>}
        {customers && !nd && <button type="button" disabled={busy} onClick={() => setLinking(!linking)} className={pill}>Link to customer</button>}
        <button type="button" disabled={busy} onClick={() => save({ dismissed: true })} className={pill}>{nd ? 'Done' : 'Dismiss'}</button>
        {!nd && <button type="button" disabled={busy} onClick={spam} className={pill} title="Dismiss and block this sender">🚫 Spam</button>}
      </div>
      <Handling m={m} who={who} feed={feed} user={user} />
      {!nd && <div className="mt-2"><SuggestReply target={{ messageId: m.id }} /></div>}
      {linking && <LinkPicker customers={customers} onCancel={() => setLinking(false)}
        onPick={link} />}
    </li>
  )
}

// Texts, voicemails and missed calls from numbers that match no customer or
// lead, and emails from new senders (junk filtered out by the sync; owner
// 2026-10-09). Staff link one to a customer or dismiss it.
export default function UnmatchedMessages({ user, customers, feed }) {
  const items = useLiveQuery(user, 'messages', 'unmatched', true, newestFirst)
  const { data: settings } = useLiveDoc(user, 'settings', 'app')
  const open = (items ?? []).filter((m) => !m.dismissed)
  if (!open.length) return null
  return (
    <details className="mb-4 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3" open={open.length <= 3}>
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-glow-300">
        📥 {open.length} {open.length === 1 ? 'message' : 'messages'} from people we don’t know yet
      </summary>
      <ul className="mt-2 space-y-3">
        {open.map((m) => <Row key={m.id} m={m} user={user} customers={customers} feed={feed} blocked={settings?.blockedSenders} siblings={open} />)}
      </ul>
    </details>
  )
}
