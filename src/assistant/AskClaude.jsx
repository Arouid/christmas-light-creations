import { useEffect, useRef, useState } from 'react'
import SuggestReply from './SuggestReply'
import { EXAMPLES, ask } from './askApi'
import { answerBlocks, historyFor, recordLabel, recordLink } from './lib/records'

// 🤖 Ask Claude (docs/specs/ask-claude.md): a chat panel where staff ask a
// plain question about customers, leads, invoices, routes, messages or
// whether the app is working. The server answers with read-only tools; the
// records it used are listed as links. Nothing can be changed or sent from
// here; a "Draft a reply" hand-off goes through the normal Suggest a reply flow.
// Layout like a messaging app (owner, 2026-10-10): header pinned at the top,
// the transcript scrolling in the middle, the question box pinned at the
// bottom. Full screen on phones; a chat window on a computer.
const box = 'block w-full rounded-2xl border border-white/15 bg-night-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-glow-400 focus:outline-none'
const pill = 'inline-flex min-h-11 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-slate-100'
const isPhone = () => window.matchMedia?.('(pointer: coarse)').matches

function Answer({ turn, season, onGo }) {
  const blocks = answerBlocks(turn.answer)
  return (
    <div className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 sm:max-w-[85%]">
      <div className="space-y-2 text-base leading-relaxed text-slate-100">
        {blocks.map((b, i) => (b.type === 'list'
          ? <ul key={i} className="list-disc space-y-1 pl-5 marker:text-glow-400">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          : <p key={i} className="break-words">{b.text}</p>))}
      </div>
      {turn.incomplete && <p className="text-sm text-glow-300">⚠ Claude hit its lookup limit for one question; the answer may be incomplete.</p>}
      {turn.records?.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {turn.records.map((r) => (
            <li key={`${r.type}:${r.id}`}>
              <a href={recordLink(r)} onClick={(e) => { e.preventDefault(); onGo(recordLink(r)) }} className={`${pill} bg-white/15`}>{recordLabel(r)} →</a>
            </li>
          ))}
        </ul>
      )}
      {turn.draftFor && <SuggestReply target={turn.draftFor} season={season} label="Draft a reply to them" className={`${pill} bg-glow-400/20 text-glow-300`} />}
    </div>
  )
}

export default function AskClaude({ season, onClose }) {
  const [turns, setTurns] = useState([]) // { role: 'user', text } | { role: 'assistant', answer, records, draftFor, incomplete } | { role: 'error', text }
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { if (!isPhone()) inputRef.current?.focus() }, [])
  // Newest message in view when an answer arrives or while thinking.
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
  // Enter sends on a computer; on a phone Enter is a newline and the button sends.
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey && !isPhone()) { e.preventDefault(); send() } }

  return (
    <div className="fixed inset-0 z-40 bg-night-950/95 backdrop-blur sm:flex sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Ask Claude">
      <div className="flex h-full w-full flex-col bg-night-950 sm:h-[min(88svh,52rem)] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-white/15 sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="font-display text-2xl font-extrabold">🤖 Ask Claude</h2>
          <div className="flex gap-2">
            {turns.length > 0 && <button type="button" onClick={() => setTurns([])} className={pill}>Clear</button>}
            <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">Done</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="flex flex-col gap-3">
            {turns.length === 0 && (
              <div className="space-y-3 text-slate-300">
                <p className="max-w-[92%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-base sm:max-w-[85%]">Hi! Ask me anything about customers, website requests, invoices, routes, message history, or whether the app is working. I look it up in the database and answer; I can’t change or send anything.</p>
                <ul className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => <li key={ex}><button type="button" onClick={() => send(ex)} className={pill}>{ex}</button></li>)}
                </ul>
              </div>
            )}
            {turns.map((t, i) => (
              t.role === 'user'
                ? <p key={i} className="max-w-[85%] self-end break-words rounded-2xl rounded-br-md bg-sky-500/20 px-4 py-3 text-base text-sky-50">{t.text}</p>
                : t.role === 'error'
                  ? <p key={i} className="max-w-[92%] rounded-2xl bg-berry-600/15 px-4 py-3 text-sm text-berry-500" role="alert">{t.text}</p>
                  : <Answer key={i} turn={t} season={season} onGo={go} />
            ))}
            {busy && <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-slate-400" role="status" aria-live="polite">Thinking…</p>}
            <div ref={endRef} />
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send() }} className="shrink-0 space-y-1.5 border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <textarea ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} maxLength={1000} rows={1} placeholder="Ask a question…" aria-label="Your question"
              autoComplete="off" className={`${box} max-h-32 min-h-12 flex-1 resize-none`} />
            <button type="submit" disabled={busy || !q.trim()} className="min-h-12 shrink-0 rounded-full bg-glow-400 px-5 text-sm font-semibold text-night-950 disabled:opacity-50">Send</button>
          </div>
          <p className="text-xs text-slate-500">Read-only, can be wrong: check a record before acting on it. A few cents a question.</p>
        </form>
      </div>
    </div>
  )
}
