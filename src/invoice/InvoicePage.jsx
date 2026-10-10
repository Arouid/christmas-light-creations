import { useEffect, useState } from 'react'
import { business } from '../data/content'
import InvoiceDocument from '../invoices/InvoiceDocument.jsx'
import DepositPanel from '../proposal/DepositPanel.jsx'
import { invoiceCents, invoiceState, longDate, money, paidInfo } from '../lib/invoices'
import { todayISO } from '../lib/customers'
import Icon from '../components/Icon'
import RecaptchaNote from '../components/RecaptchaNote'

// The customer's invoice: /invoice/?t=<token> (link emailed or texted).
// Dev preview with sample data: /invoice/?demo (or =overdue, =paid, =draft, =void).
const q = new URLSearchParams(window.location.search)
const token = q.get('t') ?? ''
const demo = import.meta.env.DEV && q.has('demo')
const preview = q.has('preview') // staff opening it from the staff app

const BIZ = { name: business.name, phone: business.phone, email: 'info@christmas-light-creations.com', logo: business.logo }
const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold'

const call = (
  <a href={business.phoneHref} className={`${btn} border border-white/20 print:hidden`}>
    <Icon name="phone" className="size-5" /> {business.phone}
  </a>
)

export default function InvoicePage() {
  const [state, setState] = useState(() => (token || demo ? { loading: true } : { missing: true }))
  const store = demo ? null : import('../lib/invoiceStore.js')

  async function load(markView = true) {
    try {
      if (demo) { const { demoInvoice } = await import('./demoInvoice.js'); setState({ inv: demoInvoice(q.get('demo')) }); return }
      const s = await store
      const inv = token ? await s.getInvoice(token) : null
      if (!inv) return setState({ missing: true })
      setState({ inv })
      if (markView && !preview && !inv.viewedAt && (inv.status === 'open' || inv.status === 'paid')) s.markInvoiceViewed(token).catch(() => {})
    } catch {
      setState({ error: true })
    }
  }
  useEffect(() => {
    if (!token && !demo) return
    const t = setTimeout(() => load(), 0) // load after first paint
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const top = (
    <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between gap-3 print:hidden">
      <a href={import.meta.env.BASE_URL} className="flex items-center gap-2">
        <img src={business.logo} alt="" className="size-10" />
        <span className="font-display text-lg font-extrabold leading-tight">{business.name}</span>
      </a>
      <a href={business.phoneHref} className={`${btn} bg-glow-400 px-4 text-night-950`} aria-label={`Call ${business.phone}`}>
        <Icon name="phone" className="size-5" /> <span className="hidden sm:inline">{business.phone}</span><span className="sm:hidden">Call</span>
      </a>
    </header>
  )
  const notice = (title, text) => (
    <main className="px-4 pb-24 pt-6">
      {top}
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        <p className="text-slate-400">{text}</p>
        {call}
      </div>
    </main>
  )

  if (state.loading) return <main className="grid min-h-svh place-items-center text-slate-400">Loading your invoice…</main>
  if (state.missing) return notice('This link isn’t valid', 'Please call or text us and we’ll send it again.')
  if (state.error) return notice('We couldn’t load your invoice', 'Please refresh, or call or text us.')

  const { inv } = state
  if (inv.status === 'draft') return notice('This invoice isn’t ready yet', 'We’re still preparing it. We’ll send it to you shortly.')
  const today = todayISO()
  const s = invoiceState(inv, today)
  const paid = paidInfo(inv)
  return (
    <main className="px-4 pb-24 pt-6 print:p-0">
      {demo && <p className="mx-auto mb-4 max-w-3xl rounded-xl bg-berry-600 px-4 py-2 text-center text-sm print:hidden">Preview with sample data</p>}
      {top}
      <div className="mx-auto mb-6 max-w-3xl space-y-4 print:hidden">
        {s === 'void' && <p className="rounded-2xl bg-white/10 px-5 py-4">This invoice was cancelled. Nothing is due on it. Questions? Call or text us.</p>}
        {s === 'overdue' && <p className="rounded-2xl bg-berry-600/20 px-5 py-4 font-semibold text-berry-500">This invoice was due {longDate(inv.dueDate)}. If you’ve already paid, thank you, and please ignore this.</p>}
        {paid && (
          <div className="space-y-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5">
            <p className="font-display text-2xl font-extrabold text-emerald-300">Paid ✓ Thank you!</p>
            <p className="text-slate-300">We received {money(paid.cents ?? invoiceCents(inv))} by {paid.method}{paid.date ? ` on ${longDate(paid.date)}` : ''}{paid.sandbox ? ' (TEST payment: no real money moved)' : ''}. This page is your receipt.</p>
          </div>
        )}
        {(s === 'open' || s === 'overdue') && (
          <DepositPanel token={token} of="invoice" title={`Pay invoice ${inv.number}`} amountLabel={money(invoiceCents(inv))}
            note={s === 'overdue' ? 'Past due.' : inv.dueDate > today ? `Due ${longDate(inv.dueDate)}.` : 'Due on receipt.'} onPaid={() => load(false)} />
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => window.print()} className={`${btn} bg-white text-night-950`}>Save or print (PDF)</button>
          <a href={`${import.meta.env.BASE_URL}account/`} className={`${btn} border border-white/20`}>Your account</a>
        </div>
      </div>
      <InvoiceDocument invoice={inv} business={BIZ} today={today} />
      <div className="mx-auto mt-8 max-w-3xl space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">Questions about this invoice?</span>
          {call}
        </div>
        <RecaptchaNote />
      </div>
    </main>
  )
}
