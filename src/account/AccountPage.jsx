import { useEffect, useState } from 'react'
import { business } from '../data/content'
import DepositPanel from '../proposal/DepositPanel.jsx'
import { PART_LABEL, STATUS_LABEL, fmt } from '../proposals/model.js'
import Icon from '../components/Icon'

// The customer's own account: /account/ (sign in by emailed link, no
// password). Lists every proposal sent to their email, what's paid and what's
// due, and pays open amounts with the same PayPal panel as the proposal page.
// Dev preview with sample data: /account/?demo
const q = new URLSearchParams(window.location.search)
const demo = import.meta.env.DEV && q.has('demo')
const lib = demo ? null : import('../lib/account.js')

const PAY_TITLE = { deposit: 'Pay your deposit', balance: 'Pay your install balance', takedown: 'Pay for takedown & storage' }
const PAY_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'For taking your lights down, labeling and storing them.' }
const STATE_TEXT = { paid: 'Paid', due: 'Due now', later: 'Not due yet', none: '—' }
const STATE_CLASS = { paid: 'text-emerald-300', due: 'text-glow-300 font-semibold', later: 'text-slate-400', none: 'text-slate-500' }
const proposalLink = (token) => `${import.meta.env.BASE_URL}proposal/?t=${token}`
const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold'

const call = (
  <a href={business.phoneHref} className={`${btn} border border-white/20`}>
    <Icon name="phone" className="size-5" /> {business.phone}
  </a>
)

export default function AccountPage() {
  const [view, setView] = useState({ name: 'checking' })
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    if (demo) {
      const { DEMO_ACCOUNT } = await import('./demoAccount.js')
      setView({ name: 'account', data: DEMO_ACCOUNT })
      return
    }
    setView((v) => (v.name === 'account' ? v : { name: 'loading' }))
    try {
      setView({ name: 'account', data: await (await lib).loadAccount() })
    } catch {
      setView({ name: 'error' })
    }
  }

  useEffect(() => {
    if (demo) { const t = setTimeout(load, 0); return () => clearTimeout(t) }
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const a = await lib
      let waiting = false // link opened on another phone/computer: ask which email it went to
      if (await a.isLinkInUrl()) {
        const saved = a.rememberedEmail()
        if (saved) {
          try { await a.finishLink(saved) } catch { if (!cancelled) setView({ name: 'badLink' }); return }
        } else {
          waiting = true
          if (!cancelled) setView({ name: 'needEmail' })
        }
      }
      // Signs in later (needEmail form) also land here.
      const off = await a.watchUser((user) => {
        if (user) load()
        else if (!waiting) { setEmail(a.rememberedEmail()); setView({ name: 'signin' }) }
      })
      if (cancelled) off(); else unsub = off
    })().catch(() => setView({ name: 'error' }))
    return () => { cancelled = true; unsub() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const a = await lib
      if (view.name === 'needEmail') {
        try { await a.finishLink(email) } catch { setView({ name: 'badLink' }) }
      } else {
        await a.sendLink(email)
        setView({ name: 'sent' })
      }
    } catch (err) {
      setView((v) => ({ ...v, error: err?.message || 'Something went wrong. Please try again, or call us.' }))
    } finally {
      setBusy(false)
    }
  }

  async function logOut() {
    if (demo) return
    await (await lib).signOut()
  }

  return (
    <main className="mx-auto min-h-svh max-w-3xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <a href={import.meta.env.BASE_URL} className="flex items-center gap-2">
          <img src={business.logo} alt="" className="size-10" />
          <span className="font-display text-lg font-extrabold leading-tight">Your account</span>
        </a>
        <a href={business.phoneHref} className={`${btn} bg-glow-400 px-4 text-night-950`} aria-label={`Call ${business.phone}`}>
          <Icon name="phone" className="size-5" /> <span className="hidden sm:inline">{business.phone}</span><span className="sm:hidden">Call</span>
        </a>
      </header>
      {demo && <p className="mb-4 rounded-xl bg-berry-600 px-4 py-2 text-center text-sm">Preview with sample data</p>}
      <Body view={view} email={email} setEmail={setEmail} busy={busy} submit={submit} reload={load} logOut={logOut} />
    </main>
  )
}

function Body({ view, email, setEmail, busy, submit, reload, logOut }) {
  if (view.name === 'checking' || view.name === 'loading') return <p className="py-20 text-center text-slate-400">Loading your account…</p>
  if (view.name === 'error') return <Notice title="We couldn’t load your account" text="Please refresh, or call or text us." />
  if (view.name === 'badLink') return <Notice title="This sign-in link has expired or was already used" text="Ask for a new one below." action={<a href={`${import.meta.env.BASE_URL}account/`} className={`${btn} bg-white text-night-950`}>Get a new link</a>} />
  if (view.name === 'sent') return <Notice title="Check your email" text="If that email is on one of your proposals, a sign-in link is on its way from info@christmas-light-creations.com. Open it on this phone or computer. Not there in a few minutes? Check spam, or call us." />
  if (view.name === 'signin' || view.name === 'needEmail') {
    const finishing = view.name === 'needEmail'
    return (
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <h1 className="font-display text-2xl font-extrabold">{finishing ? 'Confirm your email' : 'Sign in to your account'}</h1>
        <p className="text-slate-300">{finishing ? 'Enter the email this link was sent to.' : 'See your agreements, what’s paid and anything due, and pay online. Enter the email we sent your proposal to and we’ll email you a sign-in link. No password needed.'}</p>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-white/20 bg-night-950 px-4 py-3 text-base" />
        </label>
        {view.error && <p className="text-sm text-berry-500" role="alert">{view.error}</p>}
        <button type="submit" disabled={busy} className={`${btn} w-full bg-glow-400 text-night-950 disabled:opacity-60`}>
          {busy ? 'One moment…' : finishing ? 'Sign in' : 'Email me a sign-in link'}
        </button>
      </form>
    )
  }
  return <Account data={view.data} reload={reload} logOut={logOut} />
}

function Notice({ title, text, action }) {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h1 className="font-display text-2xl font-extrabold">{title}</h1>
      <p className="text-slate-300">{text}</p>
      <div className="flex flex-wrap gap-3">{action}{call}</div>
    </div>
  )
}

function Account({ data, reload, logOut }) {
  const list = data.proposals ?? []
  const me = list[0]?.customer
  const owed = list.flatMap((p) => p.parts.filter((x) => x.state === 'due')).reduce((t, x) => t + x.amount, 0)
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold">{me?.name ? `Hi, ${me.name.split(' ')[0]}` : 'Your account'}</h1>
        {me?.address && <p className="text-slate-300">{me.address}</p>}
        <p className="text-sm text-slate-400">Signed in as {data.email}. <button type="button" onClick={logOut} className="min-h-11 underline">Sign out</button></p>
      </section>
      {!list.length && <Notice title="No proposals yet" text="We don’t have a proposal sent to this email yet. If we used a different email, call or text us." />}
      {list.length > 0 && (
        <p className={`rounded-2xl px-5 py-3 font-semibold ${owed ? 'bg-glow-400/10 text-glow-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {owed ? `Due now: ${fmt(owed)}` : 'You’re all paid up. Thank you!'}
        </p>
      )}
      {list.map((p) => <ProposalCard key={p.token} p={p} reload={reload} />)}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400">Questions about your lights or a bill?</span>
        {call}
      </div>
    </div>
  )
}

function ProposalCard({ p, reload }) {
  const unsigned = p.status === 'sent' || p.status === 'viewed'
  const due = p.parts.filter((x) => x.state === 'due')
  const rows = p.parts.filter((x) => x.state !== 'none')
  const total = p.parts.reduce((t, x) => t + x.amount, 0)
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold">{p.title}{p.season ? ` · ${p.season}` : ''}</h2>
          <p className="text-sm text-slate-400">{p.customer.address}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{STATUS_LABEL[p.status] ?? p.status}</span>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400"><tr><th className="py-1 font-normal">Payment</th><th className="py-1 text-right font-normal">Amount</th><th className="py-1 text-right font-normal">Status</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.part} className="border-t border-white/10">
              <td className="py-2">{PART_LABEL[x.part]}</td>
              <td className="py-2 text-right tabular-nums">{fmt(x.state === 'paid' ? x.paid : x.amount)}</td>
              <td className={`py-2 text-right ${STATE_CLASS[x.state]}`}>{STATE_TEXT[x.state]}{x.state === 'paid' && x.sandbox ? ' (test)' : ''}</td>
            </tr>
          ))}
          <tr className="border-t border-white/20 font-semibold"><td className="py-2">Total</td><td className="py-2 text-right tabular-nums">{fmt(total)}</td><td /></tr>
        </tbody>
      </table>
      {unsigned && <p className="text-glow-300">This proposal is ready for your signature.</p>}
      <a href={proposalLink(p.token)} className={`${btn} ${unsigned ? 'bg-glow-400 text-night-950' : 'bg-white text-night-950'}`}>
        {unsigned ? 'Review and sign' : 'View or print your agreement'}
      </a>
      {due.map((x) => (
        <DepositPanel key={x.part} token={p.token} part={x.part} title={PAY_TITLE[x.part]} note={PAY_NOTE[x.part]} amountLabel={fmt(x.amount)} onPaid={reload} />
      ))}
    </section>
  )
}
