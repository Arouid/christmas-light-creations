import { useState } from 'react'
import { fillTemplate, gmailUrl, missingPlaceholders } from '../lib/messages'
import { TemplateFields, TemplateSelect } from './EmailParts'
import { pill } from './Reach'
import { useEmailTemplates } from './templatesContext'

// Email one person from a template: pick it, it's filled in for them, edit if
// needed, then open it as a Gmail draft from info@. `person` is a customer
// (or a lead mapped to customer fields).
export default function ComposeEmail({ person, season, start = 'custom', label = 'Email', className = pill, onSent }) {
  const templates = useEmailTemplates()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(start)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [missing, setMissing] = useState([])
  if (!person?.email) return null

  function pick(next) {
    const t = templates.find((x) => x.id === next) ?? templates[0]
    setId(t.id)
    setSubject(fillTemplate(t.subject, person, season))
    setBody(fillTemplate(t.body, person, season))
    setMissing(missingPlaceholders(t.subject + t.body, person, season))
  }

  const when = templates.find((t) => t.id === id)?.when
  return (
    <>
      <button type="button" className={className} onClick={(e) => { e.stopPropagation(); pick(start); setOpen(true) }}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={`Email ${person.fullName ?? ''}`}
          onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl font-extrabold">Email {person.firstName || person.fullName}</h2>
                <p className="truncate text-sm text-slate-400">{person.email}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/10 px-4 py-2 text-sm">Close</button>
            </div>
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
            <a href={gmailUrl({ to: person.email, subject, body })} target="_blank" rel="noreferrer"
              onClick={() => { onSent?.(id); setOpen(false) }}
              className="block w-full rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950">
              Open in Gmail (info@) → press Send there
            </a>
          </div>
        </div>
      )}
    </>
  )
}
