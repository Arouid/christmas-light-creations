import { useRef } from 'react'
import { TEMPLATE_GROUPS } from '../lib/emailTemplates'
import { PLACEHOLDERS } from '../lib/messages'
import { useEmailTemplates } from './templatesContext'

export const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100'

// Dropdown of all templates, grouped like the Emails tab.
export function TemplateSelect({ value, onChange, className = field }) {
  const templates = useEmailTemplates()
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label="Template">
      {TEMPLATE_GROUPS.map((g) => {
        const list = templates.filter((t) => t.group === g)
        return list.length ? (
          <optgroup key={g} label={g}>
            {list.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
        ) : null
      })}
    </select>
  )
}

// Subject + message fields with the clickable placeholder key, which inserts
// {key} where the cursor was.
export function TemplateFields({ subject, body, onSubject, onBody, rows = 10, showKey = true }) {
  const subjectRef = useRef(null)
  const bodyRef = useRef(null)
  const last = useRef('body')

  function insert(key) {
    const [el, value, set] = last.current === 'subject' ? [subjectRef.current, subject, onSubject] : [bodyRef.current, body, onBody]
    const at = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? at
    set(value.slice(0, at) + `{${key}}` + value.slice(end))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + key.length + 2, at + key.length + 2) })
  }

  return (
    <>
      <label className="block text-sm text-slate-400">Subject
        <input ref={subjectRef} value={subject} onFocus={() => { last.current = 'subject' }} onChange={(e) => onSubject(e.target.value)} className={field} />
      </label>
      <label className="block text-sm text-slate-400">Message
        <textarea ref={bodyRef} value={body} onFocus={() => { last.current = 'body' }} onChange={(e) => onBody(e.target.value)} rows={rows} className={field} />
      </label>
      {showKey && (
        <details className="rounded-2xl border border-white/10 p-3">
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
      )}
    </>
  )
}
