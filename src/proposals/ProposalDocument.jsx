import { useState } from 'react'
import { STATUS_LABEL, fmt, itemCents, totals } from './model.js'

const when = (iso) => (iso ? new Date(iso.seconds ? iso.seconds * 1000 : iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

// Before/after: drag the handle to compare the photo with the light design.
function BeforeAfter({ render, photo }) {
  const [pos, setPos] = useState(55)
  if (!photo) return <img src={render} alt="Light design for your home" className="w-full rounded-2xl" />
  return (
    <div className="relative select-none overflow-hidden rounded-2xl print:hidden">
      <img src={render} alt="Your home with the lights" className="block w-full" />
      <img src={photo} alt="Your home today" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }} />
      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">Today</span>
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">With lights</span>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare before and after"
        className="absolute inset-x-0 bottom-2 mx-auto w-2/3 accent-yellow-400" />
    </div>
  )
}

// The proposal as the customer reads, signs and prints it. Presentational
// only: data in, nothing saved here.
// "· paid ✓" after a payment-schedule line once the server recorded it.
function Paid({ pay }) {
  if (pay?.status !== 'paid') return null
  return <span className="font-semibold text-emerald-400 print:text-black"> · paid ✓{pay.env === 'sandbox' ? ' (test)' : ''}</span>
}

export default function ProposalDocument({ proposal: p, images = {}, business = {} }) {
  const t = totals(p)
  const items = p.items ?? []
  const row = 'flex justify-between gap-4 py-1.5'
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-slate-100 print:text-black">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4 print:border-black/20">
        <div className="flex items-center gap-3">
          {business.logo && <img src={business.logo} alt="" className="h-12 w-12" />}
          <div>
            <p className="font-display text-xl font-extrabold">{business.name}</p>
            <p className="text-sm text-slate-400 print:text-black">{business.phone}{business.email ? ` · ${business.email}` : ''}</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{p.title}{p.season ? ` · ${p.season}` : ''}</p>
          {p.sentAt && <p className="text-slate-400 print:text-black">Sent {when(p.sentAt)}</p>}
          <p className="text-slate-400 print:text-black">{STATUS_LABEL[p.status] ?? p.status}</p>
        </div>
      </header>

      <section>
        <p className="text-sm uppercase tracking-wider text-glow-400 print:text-black">Prepared for</p>
        <p className="text-lg font-semibold">{p.customer?.name}</p>
        <p className="text-slate-300 print:text-black">{p.customer?.address}</p>
      </section>

      {images.render && (
        <section className="space-y-2">
          <BeforeAfter render={images.render} photo={images.photo} />
          <img src={images.render} alt="" className="hidden w-full print:block" />
          <p className="text-xs text-slate-500 print:text-black">Design mockup for illustration; final placement may vary slightly with your roofline.</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-xl font-extrabold">What’s included</h2>
        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 px-4 print:border-black/20">
          {items.map((i) => (
            <div key={i.id} className={row}>
              <span>
                {i.label}{Number(i.qty) !== 1 || i.unit ? <span className="text-slate-400 print:text-black"> · {i.qty} {i.unit} × {fmt(Math.round(Number(i.rate) * 100))}</span> : ''}{i.due === 'removal' ? <span className="text-slate-400 print:text-black"> · due at takedown</span> : ''}
                {i.details && <span className="block text-xs text-slate-400 print:text-black">{i.details}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{itemCents(i) === 0 ? 'Free' : fmt(itemCents(i))}</span>
            </div>
          ))}
          {t.discount > 0 && <div className={`${row} text-emerald-400 print:text-black`}><span>{p.discountLabel || 'Discount'} ({p.discountPct}% off the install)</span><span className="tabular-nums">−{fmt(t.discount)}</span></div>}
          <div className={`${row} text-lg font-bold`}><span>Total</span><span className="tabular-nums">{fmt(t.total)}</span></div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl font-extrabold">Payment schedule</h2>
        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 px-4 print:border-black/20">
          {t.deposit > 0 && (
            <div className={row}>
              <span>Deposit when you sign ({p.depositPct}% of the install)<Paid pay={p.deposit} /></span>
              <span className="tabular-nums">{fmt(t.deposit)}</span>
            </div>
          )}
          <div className={row}><span>When installation is complete<Paid pay={p.payments?.balance} /></span><span className="tabular-nums">{fmt(t.dueAtInstall)}</span></div>
          {/* $0 takedown (included in the install) shows as Free, never hidden (owner). */}
          <div className={row}><span>At takedown in January{t.dueAtRemoval > 0 && <Paid pay={p.payments?.takedown} />}</span><span className="tabular-nums">{t.dueAtRemoval > 0 ? fmt(t.dueAtRemoval) : 'Free'}</span></div>
        </div>
      </section>

      <section className="grid gap-2 text-sm sm:grid-cols-2">
        {p.timer && <p className="rounded-xl bg-white/5 px-4 py-2 print:bg-transparent"><span className="text-slate-400 print:text-black">Timer: </span>{p.timer}</p>}
        {p.kind === 'addon'
          ? <p className="rounded-xl bg-white/5 px-4 py-2 print:bg-transparent"><span className="text-slate-400 print:text-black">Your yearly price from next season: </span>goes up by {fmt(t.nextYear)} ({p.reinstallPct ?? 50}% of this add-on{p.reinstallBasis === 'list' ? ', before discount' : ''})</p>
          : <p className="rounded-xl bg-white/5 px-4 py-2 print:bg-transparent"><span className="text-slate-400 print:text-black">Next season re-install: </span>{fmt(t.nextYear)} ({p.reinstallPct ?? 50}% of this install{p.reinstallBasis === 'list' ? ', before discount' : ''})</p>}
      </section>

      {p.notes && <section><h2 className="mb-1 font-semibold">Notes</h2><p className="whitespace-pre-wrap text-slate-300 print:text-black">{p.notes}</p></section>}

      <section>
        <h2 className="mb-2 font-display text-xl font-extrabold">Agreement</h2>
        <div className="whitespace-pre-wrap rounded-2xl border border-white/10 p-4 text-sm leading-relaxed text-slate-300 print:border-black/20 print:text-black">{p.termsText ?? p.terms}</div>
      </section>

      {(p.signature || p.countersign) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {p.signature && (
            <div className="rounded-2xl border border-white/10 p-4 print:border-black/20">
              <p className="text-xs uppercase tracking-wider text-slate-400 print:text-black">Customer</p>
              {p.signature.image && <img src={p.signature.image} alt={`Signature of ${p.signature.name}`} className="mt-2 h-16 rounded bg-white p-1" />}
              <p className="mt-1 font-semibold">{p.signature.name}</p>
              <p className="text-xs text-slate-400 print:text-black">Signed electronically {when(p.signedAt)}</p>
            </div>
          )}
          {p.countersign && (
            <div className="rounded-2xl border border-white/10 p-4 print:border-black/20">
              <p className="text-xs uppercase tracking-wider text-slate-400 print:text-black">{business.name}</p>
              {p.countersign.image && <img src={p.countersign.image} alt={`Signature of ${p.countersign.name}`} className="mt-2 h-16 rounded bg-white p-1" />}
              <p className="mt-1 font-semibold">{p.countersign.name}</p>
              <p className="text-xs text-slate-400 print:text-black">Signed electronically {when(p.countersignedAt)}</p>
            </div>
          )}
          <p className="text-xs text-slate-500 sm:col-span-2 print:text-black">Document fingerprint (SHA-256): <span className="break-all font-mono">{p.docHash}</span></p>
        </section>
      )}
    </article>
  )
}
