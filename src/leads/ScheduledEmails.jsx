import { useMemo, useState } from 'react'
import { groupScheduled, msOf, quickPicks, sendAtProblem, whenText } from '../../functions/scheduleTime.js'
import { staffName } from '../lib/activity'
import { field } from './EmailParts'
import { TimeNote, TimePicker } from './SendLater'
import { label, panel } from './HomePanels'
import { accountLink, cancelScheduled, editScheduled, useScheduledEmails, useScheduledFor } from './scheduledEmail'
import { useStaff } from './staffContext'

// Emails waiting to go out (docs/specs/scheduled-email.md): every one on Home,
// one person's at the top of their history. Any staff member can change the
// time or text, or cancel, until it starts going out. "Didn't go" ones stay
// here (with the reason) until someone gives them a new time or removes them.
const small = 'min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-40'

// Cancel with a second tap, so a stray tap on a phone doesn't drop an email.
function CancelButton({ items, word = 'Cancel', onDone }) {
  const { user } = useStaff()
  const [step, setStep] = useState('idle') // idle | ask | busy | { error }
  async function go() {
    setStep('busy')
    try {
      const r = await cancelScheduled(user, items)
      if (r.tooLate && !r.cancelled) setStep({ error: 'Too late: it’s already going out.' })
      else { setStep('idle'); onDone?.(r) }
    } catch (err) {
      setStep({ error: err.message })
    }
  }
  if (step === 'ask' || step === 'busy') {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-300">{items.length > 1 ? `Cancel all ${items.length}?` : 'Cancel this email?'}</span>
        <button type="button" onClick={() => setStep('idle')} disabled={step === 'busy'} className={`${small} bg-white/10`}>Keep</button>
        <button type="button" onClick={go} disabled={step === 'busy'} className={`${small} bg-berry-600 text-white`}>{step === 'busy' ? 'Cancelling…' : 'Yes, cancel'}</button>
      </span>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setStep('ask')} className={`${small} border border-white/20`}>{word}</button>
      {step?.error && <span role="alert" className="text-sm text-berry-500">{step.error}</span>}
    </span>
  )
}

// New time, subject and message for one waiting (or failed) email.
function EditScheduled({ item, onClose }) {
  const { user } = useStaff()
  const start = msOf(item.sendAt)
  const [at, setAt] = useState(() => (start > Date.now() ? start : quickPicks(Date.now())[0].at))
  const [subject, setSubject] = useState(item.subject ?? '')
  const [text, setText] = useState(item.text ?? '')
  const [state, setState] = useState(null) // null | 'saving' | { error }
  async function save() {
    setState('saving')
    try {
      await editScheduled(user, item, { sendAt: at, subject, text })
      onClose()
    } catch (err) {
      setState({ error: err.message })
    }
  }
  const ok = !sendAtProblem(at) && subject.trim() && text.trim()
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Change scheduled email">
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5 text-left">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate font-display text-2xl font-extrabold">⏰ Scheduled email</h2>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-white/10 px-4 py-2.5 text-sm">Close</button>
        </div>
        <p className="break-words text-sm text-slate-400">To {item.name ? `${item.name} · ` : ''}{item.to}</p>
        <div className="space-y-2">
          <p className="text-sm text-slate-400">When <span className="text-slate-500">(Central)</span></p>
          <TimePicker value={at} onChange={setAt} />
          <TimeNote at={at} />
        </div>
        <label className="block text-sm text-slate-400">Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </label>
        <label className="block text-sm text-slate-400">Message
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} className={field} />
        </label>
        {state?.error && <p role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">{state.error}</p>}
        <button type="button" onClick={save} disabled={!ok || state === 'saving'} className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-50">
          {state === 'saving' ? 'Saving…' : `Save: send ${ok ? whenText(at) : '…'}`}
        </button>
      </div>
    </div>
  )
}

// One email: when, who (link to their account), subject, who scheduled it,
// Didn't go reason, Edit / Cancel.
function Row({ x, names, showName = true, actions = true }) {
  const [editing, setEditing] = useState(false)
  const failed = x.status === 'failed'
  const link = accountLink(x)
  return (
    <li className="space-y-1">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className={`font-semibold ${failed ? 'text-berry-500' : 'text-glow-300'}`}>{failed ? '⚠ Didn’t go' : x.status === 'sending' ? '✉ Going out now' : `⏰ ${whenText(msOf(x.sendAt))}`}</span>
        {showName && (link ? <a href={link} className="font-semibold underline decoration-white/20">{x.name || x.to}</a> : <span className="font-semibold">{x.name || x.to}</span>)}
      </p>
      <p className="break-words text-sm text-slate-300">{x.subject}</p>
      <p className="text-xs text-slate-400">by {staffName(x.by, names)}{failed && x.sendAt ? ` · was for ${whenText(msOf(x.sendAt))}` : ''}</p>
      {failed && x.error && <p className="text-sm text-berry-500">{x.error}</p>}
      {actions && x.status !== 'sending' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={() => setEditing(true)} className={`${small} bg-white/10`}>{failed ? 'New time…' : 'Edit'}</button>
          <CancelButton items={[x]} word={failed ? 'Remove' : 'Cancel'} />
        </div>
      )}
      {editing && <EditScheduled item={x} onClose={() => setEditing(false)} />}
    </li>
  )
}

// A list scheduled together: one line, the names folded.
function Batch({ g, names, actions }) {
  const [open, setOpen] = useState(false)
  const first = g.items[0]
  const waiting = g.items.filter((x) => x.status === 'scheduled' || x.status === 'failed')
  return (
    <li className="space-y-1">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold text-glow-300">⏰ {whenText(g.sendAt)}</span>
        <span className="font-semibold">{g.items.length} emails</span>
        {g.failed > 0 && <span className="text-berry-500">· {g.failed} didn’t go</span>}
      </p>
      <p className="break-words text-sm text-slate-300">{first.subject}{g.items.length > 1 ? ' (filled in for each)' : ''}</p>
      <p className="text-xs text-slate-400">a list, by {staffName(first.by, names)}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={`${small} bg-white/10`}>{open ? 'Hide names' : 'Show names'}</button>
        {actions && waiting.length > 0 && <CancelButton items={waiting} word={`Cancel all ${waiting.length}`} />}
      </div>
      {open && (
        <ul className="mt-2 space-y-3 border-l border-white/10 pl-3">
          {g.items.map((x) => <Row key={x.id} x={x} names={names} actions={actions} />)}
        </ul>
      )}
    </li>
  )
}

// Home → Scheduled emails.
export function ScheduledPanel({ user, names, wall }) {
  const items = useScheduledEmails(user)
  const groups = useMemo(() => groupScheduled(items ?? []), [items])
  const failed = (items ?? []).filter((x) => x.status === 'failed').length
  return (
    <section className={panel} aria-label="Scheduled emails">
      <h2 className={label}>Scheduled emails{items?.length ? ` · ${items.length}` : ''}{failed ? <span className="text-berry-500"> · {failed} didn’t go</span> : null}</h2>
      {!items && <p className="mt-3 text-sm text-slate-400">Loading…</p>}
      {items && !groups.length && <p className={`mt-3 text-slate-400 ${wall ? 'text-lg' : 'text-sm'}`}>Nothing waiting. Any Email box has ⏰ Send later.</p>}
      <ul className="mt-3 space-y-4">
        {groups.map((g) => (g.batch && g.items.length > 1
          ? <Batch key={g.key} g={g} names={names} actions={!wall} />
          : <Row key={g.key} x={g.items[0]} names={names} actions={!wall} />))}
      </ul>
    </section>
  )
}

// Top of a person's Text & email history: their waiting ones.
export function ScheduledFor({ user, field: by, value }) {
  const items = useScheduledFor(user, by, value)
  if (!items.length) return null
  return (
    <section className="rounded-2xl border border-glow-400/30 bg-glow-400/5 p-3" aria-label="Scheduled emails">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-300/80">Scheduled</h3>
      <ul className="mt-2 space-y-3">
        {items.map((x) => <Row key={x.id} x={x} showName={false} />)}
      </ul>
    </section>
  )
}
