import { useState } from 'react'
import { whenText } from '../../functions/scheduleTime.js'
import { MAX_TEXT, STOCK_TEXTS, TEXT_LABELS, mergeTexts, reminderRows, reminderTime, routeTimed, stopExtras, stopText, toldText } from '../lib/installTexts'
import { fillTemplate } from '../lib/messages'
import { TextDialog } from './Reach'
import { scheduleEmails } from './scheduledEmail'
import { TimeNote, TimePicker } from './SendLater'
import { useStaff } from './staffContext'
import { TITLE, recordTap, routeSeason } from './stopTexts'
import { useEmailTemplates } from './templatesContext'

// Install-day texts (docs/specs/install-texts.md): On our way and All done
// from a route stop, the day-before reminders of a route, and the Settings
// box for the wording. The app can't send a text (Google Voice has no API):
// each tap copies the text and opens Voice, a person pastes and sends, and
// the app records the tap on the stop, in the customer's history and in
// Recent activity.

// Shape only; each button sets its own colors (two bg- classes would clash).
const shape = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold'
const plain = `${shape} bg-white/10 hover:bg-white/15`
const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'

// The Voice box for a stop's text: `dialog` from useStopTexts() (src/leads/stopTexts.js).
export function StopTextDialog({ dialog }) {
  return dialog ? <TextDialog {...dialog} /> : null
}

// The text buttons of a stop: 🚗 On our way while it's to do, 💬 All done once
// it's done; each shows "told 10:42 am" afterwards (tap again to repeat).
export function StopTextButtons({ texts, stop, className = 'flex flex-wrap gap-2' }) {
  const done = stop.status === 'done'
  const skipped = stop.status === 'skipped'
  if (skipped) return null
  // An address-only stop has nobody to text: say nothing. A customer without a phone or opted out: say why.
  if (texts.reason) return stop.customerId ? <p className={`text-xs text-slate-500 ${className}`}>No texts: {texts.reason}</p> : null
  const button = (step, label) => {
    const t = texts[step]
    if (!t.allowed) return null
    return (
      <button key={step} type="button" onClick={(e) => { e.stopPropagation(); t.open() }}
        className={t.told ? `${shape} bg-emerald-500/15 text-emerald-300` : `${shape} bg-sky-500/20 text-sky-100 hover:bg-sky-500/30`}>
        {label} {t.told ? `· ${t.told}` : ''}
      </button>
    )
  }
  return (
    <div className={className}>
      {!done && button('onway', '🚗 On our way')}
      {done && button('done', '💬 All done')}
    </div>
  )
}

// ---- Day-before reminders (the route's edit screen) ------------------------------

const EMAIL_TEMPLATE = { takedown: 'takedown-reminder' }
const reminderTemplate = (kind) => EMAIL_TEMPLATE[kind] ?? 'install-reminder'
const batchId = (route) => `${route.id}-${route.day}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)
// The mark a scheduled reminder leaves on each stop (outside the component: the clock is impure for the linter).
const scheduledMarks = (rows, ids, user) => new Map(rows.map((r, i) => [r.stop.id, { at: new Date().toISOString(), by: user?.email ?? '', via: 'email', scheduledId: ids[i] ?? '', when: r.when }]))

// rows: timeline() rows of the route (with eta). Email people get the
// "We're coming tomorrow" email through Send later; people with no email get
// a text to paste; already reminded ones are left out unless Send again.
export function ReminderBox({ route, rows, customers, onSave }) {
  const { user, settings } = useStaff()
  const emailTemplates = useEmailTemplates()
  const [defaultAt] = useState(() => reminderTime(route.day))
  const [at, setAt] = useState(defaultAt)
  const [changing, setChanging] = useState(false)
  const [again, setAgain] = useState(() => new Set())
  const [status, setStatus] = useState(null) // null | 'scheduling' | { error } | { done }
  const [texting, setTexting] = useState(null) // a row
  const timed = routeTimed(route)
  const season = routeSeason(route)
  const templates = mergeTexts(settings?.textTemplates)
  const byId = new Map((customers ?? []).map((c) => [c.id, c]))
  const list = reminderRows(route, rows, byId, timed)
  if (!list.length) return null

  const pending = list.filter((r) => !r.mark || again.has(r.stop.id))
  const emailRows = pending.filter((r) => r.via === 'email')
  const textRows = pending.filter((r) => r.via === 'text')
  const when = Number.isFinite(at) ? whenText(at) : ''
  const stopsWith = (marks) => route.stops.map((s) => (marks.has(s.id) ? { ...s, texts: { ...(s.texts ?? {}), reminder: marks.get(s.id) } } : s))

  async function schedule() {
    setStatus('scheduling')
    const emails = emailRows.map((r) => {
      const id = reminderTemplate(r.stop.kind)
      const t = emailTemplates.find((x) => x.id === id) ?? { subject: '', body: '' }
      const extra = stopExtras(r.stop, route, timed)
      return {
        to: r.email, subject: fillTemplate(t.subject, r.customer, season, extra), text: fillTemplate(t.body, r.customer, season, extra), template: id,
        target: { customerId: r.customer.id }, name: r.customer.fullName, mark: { season: String(season), field: 'emailsSent' },
      }
    })
    try {
      const { ids } = await scheduleEmails(user, { emails, sendAt: at, batch: emails.length > 1 ? batchId(route) : '' })
      await onSave({ stops: stopsWith(scheduledMarks(emailRows, ids, user)) })
      setAgain(new Set())
      setStatus({ done: emails.length })
    } catch (err) {
      setStatus({ error: err.message })
    }
  }

  function texted(r, text) {
    setTexting(null)
    recordTap({ stop: r.stop, customer: r.customer, step: 'reminder', text, user, extraMark: { via: 'text', when: r.when },
      onStop: (patch) => onSave({ stops: route.stops.map((s) => (s.id === r.stop.id ? { ...s, ...patch } : s)) }) })
    setAgain((set) => { const next = new Set(set); next.delete(r.stop.id); return next })
  }

  const stateOf = (r) => {
    if (again.has(r.stop.id) || !r.mark) return null
    return r.mark.via === 'email' ? `⏰ email scheduled ${r.mark.when ? `(${r.mark.when})` : ''}` : `✓ texted (${toldText(r.mark)})`
  }
  const textFor = (r) => stopText('reminder', { stop: r.stop, route, customer: r.customer, season, templates, timed })

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4">
      <p className="font-semibold">Day-before reminders</p>
      {!defaultAt && <p className="text-sm text-slate-400">This route is today (or has passed), so a reminder would say “tomorrow”. Use <strong>🚗 On our way</strong> on the installer screen instead.</p>}
      {defaultAt && !timed && <p className="text-sm text-glow-300">⚡ Optimize the route first so the reminders say a real arrival window (right now they say “during the day”).</p>}
      <ul className="divide-y divide-white/5 text-sm">
        {list.map((r) => {
          const state = stateOf(r)
          return (
            <li key={r.stop.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.stop.name}</span>
                <span className="block text-slate-400">{r.when}{r.via === 'email' ? ` · ✉ ${r.email}` : r.via === 'text' ? ' · 📱 text only (no email)' : ` · ⚠ ${r.reason}`}</span>
              </span>
              {state && (
                <span className="flex items-center gap-2 text-xs text-emerald-300">
                  {state}
                  <button type="button" onClick={() => setAgain((set) => new Set(set).add(r.stop.id))} className="min-h-11 text-slate-400 underline">Send again</button>
                </span>
              )}
              {!state && defaultAt && r.via === 'text' && (
                <button type="button" onClick={() => setTexting(r)} className={plain}>📱 Text</button>
              )}
            </li>
          )
        })}
      </ul>
      {defaultAt && emailRows.length > 0 && (
        <div className="space-y-2">
          {changing && Number.isFinite(at) && <><TimePicker value={at} onChange={setAt} /><TimeNote at={at} /></>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={schedule} disabled={status === 'scheduling' || !Number.isFinite(at)}
              className={`${shape} bg-glow-400 text-night-950 hover:bg-glow-300 disabled:opacity-50`}>
              {status === 'scheduling' ? 'Scheduling…' : `⏰ Email ${emailRows.length} reminder${emailRows.length === 1 ? '' : 's'} ${when ? `at ${when}` : ''}`}
            </button>
            {!changing && <button type="button" onClick={() => setChanging(true)} className="min-h-11 text-sm text-slate-400 underline">Change time</button>}
          </div>
          <p className="text-xs text-slate-500">Central time. One “We’re coming tomorrow” email per person from info@ (the Emails tab has the wording); change or cancel them on Home → Scheduled emails until then.</p>
        </div>
      )}
      {defaultAt && !emailRows.length && textRows.length > 0 && <p className="text-xs text-slate-500">Nobody left to email; the 📱 Text buttons open Voice with the reminder text.</p>}
      {status?.error && <p role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">{status.error}</p>}
      {status?.done != null && <p className="text-sm text-emerald-400">⏰ {status.done} scheduled for {when}. They’re on Home → Scheduled emails.</p>}
      {texting && (
        <TextDialog phone={texting.phone} message={textFor(texting)} title={`${TITLE.reminder} ${texting.customer.firstName || texting.customer.fullName}`}
          onClose={() => setTexting(null)} onOpenVoice={() => texted(texting, textFor(texting))} />
      )}
    </div>
  )
}

// ---- ⚙ Settings → Install-day texts -----------------------------------------------

export function InstallTextSettings({ settings, onSave }) {
  const [texts, setTexts] = useState(() => mergeTexts(settings.textTemplates))
  const [msg, setMsg] = useState(null)
  const set = (k, v) => { setTexts((t) => ({ ...t, [k]: v })); setMsg(null) }
  async function save() {
    await onSave({ textTemplates: Object.fromEntries(TEXT_LABELS.map(([k]) => [k, texts[k].trim() === STOCK_TEXTS[k] ? '' : texts[k].trim()])) })
    setMsg('Saved ✓')
  }
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-night-950 p-4">
      <p className="font-semibold">Install-day texts</p>
      <p className="text-sm text-slate-400">
        What the crew sends from a route stop (🚗 On our way, 💬 All done) and the day-before reminder for people with no email. Each is copied and pasted into Google Voice. Placeholders: {'{first} {job} {visitDay} {when} {eta} {business} {businessPhone}'}. The day-before <em>email</em> is in the Emails tab (“We’re coming tomorrow”).
      </p>
      {TEXT_LABELS.map(([k, label, hint]) => (
        <label key={k} className="block text-sm text-slate-400">
          <span className="flex items-center justify-between gap-2">{label}
            <span className={`text-xs ${texts[k].length > MAX_TEXT ? 'text-berry-500' : 'text-slate-500'}`}>{texts[k].length} chars{texts[k].length > MAX_TEXT ? ' · long: may arrive in two parts' : ''}</span>
          </span>
          <textarea value={texts[k]} rows={4} onChange={(e) => set(k, e.target.value)} className={field} />
          <span className="flex items-center justify-between gap-2 text-xs text-slate-500">{hint}
            {texts[k] !== STOCK_TEXTS[k] && <button type="button" onClick={() => set(k, STOCK_TEXTS[k])} className="min-h-11 shrink-0 underline">Reset</button>}
          </span>
        </label>
      ))}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950">Save for everyone</button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  )
}
