import { useEffect, useRef, useState } from 'react'
import SuggestReply from './SuggestReply'
import { EXAMPLES, ask } from './askApi'
import { answerBlocks, historyFor, recordLabel, recordLink } from './lib/records'

// 🤖 Ask Claude (docs/specs/ask-claude.md): a panel where staff ask a plain
// question about customers, leads, invoices, routes, messages or whether the
// app is working. The server answers with read-only tools; the records it
// used are listed as links. Nothing can be changed or sent from here; a
// "Draft a reply" hand-off goes through the normal Suggest a reply flow.
const box = 'block w-full rounded-2xl border border-white/15 bg-night-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-glow-400 focus:outline-none'
const pill = 'inline-flex min-h-11 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-slate-100'

function Answer({ turn, season, onGo }) {
  const blocks = answerBlocks(turn.answer)
  return (
    <div className="space-y-3 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-4">
      <div className="space-y-2 text-base leading-relaxed text-slate-100">
        {blocks.map((b, i) => (b.type === 'list'
          ? <ul key={i} className="list-disc space-y-1 pl-5 marker:text-glow-400">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          : <p key={i}>{b.text}</p>))}
      </div>
      {turn.incomplete && <p className="text-sm text-glow-300">⚠ Claude hit its lookup limit for one question; the answer may be incomplete.</p>}
      {turn.records?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Looked at</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {turn.records.map((r) => (
              <li key={`${r.type}:${r.id}`}>
                <a href={recordLink(r)} onClick={(e) => { e.preventDefault(); onGo(recordLink(r)) }} className={pill}>{recordLabel(r)} →</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {turn.draftFor && <SuggestReply target={turn.draftFor} season={season} label="Draft a reply to them" />}
    </div>
  )
}

export default function AskClaude({ season, onClose }) {
  const [turns, setTurns] = useState([]) // { role: 'user', text } | { role: 'assistant', answer, records, draftFor, incomplete } | { role: 'error', text }
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [turns, busy])

  async function send(text) {
    const question = (text ?? q).trim()
    if (!question || busy) return
    setQ('')
    const next = [...turns.filter((t) => t.role !== 'error'), { role: 'user', text: question }]
    setTurns(next)
    setBusy(true)
    try {
      const a = await ask(question, historyFor(turns))
      setTurns([...next, { role: 'assistant', ...a }])
    } catch (err) {
      setTurns([...next, { role: 'error', text: err.message }])
    } finally {
      setBusy(false)
    }
  }
  const go = (hash) => { onClose(); window.location.assign(hash) }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Ask Claude">
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col p-4 pb-4">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-night-950/95 px-4 pb-3 pt-1">
          <h2 className="font-display text-2xl font-extrabold">🤖 Ask Claude</h2>
          <div className="flex gap-2">
            {turns.length > 0 && <button type="button" onClick={() => setTurns([])} className={pill}>Clear</button>}
            <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">Done</button>
          </div>
        </div>

        <div className="flex-1 space-y-3 py-2">
          {turns.length === 0 && (
            <div className="space-y-3 text-slate-300">
              <p>Ask anything about customers, website requests, invoices, routes, message history, or whether the app is working. Claude looks it up in the database and answers; it can’t change or send anything.</p>
              <ul className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => <li key={ex}><button type="button" onClick={() => send(ex)} className={pill}>{ex}</button></li>)}
              </ul>
            </div>
          )}
          {turns.map((t, i) => (
            t.role === 'user'
              ? <p key={i} className="ml-8 rounded-2xl bg-white/10 px-4 py-3 text-base text-slate-100">{t.text}</p>
              : t.role === 'error'
                ? <p key={i} className="rounded-2xl bg-berry-600/15 px-4 py-3 text-sm text-berry-500" role="alert">{t.text}</p>
                : <Answer key={i} turn={t} season={season} onGo={go} />
          ))}
          {busy && <p className="text-sm text-slate-400" role="status" aria-live="polite">Looking it up…</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send() }} className="sticky bottom-0 -mx-4 space-y-2 bg-night-950/95 px-4 pb-2 pt-3">
          <div className="flex gap-2">
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} maxLength={1000} placeholder="Ask a question…" aria-label="Your question"
              autoComplete="off" className={`${box} min-h-12 flex-1`} />
            <button type="submit" disabled={busy || !q.trim()} className="min-h-12 shrink-0 rounded-full bg-glow-400 px-5 text-sm font-semibold text-night-950 disabled:opacity-50">Ask</button>
          </div>
          <p className="text-xs text-slate-500">Read-only: Claude answers from the database and can be wrong. Check a record before acting on it. A few cents a question.</p>
        </form>
      </div>
    </div>
  )
}
