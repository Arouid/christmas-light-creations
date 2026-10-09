import { useState } from 'react'
import { todayISO } from '../lib/customers'
import { TEMPLATES, gmailUrl } from '../lib/messages'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'
const fill = (text, c) => text.replaceAll('{first}', c.firstName || 'there')

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
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
                </label>
                <label className="block text-sm text-slate-400">Message <span className="text-slate-500">({'{first}'} becomes each customer’s first name)</span>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className={field} />
                </label>
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
