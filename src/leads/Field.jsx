import { useState } from 'react'
import { withOption } from '../lib/customers'

const input = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base focus:border-glow-400 focus:outline-none'

// Edit-in-place: text saves when the field loses focus, dropdowns save on change.
export default function Field({ label, value, onSave, options, blankLabel = '—', rows, inputMode, className = '' }) {
  const current = value ?? ''
  const [draft, setDraft] = useState(current)
  const [seen, setSeen] = useState(current)
  const [state, setState] = useState('idle') // idle | saving | saved | error

  // Another staff member changed it: show their value.
  if (current !== seen) {
    setSeen(current)
    setDraft(current)
  }

  async function commit(next) {
    if (next === current) return
    setState('saving')
    try {
      await onSave(next)
      setState('saved')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      setState('error')
    }
  }

  const status = {
    saving: <span className="text-slate-500">Saving…</span>,
    saved: <span className="text-emerald-400">Saved ✓</span>,
    error: <span className="text-berry-500">Not saved, try again</span>,
  }[state]

  return (
    <label className={`block text-sm text-slate-400 ${className}`}>
      <span className="flex items-center justify-between gap-2">{label}{status}</span>
      {options ? (
        <select value={draft} className={input}
          onChange={(e) => { setDraft(e.target.value); commit(e.target.value) }}>
          {withOption(options, draft).map((o) => <option key={o} value={o}>{o || blankLabel}</option>)}
        </select>
      ) : rows ? (
        <textarea value={draft} rows={rows} className={`${input} text-slate-100`}
          onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(draft)} />
      ) : (
        <input value={draft} inputMode={inputMode} className={`${input} text-slate-100`}
          onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(draft.trim())}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
      )}
    </label>
  )
}
