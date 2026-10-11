import { useState } from 'react'
import ComposeEmail from '../leads/ComposeEmail'
import { TextButton, pill } from '../leads/Reach'
import { logActivity } from '../leads/activity'
import { requestDraft } from './draftReply'
import { activityTarget, emailTarget } from './lib/targets'

// ✨ Suggest a reply (docs/specs/sales-assistant.md): asks the server's
// assistant for a draft to this person's thread, shows what they're asking
// and the suggested next step, then hands the (edited) text to the normal
// Email or Text flow. Staff press Send themselves; nothing is sent from here.
// target: { customerId } | { leadId } | { messageId } (an unmatched sender).
const box = 'block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500'

export default function SuggestReply({ target, season, className = pill }) {
  const [state, setState] = useState({ step: 'idle' }) // idle | loading | ready | error
  const [subject, setSubject] = useState('')
  const [reply, setReply] = useState('')

  async function suggest(e) {
    e?.stopPropagation()
    setState({ step: 'loading' })
    try {
      const d = await requestDraft(target)
      setSubject(d.subject ?? '')
      setReply(d.reply ?? '')
      setState({ step: 'ready', draft: d })
    } catch (err) {
      setState({ step: 'error', message: err.message })
    }
  }

  const sent = (how) => logActivity('ai-draft', { ...activityTarget(target), name: state.draft?.contact?.fullName }, `${how}: ${state.draft?.summary ?? ''}`)

  if (state.step === 'idle' || state.step === 'loading') {
    return (
      <button type="button" onClick={suggest} disabled={state.step === 'loading'} className={`${className} disabled:opacity-60`} aria-busy={state.step === 'loading'}>
        ✨ {state.step === 'loading' ? 'Thinking…' : 'Suggest a reply'}
      </button>
    )
  }
  if (state.step === 'error') {
    return (
      <div className="rounded-2xl bg-berry-600/15 p-3 text-sm" role="alert" onClick={(e) => e.stopPropagation()}>
        <p className="text-berry-500">{state.message}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={suggest} className={pill}>Try again</button>
          <button type="button" onClick={() => setState({ step: 'idle' })} className={pill}>Close</button>
        </div>
      </div>
    )
  }

  const d = state.draft
  const c = d.contact ?? {}
  const person = { firstName: c.firstName, fullName: c.fullName || c.email || c.phone, email: c.email }
  const canEmail = Boolean(c.email)
  const canText = Boolean(c.phone)
  const primary = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-glow-400 px-4 py-2 text-sm font-semibold text-night-950'
  return (
    <div className="space-y-3 rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3 text-left" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-glow-300">✨ Suggested reply</p>
          <p className="mt-1 text-slate-200"><span className="text-slate-400">They’re asking:</span> {d.summary}</p>
          <p className="mt-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${d.escalate ? 'bg-berry-600 text-white' : 'bg-white/15 text-slate-100'}`}>
              Next: {d.nextActionLabel}
            </span>
          </p>
          {d.reason && <p className="mt-1.5 text-glow-300">⚠ {d.reason}</p>}
        </div>
        <button type="button" onClick={() => setState({ step: 'idle' })} aria-label="Close suggestion" className="min-h-11 min-w-11 shrink-0 rounded-full bg-white/10 text-slate-300">✕</button>
      </div>

      {d.channel === 'email' && (
        <label className="block text-sm text-slate-400">Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`${box} mt-1`} />
        </label>
      )}
      <label className="block text-sm text-slate-400">{d.channel === 'email' ? 'Email' : 'Text'} (edit before sending)
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={Math.min(14, Math.max(4, reply.split('\n').length + 1))} className={`${box} mt-1 whitespace-pre-wrap`} />
      </label>

      <div className="flex flex-wrap gap-2">
        {canEmail && (
          <ComposeEmail person={person} season={season} target={emailTarget(target)} initial={{ subject, body: reply }} label="✉️ Email this"
            className={d.channel === 'email' ? primary : pill} onSent={() => sent('email')} />
        )}
        {canText && <TextButton phone={c.phone} message={reply} label="Text this" className={d.channel === 'text' ? primary : pill} onSent={() => sent('text')} />}
        {!canEmail && !canText && <p className="text-sm text-slate-400">No email or phone on file: copy the text above into Gmail or Voice.</p>}
        <button type="button" onClick={suggest} className={pill}>↻ Try again</button>
      </div>
      <p className="text-xs text-slate-500">Drafted by Claude from their history and record. Read it before you send: it can be wrong. Prices and dates only come from what’s on file.</p>
    </div>
  )
}
