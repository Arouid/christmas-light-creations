import { useState } from 'react'
import { TEMPLATES, gmailUrl } from '../lib/messages'

const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'

// One Gmail draft from info@ with everyone in BCC (they can't see each
// other's addresses). Same text for all, so templates greet generically.
export default function BulkEmail({ rows, season }) {
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState('reinstall')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [copied, setCopied] = useState(false)

  const emails = [...new Set(rows.map((c) => c.email?.trim().toLowerCase()).filter((e) => e && e.includes('@')))]
  const missing = rows.length - rows.filter((c) => c.email?.includes('@')).length

  function pick(key) {
    setTemplate(key)
    setSubject(TEMPLATES[key].subject(season))
    setBody(TEMPLATES[key].body({}, season))
  }

  function start() {
    pick(template)
    setOpen(true)
  }

  // Very long address lists can be too much for a link; then they're pasted instead.
  const bcc = emails.join(',')
  const tooLong = bcc.length > 6000
  async function copy() {
    await navigator.clipboard.writeText(emails.join(', '))
    setCopied(true)
  }

  if (!emails.length) return null

  return (
    <>
      <button type="button" onClick={start} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">
        ✉ Email these {emails.length}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Email customers">
          <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
            <h2 className="font-display text-2xl font-extrabold">Email {emails.length} customers</h2>
            <p className="text-sm text-slate-400">
              Opens a Gmail draft from info@ with everyone in <strong>BCC</strong>, so nobody sees the others’ addresses. Check it, then press Send.
              {missing > 0 && ` ${missing} in this list have no email address.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TEMPLATES).map(([k, t]) => (
                <button key={k} type="button" onClick={() => pick(k)}
                  className={`rounded-full px-3 py-1.5 text-sm ${template === k ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>{t.label}</button>
              ))}
            </div>
            <label className="block text-sm text-slate-400">Subject
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
            </label>
            <label className="block text-sm text-slate-400">Message
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className={field} />
            </label>
            {tooLong && <p className="text-sm text-glow-300">This list is long: copy the addresses, then paste them into the draft’s Bcc line.</p>}
            <div className="flex flex-wrap gap-2">
              <a href={gmailUrl({ bcc: tooLong ? '' : bcc, subject, body })} target="_blank" rel="noreferrer"
                className="flex-1 rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950">Open Gmail draft</a>
              <button type="button" onClick={copy} className="flex-1 rounded-full border border-white/20 py-3 font-semibold">
                {copied ? 'Addresses copied ✓' : `Copy ${emails.length} addresses`}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="w-full py-2 text-sm text-slate-400">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
