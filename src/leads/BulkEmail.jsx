import { useRef, useState } from 'react'
import { todayISO } from '../lib/customers'
import { PLACEHOLDERS, TEMPLATES, fillTemplate, gmailUrl, missingPlaceholders } from '../lib/messages'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'

// One-to-one emails, back to back: each customer gets their own Gmail draft
// from info@ (better for spam filters than one BCC blast). Sent ones are
// recorded on the customer so the list can be resumed without repeats.
export default function BulkEmail({ rows, season, onUpdate }) {
  const [step, setStep] = useState('closed') // closed | compose | send | done
  const [template, setTemplate] = useState('reinstall')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [skipSent, setSkipSent] = useState(true)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const subjectRef = useRef(null)
  const bodyRef = useRef(null)
  const lastField = useRef('body')
  const fill = (text, c) => fillTemplate(text, c, season)

  // Insert {key} where the cursor was in the subject or message.
  function insert(key) {
    const el = lastField.current === 'subject' ? subjectRef.current : bodyRef.current
    const [value, set] = lastField.current === 'subject' ? [subject, setSubject] : [body, setBody]
    const at = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? at
    set(value.slice(0, at) + `{${key}}` + value.slice(end))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + key.length + 2, at + key.length + 2) })
  }

  const withEmail = rows.filter((c) => c.email?.includes('@'))
  const sentKey = (c) => c.seasons?.[season]?.emailsSent?.[template]
  const pending = withEmail.filter((c) => !(skipSent && sentKey(c)))
  const label = TEMPLATES[template].label

  function pick(key) {
    setTemplate(key)
    setSubject(TEMPLATES[key].subject(season))
    setBody(TEMPLATES[key].body({ firstName: '{first}' }, season))
  }

  function start() {
    setQueue(pending)
    setIndex(0)
    setSentCount(0)
    setStep(pending.length ? 'send' : 'done')
  }

  async function next(sent) {
    const c = queue[index]
    if (sent) {
      setSentCount((n) => n + 1)
      await onUpdate?.(c.id, `seasons.${season}.emailsSent.${template}`, todayISO())
    }
    if (index + 1 < queue.length) setIndex(index + 1)
    else setStep('done')
  }

  if (!withEmail.length) return null
  const c = queue[index]

  return (
    <>
      <button type="button" onClick={() => { pick(template); setStep('compose') }}
        className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">
        ✉ Email these {withEmail.length}
      </button>

      {step !== 'closed' && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Email customers">
          <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-extrabold">Email customers one by one</h2>
              <button type="button" onClick={() => setStep('closed')} className="rounded-full bg-white/10 px-4 py-2 text-sm">Close</button>
            </div>

            {step === 'compose' && (
              <>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TEMPLATES).map(([k, t]) => (
                    <button key={k} type="button" onClick={() => pick(k)}
                      className={`rounded-full px-3 py-1.5 text-sm ${template === k ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>{t.label}</button>
                  ))}
                </div>
                <label className="block text-sm text-slate-400">Subject
                  <input ref={subjectRef} value={subject} onFocus={() => { lastField.current = 'subject' }}
                    onChange={(e) => setSubject(e.target.value)} className={field} />
                </label>
                <label className="block text-sm text-slate-400">Message
                  <textarea ref={bodyRef} value={body} onFocus={() => { lastField.current = 'body' }}
                    onChange={(e) => setBody(e.target.value)} rows={9} className={field} />
                </label>
                <details className="rounded-2xl border border-white/10 p-3" open>
                  <summary className="cursor-pointer text-sm font-semibold">Placeholders <span className="font-normal text-slate-400">· click to insert at the cursor; each is replaced per customer</span></summary>
                  <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {PLACEHOLDERS.map((p) => (
                      <li key={p.key}>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(p.key)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-left text-sm hover:bg-white/10">
                          <code className="text-glow-300">{`{${p.key}}`}</code>
                          <span className="truncate text-slate-400">{p.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={skipSent} onChange={(e) => setSkipSent(e.target.checked)} />
                  Skip people already sent “{label}” this season ({withEmail.length - withEmail.filter((x) => !sentKey(x)).length})
                </label>
                <p className="text-sm text-slate-400">
                  {pending.length} to send{rows.length > withEmail.length && ` · ${rows.length - withEmail.length} in this list have no email`}.
                  Each opens as its own Gmail draft from info@; you press Send in Gmail, then Next here.
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
                {missingPlaceholders(subject + body, c, season).length > 0 && (
                  <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
                    ⚠ No {missingPlaceholders(subject + body, c, season).join(', ')} on file for {c.firstName || 'this customer'}: that part will be blank. Edit the draft in Gmail, or Skip.
                  </p>
                )}
                <div className="rounded-2xl bg-night-950 p-4">
                  <p className="font-semibold">{c.fullName}</p>
                  <p className="text-sm text-slate-400">{c.email}</p>
                  <p className="mt-3 text-sm font-semibold">{fill(subject, c)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{fill(body, c)}</p>
                </div>
                <a href={gmailUrl({ to: c.email, subject: fill(subject, c), body: fill(body, c) })} target="_blank" rel="noreferrer"
                  className="block w-full rounded-full bg-white py-3 text-center font-semibold text-night-950">
                  Open in Gmail → press Send there
                </a>
                <div className="flex gap-2">
                  <button type="button" onClick={() => next(false)} className="flex-1 rounded-full border border-white/20 py-3 font-semibold">Skip</button>
                  <button type="button" onClick={() => next(true)} className="flex-1 rounded-full bg-glow-400 py-3 font-semibold text-night-950">Sent ✓ Next</button>
                </div>
              </>
            )}

            {step === 'done' && (
              <div className="space-y-3 py-6 text-center">
                <p className="text-lg font-semibold">{queue.length ? `Done: ${sentCount} sent.` : 'Everyone here already got this one.'}</p>
                <p className="text-sm text-slate-400">Each customer shows when “{label}” was sent, so this list can be resumed any time without repeats.</p>
                <button type="button" onClick={() => setStep('compose')} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold">Back to templates</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
