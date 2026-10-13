import { useState } from 'react'
import { TEXT_MAX } from '../../functions/chat.js'
import { toMs } from '../lib/staffAlerts'
import { agoText } from '../lib/activity'
import { sendReply } from './chat'
import { useLiveDoc } from './staffStore'

// 💬 Chat with the customer (docs/specs/account-chat.md): the thread they
// write to from their account page, live from conversations/{customerId},
// and a reply box. A reply is saved by the server, emailed to the customer
// and logged in Recent activity. Shown on the Accounts page and under Edit details.
const SHOW = 8
const when = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function ChatPanel({ user, customer }) {
  const { data, error } = useLiveDoc(user, 'conversations', customer.id)
  const [text, setText] = useState('')
  const [all, setAll] = useState(false)
  const [state, setState] = useState(null) // null | 'sending' | { note } | { error }
  const messages = data?.messages ?? []
  const shown = all ? messages : messages.slice(-SHOW)

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) { setState({ error: 'Write the reply first.' }); return }
    setState('sending')
    try {
      const r = await sendReply(user, customer, body)
      setText('')
      setState({ note: r.note || 'Sent.' })
    } catch (err) {
      setState({ error: err.message })
    }
  }

  if (error === 'not-staff') {
    return <p className="text-sm text-glow-300">The chat needs the database rules republished (Scott) before this box can load. Customers can still write; their messages wait here.</p>
  }
  if (error) return <p className="text-sm text-berry-500">Couldn’t load the chat: {error}</p>
  if (data === undefined) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-3">
      {data?.waitingSince && (
        <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm font-semibold text-glow-300" role="status">
          Waiting for a reply since {agoText(toMs(data.waitingSince))}
        </p>
      )}
      {!messages.length && <p className="text-sm text-slate-400">No messages yet. What you write here shows in their account and goes to them by email.</p>}
      {!all && messages.length > SHOW && (
        <button type="button" onClick={() => setAll(true)} className="w-full rounded-xl bg-white/5 py-2 text-sm">Show all {messages.length}{data?.count > messages.length ? ` (${data.count - messages.length} older ones dropped)` : ''}</button>
      )}
      {messages.length > 0 && (
        <ul className="space-y-2" aria-label="Chat messages">
          {shown.map((m, i) => {
            const ours = m.from === 'staff'
            return (
              <li key={`${m.at}-${i}`} className={`flex ${ours ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm ${ours ? 'bg-sky-500/20 text-sky-50' : 'bg-white/10'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{ours ? `Us · ${String(m.by ?? '').split('@')[0]}` : 'Customer'} · {when(m.at)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={send} className="space-y-2">
        <label className="block">
          <span className="sr-only">Reply</span>
          <textarea value={text} onChange={(e) => { setText(e.target.value.slice(0, TEXT_MAX)); if (state !== 'sending') setState(null) }} rows={3} maxLength={TEXT_MAX} placeholder="Reply here: they see it in their account and get an email"
            className="w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500" />
        </label>
        {state?.error && <p className="text-sm text-berry-500" role="alert">{state.error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-11 items-center justify-center rounded-full bg-glow-400 px-4 text-sm font-semibold text-night-950 disabled:opacity-60">
            {state === 'sending' ? 'Sending…' : 'Send reply'}
          </button>
          {state?.note && <span className="text-sm text-emerald-300">{state.note}</span>}
        </div>
      </form>
    </div>
  )
}
