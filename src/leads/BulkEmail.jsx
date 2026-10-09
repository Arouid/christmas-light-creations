import { useState } from 'react'
import { todayISO } from '../lib/customers'
import { fillTemplate, gmailUrl, missingPlaceholders } from '../lib/messages'
import { TemplateFields, TemplateSelect } from './EmailParts'
import { useEmailTemplates } from './templatesContext'

// One-to-one emails, back to back: each customer gets their own Gmail draft
// from info@ (better for spam filters than one BCC blast). Sent ones are
// recorded on the customer so the list can be resumed without repeats.
export function EmailQueue({ rows, season, onUpdate, templateId = 'reinstall', onClose, onBack }) {
  const templates = useEmailTemplates()
  const first = templates.find((t) => t.id === templateId) ?? templates[0]
  const [step, setStep] = useState('compose') // compose | send | done
  const [template, setTemplate] = useState(first.id)
  const [subject, setSubject] = useState(first.subject)
  const [body, setBody] = useState(first.body)
  const [skipSent, setSkipSent] = useState(true)
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const fill = (text, c) => fillTemplate(text, c, season)

  const withEmail = rows.filter((c) => c.email?.includes('@'))
  const sentKey = (c) => c.seasons?.[season]?.emailsSent?.[template]
  const pending = withEmail.filter((c) => !(skipSent && sentKey(c)))
  const label = templates.find((t) => t.id === template)?.label ?? 'Email'

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

  const c = queue[index]
  const missing = c ? missingPlaceholders(subject + body, c, season) : []

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Email customers">
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">Email one by one</h2>
          <div className="flex gap-2">
            {onBack && step === 'compose' && <button type="button" onClick={onBack} className="rounded-full bg-white/10 px-4 py-2 text-sm">← People</button>}
            <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 text-sm">Close</button>
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
              Skip people already sent “{label}” this season ({withEmail.length - withEmail.filter((x) => !sentKey(x)).length})
            </label>
            <p className="text-sm text-slate-400">
              {pending.length} to send{rows.length > withEmail.length && ` · ${rows.length - withEmail.length} picked have no email`}.
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
            {missing.length > 0 && (
              <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
                ⚠ No {missing.join(', ')} on file for {c.firstName || 'this customer'}: that part will be blank. Edit the draft in Gmail, or Skip.
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
