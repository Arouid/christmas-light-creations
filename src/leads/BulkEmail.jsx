import { useMemo, useRef, useState } from 'react'
import { whenText } from '../../functions/scheduleTime.js'
import { bounceLine, bounceOf } from '../lib/bounces'
import { todayISO } from '../lib/customers'
import { fillTemplate, gmailUrl, missingPlaceholders } from '../lib/messages'
import { TemplateFields, TemplateSelect } from './EmailParts'
import SendLater from './SendLater'
import { scheduleEmails, targetKey, useScheduledEmails, waitingKeys } from './scheduledEmail'
import { emailsOnRecord, sendEmail } from './sendEmail'
import { useStaff } from './staffContext'
import { useEmailTemplates } from './templatesContext'

const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const customerTarget = (c) => ({ customerId: c.id })
const listId = () => `L${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// One-to-one emails, back to back: each person gets their own email from
// info@ (better for spam filters than one BCC blast), sent from the app one
// by one, or "Send the rest" after one confirm, or "Schedule the rest" for
// one time (docs/specs/scheduled-email.md). Gmail stays available per
// person. Sent ones are recorded on the record so the list can be resumed
// without repeats (scheduled ones when they go out; until then they're
// skipped as already scheduled). `targetOf(row)` says whose history each
// email goes in.
export function EmailQueue({ rows, season, onUpdate, templateId = 'reinstall', targetOf = customerTarget, onClose, onBack }) {
  const templates = useEmailTemplates()
  const { user } = useStaff()
  const scheduledItems = useScheduledEmails(user)
  const waiting = useMemo(() => waitingKeys(scheduledItems), [scheduledItems])
  const [scheduled, setScheduled] = useState(null) // { count, at } after Schedule the rest
  const first = templates.find((t) => t.id === templateId) ?? templates[0]
  const [step, setStep] = useState('compose') // compose | send | done
  const [template, setTemplate] = useState(first.id)
  const [subject, setSubject] = useState(first.subject)
  const [body, setBody] = useState(first.body)
  const [skipSent, setSkipSent] = useState(true)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const [blanks, setBlanks] = useState([]) // left out by "Send the rest": [{ c, why }]
  const [status, setStatus] = useState(null) // null | 'sending' | 'auto' | 'confirm' | 'later' | 'scheduling' | 'gmail' | { error }
  const stop = useRef(false)
  const fill = (text, c) => fillTemplate(text, c, season)

  const withEmail = rows.filter((c) => c.email?.includes('@'))
  const sentKey = (c) => c.seasons?.[season]?.emailsSent?.[template] || waiting.has(targetKey(targetOf(c), template))
  const pending = withEmail.filter((c) => !(skipSent && sentKey(c)))
  const label = templates.find((t) => t.id === template)?.label ?? 'Email'
  const missingFor = (c) => missingPlaceholders(subject + body, c, season)
  // An earlier email to their address bounced (docs/specs/email-bounces.md).
  const bounceFor = (c) => bounceOf(c, emailsOnRecord(c)[0] ?? c.email)
  // Why the rest-in-one-go leaves someone out ('' = send): blank parts, or a bounced address.
  const holdFor = (c) => {
    const m = missingFor(c)
    if (m.length) return `no ${m.join(', ')}`
    const b = bounceFor(c)
    return b ? `an earlier email to ${b.email} bounced` : ''
  }

  function pick(key) {
    const t = templates.find((x) => x.id === key)
    setTemplate(key)
    setSubject(t.subject)
    setBody(t.body)
  }

  function start() {
    setQueue(pending)
    setIndex(0)
    setSentCount(0)
    setBlanks([])
    setScheduled(null)
    setStatus(null)
    setStep(pending.length ? 'send' : 'done')
  }

  async function markSent(c) {
    setSentCount((n) => n + 1)
    await onUpdate?.(c.id, `seasons.${season}.emailsSent.${template}`, todayISO())
  }

  function advance(from) {
    setStatus(null)
    if (from + 1 < queue.length) setIndex(from + 1)
    else setStep('done')
  }

  // Sends to the first address on their record; throws with a sentence to show.
  async function sendTo(c) {
    await sendEmail(user, { to: emailsOnRecord(c)[0] ?? c.email, subject: fill(subject, c), text: fill(body, c), target: targetOf(c), template })
    await markSent(c)
  }

  async function sendOne() {
    const c = queue[index]
    setStatus('sending')
    try {
      await sendTo(c)
      advance(index)
    } catch (err) {
      setStatus({ error: err.message })
    }
  }

  async function sendRest() {
    stop.current = false
    setStatus('auto')
    for (let i = index; i < queue.length; i++) {
      if (stop.current) { setIndex(i); setStatus(null); return }
      setIndex(i)
      const c = queue[i]
      const why = holdFor(c)
      if (why) { setBlanks((list) => [...list, { c, why }]); continue }
      try {
        await sendTo(c)
      } catch (err) {
        setStatus({ error: err.message })
        return
      }
      if (i + 1 < queue.length) await pause(1000)
    }
    setStatus(null)
    setStep('done')
  }

  // Everyone left (but those with blank parts or a bounced address) for one
  // time, in one go; each is noted as sent on their record when it actually goes out.
  async function scheduleRest(at) {
    const left = queue.slice(index)
    const ready = left.filter((x) => !holdFor(x))
    const target = (x) => targetOf(x)
    const mark = (x) => ('customerId' in target(x) || 'pastRequestId' in target(x) ? { mark: { season: String(season), field: 'emailsSent' } } : {})
    setStatus('scheduling')
    try {
      await scheduleEmails(user, {
        sendAt: at, batch: listId(),
        emails: ready.map((x) => ({ to: emailsOnRecord(x)[0] ?? x.email, subject: fill(subject, x), text: fill(body, x), template, target: target(x), name: x.fullName, ...mark(x) })),
      })
    } catch (err) {
      setStatus({ error: err.message })
      return
    }
    setBlanks((list) => [...list, ...left.filter(holdFor).map((x) => ({ c: x, why: holdFor(x) }))])
    setScheduled({ count: ready.length, at })
    setStatus(null)
    setStep('done')
  }

  const c = queue[index]
  const missing = c ? missingFor(c) : []
  const bounced = c ? bounceFor(c) : null
  const rest = queue.slice(index)
  const restBlank = rest.filter(holdFor).length
  const busy = status === 'sending' || status === 'auto' || status === 'scheduling'
  const error = status?.error

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Email customers">
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">Email one by one</h2>
          <div className="flex gap-2">
            {onBack && step === 'compose' && <button type="button" onClick={onBack} className="rounded-full bg-white/10 px-4 py-2.5 text-sm">← People</button>}
            <button type="button" onClick={() => { stop.current = true; onClose() }} className="rounded-full bg-white/10 px-4 py-2.5 text-sm">Close</button>
          </div>
        </div>

        {step === 'compose' && (
          <>
            <label className="block text-sm text-slate-400">Template
              <TemplateSelect value={template} onChange={pick} />
            </label>
            <TemplateFields subject={subject} body={body} onSubject={setSubject} onBody={setBody} rows={9} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={skipSent} onChange={(e) => setSkipSent(e.target.checked)} />
              Skip people already sent or scheduled “{label}” this season ({withEmail.filter((x) => sentKey(x)).length})
            </label>
            <p className="text-sm text-slate-400">
              {pending.length} to send{rows.length > withEmail.length && ` · ${rows.length - withEmail.length} picked have no email`}.
              Each person gets their own email from info@. You see each one before it goes, or send the rest in one go.
            </p>
            <button type="button" onClick={start} disabled={!pending.length}
              className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-40">
              Start ({pending.length})
            </button>
          </>
        )}

        {step === 'send' && c && (
          <>
            <p className="text-sm text-slate-400">{index + 1} of {queue.length} · {sentCount} sent · {label}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-glow-400" style={{ width: `${(index / queue.length) * 100}%` }} />
            </div>
            {missing.length > 0 && (
              <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
                ⚠ No {missing.join(', ')} on file for {c.firstName || 'this person'}: that part will be blank. Skip, or fill it on their record first.
              </p>
            )}
            {bounced && (
              <p role="status" className="break-words rounded-xl border border-berry-500/50 bg-berry-600/15 px-3 py-2 text-sm text-slate-100">
                ⚠ {bounceLine(bounced)} Skip, or fix the address on their record first.
              </p>
            )}
            <div className="rounded-2xl bg-night-950 p-4">
              <p className="font-semibold">{c.fullName}</p>
              <p className="break-all text-sm text-slate-400">{emailsOnRecord(c)[0] ?? c.email}</p>
              <p className="mt-3 text-sm font-semibold">{fill(subject, c)}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{fill(body, c)}</p>
            </div>
            {error && <p role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">{c.firstName || c.fullName}: {error}</p>}

            {status === 'auto' ? (
              <div className="space-y-2">
                <p className="text-center text-sm text-slate-300">Sending the rest, one at a time…</p>
                <button type="button" onClick={() => { stop.current = true }} className="w-full rounded-full border border-white/20 py-3 font-semibold">Stop</button>
              </div>
            ) : status === 'confirm' ? (
              <div className="space-y-3 rounded-2xl border border-glow-400/40 p-4">
                <p className="text-sm">
                  {rest.length === restBlank
                    ? `Everyone left (${restBlank}) has blank parts or a bounced address, so nothing would go out. Fix their records first, or Skip them.`
                    : `Send ${rest.length - restBlank} email${rest.length - restBlank === 1 ? '' : 's'} from info@ now, one at a time?${restBlank ? ` ${restBlank} with blank parts or a bounced address will be skipped (not marked sent).` : ''}`}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStatus(null)} className="flex-1 rounded-full border border-white/20 py-3 font-semibold">Cancel</button>
                  <button type="button" onClick={sendRest} disabled={rest.length === restBlank}
                    className="flex-1 rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-40">Yes, send</button>
                </div>
              </div>
            ) : status === 'later' || status === 'scheduling' ? (
              rest.length === restBlank ? (
                <div className="space-y-3 rounded-2xl border border-glow-400/40 p-4">
                  <p className="text-sm">Everyone left ({restBlank}) has blank parts or a bounced address, so nothing would be scheduled. Fix their records first, or Skip them.</p>
                  <button type="button" onClick={() => setStatus(null)} className="w-full rounded-full border border-white/20 py-3 font-semibold">Back</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-300">
                    Each of the {rest.length - restBlank} gets their own email from info@, one a second from that time.
                    {restBlank ? ` ${restBlank} with blank parts or a bounced address will be skipped (not scheduled).` : ''}
                  </p>
                  <SendLater count={rest.length - restBlank} busy={status === 'scheduling'} onSchedule={scheduleRest} onBack={() => setStatus(null)} />
                </div>
              )
            ) : (
              <>
                <div className="flex gap-2">
                  <button type="button" onClick={() => advance(index)} disabled={busy} className="flex-1 rounded-full border border-white/20 py-3 font-semibold disabled:opacity-40">Skip</button>
                  {status === 'gmail' ? (
                    <button type="button" onClick={async () => { await markSent(c); advance(index) }} className="flex-1 rounded-full bg-glow-400 py-3 font-semibold text-night-950">Sent in Gmail ✓ Next</button>
                  ) : (
                    <button type="button" onClick={sendOne} disabled={busy} className="flex-1 rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-50">
                      {status === 'sending' ? 'Sending…' : error ? 'Try again' : 'Send ✓ Next'}
                    </button>
                  )}
                </div>
                {rest.length > 1 && status !== 'gmail' && (
                  <button type="button" onClick={() => setStatus('confirm')} disabled={busy} className="w-full rounded-full bg-white py-3 font-semibold text-night-950 disabled:opacity-40">
                    Send the rest ({rest.length})
                  </button>
                )}
                {status !== 'gmail' && (
                  <button type="button" onClick={() => setStatus('later')} disabled={busy} className="w-full rounded-full border border-glow-400/50 py-3 font-semibold text-glow-300 disabled:opacity-40">
                    ⏰ {rest.length > 1 ? `Schedule the rest (${rest.length})…` : 'Send later…'}
                  </button>
                )}
                <a href={gmailUrl({ to: c.email, subject: fill(subject, c), body: fill(body, c) })} target="_blank" rel="noreferrer"
                  onClick={() => setStatus('gmail')} className="block py-2 text-center text-sm text-slate-400 underline">
                  Open in Gmail instead
                </a>
              </>
            )}
          </>
        )}

        {step === 'done' && (
          <div className="space-y-3 py-6 text-center">
            <p className="text-lg font-semibold">{queue.length ? (scheduled && !sentCount ? 'Done.' : `Done: ${sentCount} sent.`) :'Everyone here already got this one (or has it scheduled).'}</p>
            {scheduled && (
              <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
                ⏰ {scheduled.count} scheduled for {whenText(scheduled.at)} (Central). Change or cancel them in Home → Scheduled emails until then.
              </p>
            )}
            {blanks.length > 0 && (
              <div className="rounded-xl bg-glow-400/10 px-3 py-2 text-left text-sm text-glow-300">
                <p className="font-semibold">Not sent (blank parts or a bounced address), so they’re still on the list:</p>
                <ul className="mt-1 list-disc pl-5">
                  {blanks.map(({ c: x, why }) => <li key={x.id}>{x.fullName}: {why}</li>)}
                </ul>
              </div>
            )}
            <p className="text-sm text-slate-400">Each person shows when “{label}” was sent, so this list can be resumed any time without repeats.</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => setStep('compose')} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold">Back to template</button>
              <button type="button" onClick={onClose} className="rounded-full bg-glow-400 px-5 py-2.5 text-sm font-semibold text-night-950">Finish</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Season tab button: email everyone in the current filtered list.
export default function BulkEmail({ rows, season, onUpdate }) {
  const [open, setOpen] = useState(false)
  const count = rows.filter((c) => c.email?.includes('@')).length
  if (!count) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">
        ✉ Email these {count}
      </button>
      {open && <EmailQueue rows={rows} season={season} onUpdate={onUpdate} onClose={() => setOpen(false)} />}
    </>
  )
}
