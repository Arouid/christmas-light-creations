import { KIND_SHORT, STATE_LABEL, invoiceCents, invoiceState, longDate, money, paidInfo } from '../lib/invoices'
import { todayISO } from '../lib/customers'

const STATE_CLASS = { draft: 'bg-white/10', open: 'bg-glow-400/20 text-glow-300', overdue: 'bg-berry-600/30 text-berry-500', paid: 'bg-emerald-500/20 text-emerald-300', void: 'bg-white/10 text-slate-400' }
const dayOfTs = (t) => {
  const ms = t?.toMillis ? t.toMillis() : t?.seconds != null ? t.seconds * 1000 : t ? Date.parse(t) : NaN
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) : ''
}

// The invoice as the customer reads and prints it. Presentational only.
export default function InvoiceDocument({ invoice: inv, business = {}, today = todayISO() }) {
  const state = invoiceState(inv, today)
  const total = invoiceCents(inv)
  const paid = paidInfo(inv)
  const sent = dayOfTs(inv.sentAt)
  const row = 'flex justify-between gap-4 py-2'
  return (
    <article className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-night-900 p-5 text-slate-100 sm:p-8 print:border-0 print:bg-white print:p-0 print:text-black">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4 print:border-black/20">
        <div className="flex items-center gap-3">
          {business.logo && <img src={business.logo} alt="" className="h-12 w-12" />}
          <div>
            <p className="font-display text-xl font-extrabold">{business.name}</p>
            <p className="text-sm text-slate-400 print:text-black">{business.phone}{business.email ? ` · ${business.email}` : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold tracking-wide">INVOICE</p>
          <p className="font-semibold tabular-nums">{inv.number || 'Draft'}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold print:border print:border-black/30 print:bg-transparent print:text-black ${STATE_CLASS[state]}`}>{STATE_LABEL[state]}</span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-glow-400 print:text-black">Bill to</p>
          <p className="text-lg font-semibold">{inv.customer?.name}</p>
          {inv.customer?.address && <p className="text-slate-300 print:text-black">{inv.customer.address}</p>}
          {inv.customer?.email && <p className="break-all text-sm text-slate-400 print:text-black">{inv.customer.email}</p>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:justify-self-end">
          <dt className="text-slate-400 print:text-black">For</dt><dd>{KIND_SHORT[inv.kind] ?? 'Other'}{inv.season ? `, ${inv.season} season` : ''}</dd>
          {sent && <><dt className="text-slate-400 print:text-black">Date</dt><dd>{longDate(sent)}</dd></>}
          {inv.status !== 'draft' && <><dt className="text-slate-400 print:text-black">Due</dt><dd>{inv.dueDate && inv.dueDate !== sent ? longDate(inv.dueDate) : 'On receipt'}</dd></>}
        </dl>
      </section>

      <section>
        <div className="flex justify-between border-b border-white/10 pb-1 text-xs uppercase tracking-wider text-slate-400 print:border-black/20 print:text-black">
          <span>Description</span><span>Amount</span>
        </div>
        <ul className="divide-y divide-white/5 print:divide-black/10">
          {(inv.items ?? []).map((i) => (
            <li key={i.id} className={row}>
              <span className="min-w-0 break-words">{i.description || <span className="text-slate-500">(no description)</span>}</span>
              <span className="shrink-0 tabular-nums">{money(Number(i.cents) || 0)}</span>
            </li>
          ))}
        </ul>
        <div className={`${row} border-t border-white/20 text-lg font-bold print:border-black/40`}>
          <span>Total</span><span className="tabular-nums">{money(total)}</span>
        </div>
        {paid && (
          <div className={`${row} font-semibold text-emerald-300 print:text-black`}>
            <span>Paid ✓ {paid.method}{paid.date ? `, ${longDate(paid.date)}` : ''}{paid.sandbox ? ' (test)' : ''}</span>
            <span className="tabular-nums">−{money(paid.cents ?? total)}</span>
          </div>
        )}
        <div className={`${row} text-lg font-bold ${state === 'overdue' ? 'text-berry-500' : ''} print:text-black`}>
          <span>{state === 'void' ? 'Cancelled' : 'Amount due'}</span>
          <span className="tabular-nums">{money(paid || state === 'void' ? 0 : total)}</span>
        </div>
      </section>

      {inv.note && <p className="whitespace-pre-wrap rounded-2xl bg-white/5 p-4 text-slate-300 print:bg-transparent print:p-0 print:text-black">{inv.note}</p>}

      <footer className="border-t border-white/10 pt-4 text-sm text-slate-400 print:border-black/20 print:text-black">
        Thank you for choosing {business.name}! Questions about this invoice? Call or text {business.phone}.
      </footer>
    </article>
  )
}
