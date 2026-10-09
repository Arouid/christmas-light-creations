import { useState } from 'react'
import { TEMPLATE_GROUPS, isStock } from '../lib/emailTemplates'
import { EmailQueue } from './BulkEmail'
import { TemplateFields, field } from './EmailParts'
import RecipientPicker from './RecipientPicker'
import { useEmailTemplates } from './templatesContext'

const btn = 'rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium hover:bg-white/15'

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } catch { /* clipboard blocked: text is still selectable */ }
  }
  return <button type="button" onClick={copy} className={btn}>{done ? 'Copied ✓' : label}</button>
}

function Editor({ template, onSave, onCancel }) {
  const [label, setLabel] = useState(template.label ?? '')
  const [when, setWhen] = useState(template.when ?? '')
  const [subject, setSubject] = useState(template.subject ?? '')
  const [body, setBody] = useState(template.body ?? '')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    await onSave({ id: template.id, label: label.trim() || 'Untitled', when: when.trim(), subject, body })
  }
  return (
    <div className="space-y-3">
      <label className="block text-sm text-slate-400">Name
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={field} />
      </label>
      <label className="block text-sm text-slate-400">When to use it
        <input value={when} onChange={(e) => setWhen(e.target.value)} className={field} placeholder="e.g. After a service call" />
      </label>
      <TemplateFields subject={subject} body={body} onSubject={setSubject} onBody={setBody} rows={12} />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={btn}>Cancel</button>
        <button type="button" onClick={save} disabled={busy} className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save for everyone'}
        </button>
      </div>
    </div>
  )
}

// The template library: read, copy, and edit the shared email templates.
// Stock ones can be edited (and reset); added ones can be deleted.
export default function EmailsView({ saved = [], onSave, customers = [], season, onUpdate }) {
  const templates = useEmailTemplates()
  const [editing, setEditing] = useState(null) // template id | 'new'
  const [openId, setOpenId] = useState(null)
  // Send flow: pick a template -> tick people -> one-by-one queue.
  const [sending, setSending] = useState(null) // { template, step: 'pick' | 'queue', people }

  const store = (list) => onSave({ emailTemplates: list })
  async function save(t) {
    const id = t.id ?? `t${Date.now().toString(36)}`
    await store([...saved.filter((x) => x.id !== id), { ...t, id }])
    setEditing(null)
    setOpenId(id)
  }
  async function remove(t) {
    const msg = isStock(t.id) ? `Put “${t.label}” back to the original wording?` : `Delete the template “${t.label}”? (Customers aren’t affected.)`
    if (window.confirm(msg)) await store(saved.filter((x) => x.id !== t.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-400">
          Shared email templates. <strong className="text-slate-200">Send…</strong> lets you tick who gets it, then sends one by one from info@,
          each filled in with that person’s name, date and prices. To email one person, open them and tap <strong className="text-slate-200">Email</strong>.
          Words in {'{braces}'} are placeholders.
        </p>
        <button type="button" onClick={() => setEditing('new')} className="rounded-full bg-glow-400 px-4 py-2 text-sm font-semibold text-night-950">+ New template</button>
      </div>

      {editing === 'new' && (
        <div className="rounded-2xl border border-glow-400/40 bg-night-900 p-4">
          <Editor template={{ body: 'Hi {first},\n\n\n\nThank you,\n{business}\n{businessPhone}' }} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}

      {TEMPLATE_GROUPS.map((g) => {
        const list = templates.filter((t) => t.group === g && t.id !== 'custom')
        if (!list.length) return null
        return (
          <section key={g}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-glow-300">{g}</h2>
            <ul className="grid gap-2 lg:grid-cols-2">
              {list.map((t) => (
                <li key={t.id} className="rounded-2xl border border-white/10 bg-night-900 p-4">
                  {editing === t.id ? (
                    <Editor template={t} onSave={save} onCancel={() => setEditing(null)} />
                  ) : (
                    <>
                      <button type="button" onClick={() => setOpenId(openId === t.id ? null : t.id)} className="w-full text-left">
                        <p className="font-semibold">{t.label}{t.edited && <span className="ml-2 text-xs font-normal text-slate-400">edited</span>}</p>
                        {t.when && <p className="text-sm text-slate-400">{t.when}</p>}
                        <p className="mt-1 truncate text-sm text-slate-300">Subject: {t.subject || '(none)'}</p>
                      </button>
                      {openId === t.id && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-night-950 p-3 text-sm text-slate-300">{t.body}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setSending({ template: t, step: 'pick', people: [] })}
                          className="rounded-full bg-glow-400 px-4 py-2 text-sm font-semibold text-night-950">Send…</button>
                        <button type="button" onClick={() => setOpenId(openId === t.id ? null : t.id)} className={btn}>{openId === t.id ? 'Hide' : 'Read'}</button>
                        <CopyButton text={t.subject} label="Copy subject" />
                        <CopyButton text={t.body} label="Copy message" />
                        <button type="button" onClick={() => setEditing(t.id)} className={btn}>Edit</button>
                        {(t.custom || t.edited) && (
                          <button type="button" onClick={() => remove(t)} className={`${btn} text-slate-400`}>{t.custom ? 'Delete' : 'Reset'}</button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {sending?.step === 'pick' && (
        <RecipientPicker customers={customers} season={season} templateLabel={sending.template.label} initial={sending.people}
          onNext={(people) => setSending({ ...sending, step: 'queue', people })} onClose={() => setSending(null)} />
      )}
      {sending?.step === 'queue' && (
        <EmailQueue rows={sending.people} season={season} onUpdate={onUpdate} templateId={sending.template.id}
          onBack={() => setSending({ ...sending, step: 'pick' })} onClose={() => setSending(null)} />
      )}
    </div>
  )
}
