import { useEffect, useState } from 'react'
import { business } from '../data/content'
import ProposalDocument from '../proposals/ProposalDocument.jsx'
import SignPanel from '../proposals/SignPanel.jsx'
import DepositPanel from './DepositPanel.jsx'
import { PAY_PARTS, docHash, fmt, isPayIn3, isPayable, partAmount, partLabel, paymentOf } from '../proposals/model.js'
import Icon from '../components/Icon'
import RecaptchaNote from '../components/RecaptchaNote'

// The customer's proposal page: /proposal/?t=<token> (link sent by text/email).
// Dev preview with sample data: /proposal/?demo
const PAY_TITLE = { deposit: 'Pay your deposit', balance: 'Pay your install balance', takedown: 'Pay for takedown' }
const PAY_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'For taking your lights down and labeling and boxing them for you to keep.' }
// Pay in 3 (owner 2026-10-12): the same three slots, named as payments 1, 2 and 3.
const PAYIN3_TITLE = { deposit: 'Payment 1 of 3', balance: 'Payment 2 of 3', takedown: 'Payment 3 of 3' }
const PAYIN3_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'Your lights are down for the season. Thank you!' }
const payTitle = (p, part) => (isPayIn3(p) ? PAYIN3_TITLE : PAY_TITLE)[part]
const payNote = (p, part) => (isPayIn3(p) ? PAYIN3_NOTE : PAY_NOTE)[part]

const q = new URLSearchParams(window.location.search)
const token = q.get('t') ?? ''
const demo = import.meta.env.DEV && q.has('demo')

const BIZ = { name: business.name, phone: business.phone, email: 'info@christmas-light-creations.com', logo: business.logo }

async function loadDemo() {
  const { DEMO_PROPOSAL, DEMO_PAYIN3 } = await import('./demoProposal.js')
  const which = q.get('demo')
  // ?demo=payin3: a lease paid in three equal payments. ?demo=balance: signed, deposit paid, install balance asked for.
  const base = which === 'payin3' ? DEMO_PAYIN3 : DEMO_PROPOSAL
  const later = which === 'balance'
    ? { status: 'countersigned', deposit: { status: 'paid', amount: 74925, env: 'sandbox' }, requests: { balance: true } }
    : {}
  return { p: { ...base, ...later, docHash: await docHash(base) }, images: {} }
}

export default function ProposalPage() {
  // No token in the link: nothing to load.
  const [state, setState] = useState(() => (token || demo ? { loading: true } : { missing: true }))
  const [agreementRead, setAgreementRead] = useState(false) // they opened the folded agreement (needed before signing)
  const store = demo ? null : import('../lib/proposalStore.js')

  async function load(markView = true) {
    try {
      if (demo) { const d = state.p ? { p: state.p, images: state.images } : await loadDemo(); setState({ ...d }); return }
      const s = await store
      const p = token ? await s.getProposal(token) : null
      if (!p) return setState({ missing: true })
      const images = await s.getProposalImages(token)
      // The fingerprint stored when we sent it must still match what's shown.
      const intact = p.docHash ? (await docHash(p)) === p.docHash : true
      setState({ p, images, intact })
      if (markView && p.status === 'sent') s.markViewed(token).catch(() => {})
    } catch {
      setState({ error: true })
    }
  }
  useEffect(() => {
    if (!token && !demo) return
    const t = setTimeout(() => load(), 0) // load after first paint
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function sign({ payDay, ...sig }) {
    const signature = { ...sig, docHash: state.p.docHash, userAgent: navigator.userAgent.slice(0, 200) }
    const extra = payDay ? { payDay } : {} // Pay in 3: the customer's day of the month for payments 2 and 3
    if (demo) { setState((s) => ({ ...s, p: { ...s.p, ...extra, status: 'signed', signature, signedAt: new Date().toISOString() } })); return }
    await (await store).signProposal(token, signature, extra)
    await load(false)
  }

  const call = (
    <a href={business.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold print:hidden">
      <Icon name="phone" className="size-5" /> {business.phone}
    </a>
  )
  if (state.loading) return <main className="grid min-h-svh place-items-center text-slate-400">Loading your proposal…</main>
  if (state.missing || state.error) {
    return (
      <main className="mx-auto grid min-h-svh max-w-md place-items-center p-6 text-center">
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-extrabold">{state.missing ? 'This link isn’t valid' : 'We couldn’t load your proposal'}</h1>
          <p className="text-slate-400">Please call or text us and we’ll send it again.</p>
          {call}
        </div>
      </main>
    )
  }

  const { p, images } = state
  const open = p.status === 'sent' || p.status === 'viewed'
  const signed = p.status === 'signed' || p.status === 'countersigned'
  const depositDue = isPayable(p, 'deposit')
  const due = PAY_PARTS.filter((part) => isPayable(p, part))
  const paid = PAY_PARTS.filter((part) => paymentOf(p, part)?.status === 'paid')
  return (
    <main className="px-4 pb-24 pt-6 print:p-0">
      {demo && <p className="mb-4 rounded-xl bg-berry-600 px-4 py-2 text-center text-sm print:hidden">Preview with sample data</p>}
      {p.status === 'draft' && <p className="mx-auto mb-4 max-w-3xl rounded-xl bg-glow-400/10 px-4 py-3 text-glow-300">We’re updating this proposal. We’ll send you the new version shortly.</p>}
      {(p.status === 'void' || p.status === 'declined') && <p className="mx-auto mb-4 max-w-3xl rounded-xl bg-white/10 px-4 py-3">This proposal is no longer active. Call or text us with any questions.</p>}
      {state.intact === false && <p className="mx-auto mb-4 max-w-3xl rounded-xl bg-berry-600/30 px-4 py-3 text-berry-500">This proposal changed after it was sent. Please call us before signing.</p>}
      {signed && (
        <div className="mx-auto mb-6 max-w-3xl space-y-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5 print:hidden">
          <p className="font-display text-2xl font-extrabold text-emerald-300">Signed ✓ Thank you!</p>
          <p className="text-slate-300">{depositDue ? `${isPayIn3(p) ? 'Make your first payment' : 'Pay your deposit'} below to hold your install date. ` : ''}We’ll contact you to confirm your install date{p.status === 'countersigned' ? '' : ' and countersign your agreement'}. Keep a copy for your records:</p>
          <button type="button" onClick={() => window.print()} className="rounded-full bg-white px-5 py-3 font-semibold text-night-950">Save or print a copy (PDF)</button>
          <p className="text-sm text-slate-400">All your agreements and payments in one place: <a href={`${import.meta.env.BASE_URL}account/`} className="underline">your account</a> (sign in with your email). While you're there, add your gate code, anything in the yard we should avoid, and pets, so the crew is ready on the day.</p>
        </div>
      )}
      {due.map((part) => (
        <div key={part} className="mx-auto mb-6 max-w-3xl">
          <DepositPanel token={token} part={part} title={payTitle(p, part)} note={payNote(p, part)} amountLabel={fmt(partAmount(p, part))} onPaid={() => load(false)} />
        </div>
      ))}
      {paid.map((part) => (
        <p key={part} className="mx-auto mb-3 max-w-3xl rounded-2xl bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-300 print:hidden">{partLabel(p, part)} paid ✓ {fmt(paymentOf(p, part).amount)}. Thank you!</p>
      ))}
      <ProposalDocument proposal={p} images={images} business={BIZ} agreementOpen={false} onAgreementOpen={() => setAgreementRead(true)} />
      <div className="mx-auto mt-8 max-w-3xl space-y-4">
        {open && state.intact !== false && <SignPanel expectedName={p.customer?.name ?? ''} payIn3={isPayIn3(p)} agreementRead={agreementRead} onSign={sign} />}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <span className="text-slate-400">Questions? We’re happy to adjust anything.</span>
          {call}
        </div>
        <RecaptchaNote />
      </div>
    </main>
  )
}
