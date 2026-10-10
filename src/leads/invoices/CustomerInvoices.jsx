import { useState } from 'react'
import { seasonYear, todayISO } from '../../lib/customers'
import { KIND_SHORT, STATE_LABEL, invoiceCents, invoiceState, money, newInvoice } from '../../lib/invoices'
import InvoiceEditor from './InvoiceEditor'
import { STATE_STYLE, numberLabel, useInvoicesContext } from './useInvoices'

// "🧾 Invoices" on a customer's page (Accounts and the customer panel): their
// invoices, newest first, and ＋ New invoice (no proposal needed).
export default function CustomerInvoices({ customer }) {
  const ctx = useInvoicesContext()
  const [open, setOpen] = useState(null) // { token, invoice }
  if (!ctx) return null
  if (ctx.error) return <p className="text-sm text-slate-400">Invoices aren’t available yet (the database rules need publishing).</p>
  const mine = (ctx.invoices ?? []).filter((i) => i.customerId === customer.id)
  const today = todayISO()
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setOpen({ token: null, invoice: newInvoice(customer, { season: seasonYear() }) })}
        className="min-h-11 w-full rounded-xl bg-glow-400 py-2.5 font-semibold text-night-950 hover:bg-glow-300">＋ New invoice</button>
      {mine.length > 0 ? (
        <ul className="divide-y divide-white/5">
          {mine.map((i) => {
            const s = invoiceState(i, today)
            return (
              <li key={i.id}>
                <button type="button" onClick={() => setOpen({ token: i.id, invoice: i })} className="flex min-h-11 w-full items-center gap-3 py-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{numberLabel(i)} ·{KIND_SHORT[i.kind] ?? ''} {i.season}</span>
                    <span className="block truncate text-sm text-slate-400">{(i.items ?? []).map((x) => x.description).filter(Boolean).join(', ')}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{money(invoiceCents(i))}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[s]}`}>{STATE_LABEL[s]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : <p className="text-sm text-slate-400">No invoices yet.</p>}
      {open && <InvoiceEditor token={open.token} invoice={open.invoice} onClose={() => setOpen(null)} />}
    </div>
  )
}
