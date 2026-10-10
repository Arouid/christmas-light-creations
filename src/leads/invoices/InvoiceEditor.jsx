import { useState } from 'react'
import { business } from '../../data/content'
import { todayISO } from '../../lib/customers'
import {
  KINDS, KIND_LABEL, OFFLINE_METHODS, STATE_LABEL, TERMS_LABEL, invoiceCents, invoiceState, line, longDate, money, paidInfo, sendProblems, toCents,
} from '../../lib/invoices'
import InvoiceDocument from '../../invoices/InvoiceDocument.jsx'
import { TextButton } from '../Reach'
import { STATE_STYLE, invoiceLink, previewLink, useInvoicesContext } from './useInvoices'

const BIZ = { name: business.name, phone: business.phone, email: 'info@christmas-light-creations.com', logo: business.logo }
const box = 'rounded-xl border border-white/15 bg-night-950 px-3 py-2.5 text-base text-slate-100' // no width: callers add one
const field = `mt-1 block w-full ${box}`
const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40'
const primary = 'min-h-11 rounded-full bg-glow-400 px-5 py-2.5 text-sm font-semibold text-night-950 hover:bg-glow-300 disabled:opacity-40'
const msDay = (ms) => (Number(ms) ? new Date(Number(ms)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')
const tsMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds != null ? t.seconds * 1000 : t ? Date.parse(t) : NaN)
const EDITS = ['customer', 'season', 'kind', 'items', 'note', 'terms', 'dueDate']
const seasons = () => { const y = new Date().getFullYear(); return [y + 1, y, y - 1, y - 2].map(String) }

// What went out to the customer, from the server's log on the invoice.
const SENT_LABEL = (k) => (k === 'invoice' ? 'Invoice emailed' : k.startsWith('again_') ? 'Emailed again' : k.startsWith('reminder_') ? `Reminder (${k.slice(9)} days late)` : k.startsWith('receipt_') ? 'Receipt emailed' : k)
function SentLog({ inv }) {
  const rows = Object.entries(inv.sent ?? {}).sort(([, a], [, b]) => (a?.at ?? 0) - (b?.at ?? 0))
  const viewed = tsMs(inv.viewedAt)
  if (!rows.length && !Number.isFinite(viewed)) return null
  return (
    <ul className="space-y-1 text-sm text-slate-400">
      {rows.map(([k, x]) => (
        <li key={k} className={x?.failed ? 'text-berry-500' : ''}>{SENT_LABEL(k)} {msDay(x?.at)}{x?.to ? ` to ${x.to}` : ''}{x?.failed ? ` · didn’t go out (${x.failed}). Text them the link.` : x?.to ? ' ✓' : ' · sending…'}</li>
      ))}
      {Number.isFinite(viewed) && <li>Opened by the customer {msDay(viewed)}</li>}
    </ul>
  )
}

function MarkPaid({ onSave, onCancel }) {
  const [method, setMethod] = useState('Check')
  const [date, setDate] = useState(todayISO)
  const [note, setNote] = useState('')
  return (
    <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="font-semibold">Mark paid (money taken outside the website)</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-slate-400">How<select value={method} onChange={(e) => setMethod(e.target.value)} className={field}>{OFFLINE_METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="block text-sm text-slate-400">When<input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        <label className="block text-sm text-slate-400">Note (check #…)<input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={field} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!date} onClick={() => onSave({ method, date, note: note.trim() })} className={primary}>Mark paid</button>
        <button type="button" onClick={onCancel} className={btn}>Cancel</button>
      </div>
      <p className="text-xs text-slate-400">The customer gets a receipt, and their season billing is filled in (empty boxes only).</p>
    </div>
  )
}

// One invoice: write it, send it, then follow it (emails, opened, paid).
// `token` null = new (created on first Save draft / Send).
export default function InvoiceEditor({ token: startToken, invoice, onClose }) {
  const ctx = useInvoicesContext()
  const [token, setToken] = useState(startToken)
  const [d, setD] = useState(invoice)
  const [texts, setTexts] = useState(() => Object.fromEntries((invoice.items ?? []).map((i) => [i.id, i.cents ? (i.cents / 100).toFixed(2) : ''])))
  const [busy, setBusy] = useState(null)
  const [preview, setPreview] = useState(false)
  const [paying, setPaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const live = (token && ctx.invoices?.find((i) => i.id === token)) || { ...invoice, ...d }
  const status = live.status ?? 'draft'
  const today = todayISO()
  const state = invoiceState(live, today)
  const editable = status === 'draft' || status === 'open'
  // Staff's unsaved edits over the stored invoice (never its status, number or payments).
  const shown = editable ? { ...live, ...Object.fromEntries(EDITS.map((k) => [k, d[k]])) } : live
  const total = invoiceCents(shown)
  const problems = sendProblems(shown)
  const paid = paidInfo(live)
  const link = token ? invoiceLink(token) : ''
  const first = (shown.customer?.name ?? '').split(' ')[0] || 'there'
  const textMsg = status === 'paid'
    ? `Hi ${first}, thank you for your payment! Your receipt for invoice ${live.number}: ${link}`
    : `Hi ${first}, here's your invoice ${live.number || ''} from ${business.name} for ${money(total)}. You can pay it online here (PayPal, Venmo or card): ${link}`

  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const setCustomer = (patch) => set({ customer: { ...d.customer, ...patch } })
  const setItem = (id, patch) => set({ items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const setAmount = (id, text) => { setTexts((t) => ({ ...t, [id]: text })); setItem(id, { cents: toCents(text) ?? 0 }) }
  const addLine = () => { const l = line(); setTexts((t) => ({ ...t, [l.id]: '' })); set({ items: [...d.items, l] }) }
  const removeLine = (id) => set({ items: d.items.filter((i) => i.id !== id) })

  async function run(label, fn) {
    setBusy(label)
    try { await fn() } catch (e) { setBusy(`Couldn’t save: ${e.message}`); return false }
    setBusy(null)
    return true
  }
  const ensure = async () => { if (token) { await ctx.save(token, d); return token } const t = await ctx.create(d); setToken(t); return t }
  const saveDraft = () => run('Saving…', ensure)
  const send = () => window.confirm(`Send invoice for ${money(total)} to ${d.customer?.name}?${d.customer?.email ? `\n\nIt will be emailed to ${d.customer.email}.` : '\n\nNo email on file: text them the link after.'}`)
    && run('Sending…', async () => { const t = await ensure(); await ctx.send(t, d) })
  const saveChanges = () => run('Saving…', () => ctx.save(token, d))
  const again = () => run('Emailing…', async () => { await ctx.save(token, d); await ctx.emailAgain(token) })
  const voidIt = () => window.confirm('Void this invoice? Its link will say it’s cancelled and reminders stop. It keeps its number.') && run('Saving…', () => ctx.voidIt(token))
  const remove = () => window.confirm('Delete this draft for good?') && run('Deleting…', async () => { if (token) await ctx.remove(token); onClose() })
  const markPaid = (p) => run('Saving…', async () => { await ctx.markPaid(token, p); setPaying(false) })
  const undo = () => window.confirm('Undo “Mark paid”? The invoice goes back to unpaid. Season billing boxes already filled stay as they are (fix them in Edit details if needed).') && run('Saving…', () => ctx.undoPaid(token))
  async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* select instead */ } }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/95 p-3 backdrop-blur sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice">
      <div className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold">{live.number ? `Invoice ${live.number}` : status !== 'draft' ? 'Invoice' : token ? 'Invoice (draft)' : 'New invoice'}</h2>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[state]}`}>{STATE_LABEL[state]}</span>
            <button type="button" onClick={() => setPreview((v) => !v)} className={btn}>{preview ? 'Edit' : 'Preview'}</button>
            <button type="button" onClick={onClose} className={btn}>Close</button>
          </div>
        </div>
        {busy && <p className="text-sm text-glow-300" role="status">{busy}</p>}
        {status === 'open' && !live.number && <p className="text-sm text-slate-400">Sent. The number and the email come from the server in a few seconds…</p>}

        {preview ? <InvoiceDocument invoice={{ ...shown, number: live.number }} business={BIZ} today={today} /> : (
          <>
            <fieldset disabled={!editable} className="min-w-0 space-y-4 disabled:opacity-80">
              <details className="rounded-2xl border border-white/10 p-3" open={!d.customer?.email}>
                <summary className="cursor-pointer text-sm"><span className="font-semibold">Bill to:</span> {d.customer?.name}{d.customer?.email ? ` · ${d.customer.email}` : ' · no email'}</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-slate-400">Name<input value={d.customer?.name ?? ''} onChange={(e) => setCustomer({ name: e.target.value })} className={field} /></label>
                  <label className="block text-sm text-slate-400">Email (the invoice goes here)<input type="email" inputMode="email" value={d.customer?.email ?? ''} onChange={(e) => setCustomer({ email: e.target.value.trim() })} className={field} /></label>
                  <label className="block text-sm text-slate-400 sm:col-span-2">Address<input value={d.customer?.address ?? ''} onChange={(e) => setCustomer({ address: e.target.value })} className={field} /></label>
                </div>
              </details>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm text-slate-400">For<select value={d.kind} onChange={(e) => set({ kind: e.target.value })} className={field}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
                <label className="block text-sm text-slate-400">Season<select value={d.season} onChange={(e) => set({ season: e.target.value })} className={field}>{[...new Set([d.season, ...seasons()])].filter(Boolean).map((y) => <option key={y}>{y}</option>)}</select></label>
                {status === 'draft' ? (
                  <label className="block text-sm text-slate-400">Due
                    <select value={d.terms ?? 'receipt'} onChange={(e) => set({ terms: e.target.value })} className={field}>
                      {Object.entries(TERMS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="block text-sm text-slate-400">Due date<input type="date" value={d.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value, terms: 'date' })} className={field} /></label>
                )}
              </div>
              {status === 'draft' && d.terms === 'date' && (
                <label className="block text-sm text-slate-400">Due date<input type="date" value={d.dueDate ?? ''} min={today} onChange={(e) => set({ dueDate: e.target.value })} className={field} /></label>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Lines</p>
                {d.items.map((i) => (
                  <div key={i.id} className="flex items-start gap-2">
                    <input value={i.description} onChange={(e) => setItem(i.id, { description: e.target.value })} placeholder="What it’s for" aria-label="Description" className={`${box} min-w-0 flex-1`} />
                    <input value={texts[i.id] ?? ''} onChange={(e) => setAmount(i.id, e.target.value)} inputMode="decimal" placeholder="$0.00" aria-label="Amount" className={`${box} w-24 shrink-0 text-right tabular-nums sm:w-32`} />
                    {d.items.length > 1 && <button type="button" onClick={() => removeLine(i.id)} aria-label="Remove line" className="min-h-11 shrink-0 px-2 text-slate-400">✕</button>}
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <button type="button" onClick={addLine} className={btn}>＋ Add line</button>
                  <p className="font-semibold tabular-nums">Total {money(total)}</p>
                </div>
                <p className="text-xs text-slate-400">A discount is a line with a minus amount (e.g. −45).</p>
              </div>
              <label className="block text-sm text-slate-400">Note to the customer (optional)<textarea rows={2} maxLength={2000} value={d.note ?? ''} onChange={(e) => set({ note: e.target.value })} className={field} /></label>
            </fieldset>
          </>
        )}

        {editable && problems.length > 0 && <ul className="list-inside list-disc text-sm text-glow-300">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}

        {status === 'draft' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={!!problems.length || !!busy} className={primary}>Send to customer</button>
            <button type="button" onClick={saveDraft} disabled={!!busy} className={btn}>Save draft</button>
            <button type="button" onClick={remove} className={`${btn} text-berry-500`}>Delete draft</button>
          </div>
        )}

        {status !== 'draft' && token && (
          <div className="space-y-3 rounded-2xl border border-white/10 p-4">
            {paid && (
              <p className="font-semibold text-emerald-300">Paid ✓ {money(paid.cents ?? total)} by {paid.method}{paid.date ? `, ${longDate(paid.date)}` : ''}{paid.sandbox ? ' (test)' : ''}{paid.note ? ` · ${paid.note}` : ''}{live.offline?.by ? ` · marked by ${live.offline.by}` : ''}</p>
            )}
            {state === 'overdue' && <p className="font-semibold text-berry-500">Overdue since {longDate(live.dueDate)}.</p>}
            {status === 'open' && <p className="text-sm text-slate-400">Due {live.dueDate ? longDate(live.dueDate) : 'on receipt'}. Changes show on the customer’s link right away; press Email again if they should get a new email.</p>}
            <SentLog inv={live} />
            <div className="flex flex-wrap gap-2">
              <TextButton phone={live.customer?.phone} message={textMsg} label="Text it" className={btn} />
              <button type="button" onClick={copy} className={btn}>{copied ? 'Copied ✓' : 'Copy link'}</button>
              <a href={previewLink(token)} target="_blank" rel="noreferrer" className={`${btn} inline-flex items-center`}>Customer’s page</a>
              {status === 'open' && live.customer?.email && <button type="button" onClick={again} disabled={!!busy} className={btn}>Email again</button>}
            </div>
            {status === 'open' && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={saveChanges} disabled={!!busy || !!problems.length} className={btn}>Save changes</button>
                  {!paying && <button type="button" onClick={() => setPaying(true)} className={btn}>Mark paid…</button>}
                  <button type="button" onClick={voidIt} className={`${btn} text-berry-500`}>Void</button>
                </div>
                {paying && <MarkPaid onSave={markPaid} onCancel={() => setPaying(false)} />}
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={!live.remindersOff} onChange={(e) => run('Saving…', () => ctx.setReminders(token, e.target.checked))} className="size-5" />
                  Email reminders 7 and 14 days after the due date
                </label>
              </>
            )}
            {status === 'paid' && live.offline && !live.payment && <button type="button" onClick={undo} className={btn}>Undo “Mark paid”</button>}
          </div>
        )}
      </div>
    </div>
  )
}
