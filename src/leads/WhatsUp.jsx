import { useState } from 'react'
import { installedFromProposal, installedLine, installedLines, latestSigned, newInstalledItem } from '../lib/jobRecord'
import Field from './Field'
import { useProposals } from './proposals/useProposals'

const input = 'min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-night-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-glow-400 focus:outline-none'
const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15'
const when = (p) => { const t = p.signedAt ?? p.countersignedAt; return t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' }
const same = (a, b) => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
const now = () => Date.now()

// What's installed at this house (docs/specs/job-record.md): one line per
// thing (what, how much, colour, notes) and where the lights are stored.
// Edited in Edit details; saves on blur like the other fields. While the list
// is empty, the signed proposal's items can fill it.
export default function WhatsUpEditor({ customer, user, onUpdate }) {
  const saved = customer.installed ?? []
  const savedKey = JSON.stringify(saved)
  const [rows, setRows] = useState(saved)
  const [seen, setSeen] = useState(savedKey)
  const [state, setState] = useState('idle') // idle | saving | saved | error
  const proposals = useProposals(user, customer.id)
  const signed = latestSigned(proposals)

  // Someone else changed it (or a prefill landed): show the record's list.
  if (savedKey !== seen) {
    setSeen(savedKey)
    setRows(saved)
  }

  async function save(next) {
    const clean = next.filter((r) => String(r.what).trim() || String(r.amount).trim() || String(r.color).trim() || String(r.notes).trim())
    if (same(clean, saved)) return
    setState('saving')
    try {
      await onUpdate(customer.id, 'installed', clean)
      setState('saved')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      setState('error')
    }
  }
  const edit = (id, key, value) => setRows((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  const removeRow = (id) => { const next = rows.filter((r) => r.id !== id); setRows(next); save(next) }
  const addRow = () => setRows((list) => [...list, newInstalledItem()])

  async function prefill() {
    const list = installedFromProposal(signed)
    setRows(list)
    await save(list)
    await onUpdate(customer.id, 'installedFrom', { token: signed.id, at: now() })
  }

  const status = { saving: 'Saving…', saved: 'Saved ✓', error: 'Not saved, try again' }[state]

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2 text-slate-400">
        <span>What’s installed: one line per thing.</span>
        {status && <span className={state === 'error' ? 'text-berry-500' : state === 'saved' ? 'text-emerald-400' : 'text-slate-500'}>{status}</span>}
      </div>
      {rows.length === 0 && signed && (
        <button type="button" onClick={prefill} className={`${btn} border border-glow-400/40 bg-transparent text-glow-300`}>
          📝 Prefill from the signed proposal{when(signed) ? ` (${when(signed)})` : ''}
        </button>
      )}
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-night-950/40 p-2">
              <div className="grid grid-cols-[1fr_5.5rem_2.75rem] gap-2">
                <input value={r.what} onChange={(e) => edit(r.id, 'what', e.target.value)} onBlur={() => save(rows)} placeholder="What (Roofline C9, wrapped oaks, wreath…)" aria-label="What" className={input} />
                <input value={r.amount} onChange={(e) => edit(r.id, 'amount', e.target.value)} onBlur={() => save(rows)} placeholder="180 ft / 2" aria-label="How much" className={input} />
                <button type="button" onClick={() => removeRow(r.id)} className="min-h-11 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10" aria-label={`Remove ${installedLine(r) || 'this line'}`}>✕</button>
              </div>
              <div className="mt-2 grid grid-cols-[8rem_1fr] gap-2">
                <input value={r.color} onChange={(e) => edit(r.id, 'color', e.target.value)} onBlur={() => save(rows)} placeholder="Colour" aria-label="Colour" className={input} />
                <input value={r.notes} onChange={(e) => edit(r.id, 'notes', e.target.value)} onBlur={() => save(rows)} placeholder="Notes (clips, timer, where the plug is…)" aria-label="Notes" className={input} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={addRow} className={btn}>＋ Add a line</button>
      <Field label="Lights stored (where at their house, how many boxes)" value={customer.lightsStored} rows={2}
        onSave={(v) => onUpdate(customer.id, 'lightsStored', v)} />
    </div>
  )
}

// Read-only, for the Accounts page: the lines and where the lights are.
export function WhatsUpSummary({ customer, onEdit }) {
  const lines = installedLines(customer)
  const stored = String(customer.lightsStored ?? '').trim()
  return (
    <div className="space-y-2 text-sm">
      {lines.length
        ? <ul className="list-disc space-y-0.5 pl-5 text-slate-200">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        : <p className="text-slate-400">Nothing recorded yet. After the install, list what went up (or prefill it from their signed proposal in Edit details).</p>}
      {stored && <p className="text-slate-300"><span className="text-slate-400">Lights stored:</span> {stored}</p>}
      {onEdit && <button type="button" onClick={onEdit} className={btn}>Edit in details</button>}
    </div>
  )
}
