import { useState } from 'react'
import { fillTemplate, gmailUrl, missingPlaceholders } from '../lib/messages'
import { TemplateFields, TemplateSelect, field } from './EmailParts'
import { pill } from './Reach'
import { emailsOnRecord, sendEmail } from './sendEmail'
import { useStaff } from './staffContext'
import { useEmailTemplates } from './templatesContext'

// Email one person from a template: pick it, it's filled in for them, edit if
// needed, then Send from info@ without leaving the app (filed in their
// history), or open it as a Gmail draft instead. `person` is a customer (or a
// lead / past request mapped to customer fields); `target` says whose history
// it goes in: { customerId } | { leadId } | { pastRequestId }.
export default function ComposeEmail({ person, season, target, start = 'custom', label = 'Email', className = pill, onSent }) {
  const templates = useEmailTemplates()
  const { user } = useStaff()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(start)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [missing, setMissing] = useState([])
  const [status, setStatus] = useState({ step: 'edit' }) // edit | sending | sent | error
  if (!person?.email) return null
  const addresses = emailsOnRecord(person)

  function pick(next) {
    const t = templates.find((x) => x.id === next) ?? templates[0]
    setId(t.id)
    setSubject(fillTemplate(t.subject, person, season))
    setBody(fillTemplate(t.body, person, season))
    setMissing(missingPlaceholders(t.subject + t.body, person, season))
  }

  function openBox(e) {
    e.stopPropagation()
    pick(start)
    setTo(addresses[0] ?? person.email)
    setStatus({ step: 'edit' })
    setOpen(true)
  }

  async function send() {
    setStatus({ step: 'sending' })
    try {
      await sendEmail(user, { to, subject, text: body, target, template: id })
      setStatus({ step: 'sent' })
      onSent?.(id)
    } catch (err) {
      setStatus({ step: 'error', message: err.message })
    }
  }

  const when = templates.find((t) => t.id === id)?.when
  const canSend = Boolean(target) && addresses.length > 0
  const sending = status.step === 'sending'
  const gmail = (
    <a href={gmailUrl({ to: canSend ? to : person.email, subject, body })} target="_blank" rel="noreferrer"
      onClick={() => { onSent?.(id); setOpen(false) }}
      className={canSend
        ? 'block w-full rounded-full border border-white/20 py-3 text-center text-sm font-semibold text-slate-200'
        : 'block w-full rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950'}>
      {canSend ? 'Open in Gmail instead' : 'Open in Gmail (info@) → press Send there'}
    </a>
  )
  return (
    <>
      <button type="button" className={className} onClick={openBox}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={`Email ${person.fullName ?? ''}`}
          onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate font-display text-2xl font-extrabold">Email {person.firstName || person.fullName}</h2>
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full bg-white/10 px-4 py-2.5 text-sm">Close</button>
            </div>

            {status.step === 'sent' ? (
              <div className="space-y-4 py-4 text-center">
                <p className="text-lg font-semibold text-emerald-300">✓ Sent from info@</p>
                <p className="break-words text-sm text-slate-300">To {to}. It’s in their Text &amp; email history, and their reply will come to info@.</p>
                <button type="button" onClick={() => setOpen(false)} className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950">Done</button>
              </div>
            ) : (
              <>
                <label className="block text-sm text-slate-400">To
                  {addresses.length > 1 ? (
                    <select value={to} onChange={(e) => setTo(e.target.value)} className={field} disabled={sending}>
                      {addresses.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : <span className="mt-1 block break-all text-base text-slate-100">{to}</span>}
                </label>
                <label className="block text-sm text-slate-400">Template
                  <TemplateSelect value={id} onChange={pick} />
                </label>
                {when && <p className="-mt-2 text-sm text-slate-400">When: {when}</p>}
                {missing.length > 0 && (
                  <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
                    ⚠ No {missing.join(', ')} on file, so that part is blank below. Type it in, or fill it on the customer first.
                  </p>
                )}
                <TemplateFields subject={subject} body={body} onSubject={setSubject} onBody={setBody} showKey={false} />
                {status.step === 'error' && <p role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">{status.message}</p>}
                {canSend && (
                  <button type="button" onClick={send} disabled={sending || !subject.trim() || !body.trim()}
                    className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-50">
                    {sending ? 'Sending…' : status.step === 'error' ? 'Try again' : 'Send from info@'}
                  </button>
                )}
                {gmail}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
