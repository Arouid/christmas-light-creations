import { useEffect, useState } from 'react'
import { business } from '../data/content'
import ProposalDocument from '../proposals/ProposalDocument.jsx'
import SignPanel from '../proposals/SignPanel.jsx'
import DepositPanel from './DepositPanel.jsx'
import { PART_LABEL, PAY_PARTS, docHash, fmt, isPayable, partAmount, paymentOf } from '../proposals/model.js'
import Icon from '../components/Icon'
import RecaptchaNote from '../components/RecaptchaNote'

// The customer's proposal page: /proposal/?t=<token> (link sent by text/email).
// Dev preview with sample data: /proposal/?demo
const PAY_TITLE = { deposit: 'Pay your deposit', balance: 'Pay your install balance', takedown: 'Pay for takedown' }
const PAY_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'For taking your lights down and labeling and boxing them for you to keep.' }

const q = new URLSearchParams(window.location.search)
const token = q.get('t') ?? ''
const demo = import.meta.env.DEV && q.has('demo')

const BIZ = { name: business.name, phone: business.phone, email: 'info@christmas-light-creations.com', logo: business.logo }

async function loadDemo() {
  const { DEMO_PROPOSAL } = await import('./demoProposal.js')
  // ?demo=balance: signed, deposit paid, install balance asked for.
  const later = q.get('demo') === 'balance'
    ? { status: 'countersigned', deposit: { status: 'paid', amount: 74925, env: 'sandbox' }, requests: { balance: true } }
    : {}
  return { p: { ...DEMO_PROPOSAL, ...later, docHash: await docHash(DEMO_PROPOSAL) }, images: {} }
}

export default function ProposalPage() {
  // No token in the link: nothing to load.
  const [state, setState] = useState(() => (token || demo ? { loading: true } : { missing: true }))
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

  async function sign(sig) {
    const signature = { ...sig, docHash: state.p.docHash, userAgent: navigator.userAgent.slice(0, 200) }
    if (demo) { setState((s) => ({ ...s, p: { ...s.p, status: 'signed', signature, signedAt: new Date().toISOString() } })); return }
    await (await store).signProposal(token, signature)
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
          <p className="text-slate-300">{depositDue ? 'Pay your deposit below to hold your install date. ' : ''}We’ll contact you to confirm your install date{p.status === 'countersigned' ? '' : ' and countersign your agreement'}. Keep a copy for your records:</p>
          <button type="button" onClick={() => window.print()} className="rounded-full bg-white px-5 py-3 font-semibold text-night-950">Save or print a copy (PDF)</button>
          <p className="text-sm text-slate-400">All your agreements and payments in one place: <a href={`${import.meta.env.BASE_URL}account/`} className="underline">your account</a> (sign in with your email).</p>
        </div>
      )}
      {due.map((part) => (
        <div key={part} className="mx-auto mb-6 max-w-3xl">
          <DepositPanel token={token} part={part} title={PAY_TITLE[part]} note={PAY_NOTE[part]} amountLabel={fmt(partAmount(p, part))} onPaid={() => load(false)} />
        </div>
      ))}
      {paid.map((part) => (
        <p key={part} className="mx-auto mb-3 max-w-3xl rounded-2xl bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-300 print:hidden">{PART_LABEL[part]} paid ✓ {fmt(paymentOf(p, part).amount)}. Thank you!</p>
      ))}
      <ProposalDocument proposal={p} images={images} business={BIZ} />
      <div className="mx-auto mt-8 max-w-3xl space-y-4">
        {open && state.intact !== false && <SignPanel expectedName={p.customer?.name ?? ''} onSign={sign} />}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <span className="text-slate-400">Questions? We’re happy to adjust anything.</span>
          {call}
        </div>
        <RecaptchaNote />
      </div>
    </main>
  )
}
