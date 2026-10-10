import { useMemo, useState } from 'react'
import { bulkCandidates, money, newInvoice } from '../../lib/invoices'
import { useInvoicesContext } from './useInvoices'

// Season tab → "🧾 Invoice these N": one DRAFT per ticked customer (owner
// 2026-10-09: drafts to review, then "Send all drafts" on the Invoices tab).
export default function BulkInvoices({ customers, season, mode, className }) {
  const ctx = useInvoicesContext()
  const [open, setOpen] = useState(false)
  if (!ctx?.invoices || !customers.length) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>🧾 Invoice these {customers.length}</button>
      {open && <BulkDialog customers={customers} season={season} kind={mode === 'takedown' ? 'takedown' : 'install'} onClose={() => setOpen(false)} />}
    </>
  )
}

function BulkDialog({ customers, season, kind, onClose }) {
  const ctx = useInvoicesContext()
  const rows = useMemo(() => bulkCandidates({ customers, season, kind, invoices: ctx.invoices }), [customers, season, kind]) // eslint-disable-line react-hooks/exhaustive-deps -- a snapshot when opened
  const [picked, setPicked] = useState(() => new Set(rows.filter((r) => r.pick).map((r) => r.customer.id)))
  const [busy, setBusy] = useState(null)
  const chosen = rows.filter((r) => picked.has(r.customer.id) && r.cents > 0)
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function create() {
    for (const [i, r] of chosen.entries()) {
      setBusy(`Creating ${i + 1} of ${chosen.length}…`)
      try {
        await ctx.create(newInvoice(r.customer, { season, kind, items: r.items }))
      } catch (e) {
        setBusy(`Stopped at ${r.customer.fullName}: ${e.message}`)
        return
      }
    }
    setBusy(`done:${chosen.length}`)
  }

  const done = busy?.startsWith('done:')
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/95 p-3 backdrop-blur sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice these customers">
      <div className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-night-900 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-extrabold">{kind === 'takedown' ? 'Takedown' : 'Re-install'} invoices, {season}</h2>
            <p className="text-sm text-slate-400">Makes a <strong>draft</strong> for each ticked customer. Nothing is sent until you press <strong>Send all drafts</strong> on the Invoices tab.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-full bg-white/10 px-4 text-sm font-semibold">Close</button>
        </div>
        {done ? (
          <div className="space-y-3 rounded-2xl bg-emerald-500/10 p-4">
            <p className="font-semibold text-emerald-300">{busy.slice(5)} draft{busy.slice(5) === '1' ? '' : 's'} made ✓</p>
            <p className="text-sm text-slate-300">Check them on the Invoices tab (Drafts), fix any amount, then <strong>Send all drafts</strong>.</p>
            <a href="#invoices" onClick={onClose} className="inline-flex min-h-11 items-center rounded-full bg-glow-400 px-5 font-semibold text-night-950">Open Invoices → Drafts</a>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
              {rows.map((r) => (
                <li key={r.customer.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2">
                    <input type="checkbox" checked={picked.has(r.customer.id)} disabled={!r.cents} onChange={() => toggle(r.customer.id)} className="mt-1 size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{r.customer.fullName}</span>
                      {r.items.length > 0 && <span className="block text-sm text-slate-400">{r.items.map((i) => `${i.description} ${money(i.cents)}`).join(' · ')}</span>}
                      {r.reason && <span className="block text-sm text-glow-300">{r.reason}</span>}
                      {r.flag && <span className="block text-sm text-slate-400">{r.flag}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums">{r.cents ? money(r.cents) : '—'}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-400">Amounts: the season’s Total due (with its discount), else its Rate, else the yearly price from 💲 Yearly price & add-ons. Unticked ones say why; tick them anyway if you want.</p>
            {busy && <p className="text-sm text-glow-300" role="status">{busy}</p>}
            <button type="button" onClick={create} disabled={!chosen.length || !!busy}
              className="min-h-11 w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-40">
              Make {chosen.length} draft{chosen.length === 1 ? '' : 's'} ({money(chosen.reduce((t, r) => t + r.cents, 0))})
            </button>
          </>
        )}
      </div>
    </div>
  )
}
