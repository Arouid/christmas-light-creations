import { useEffect, useState } from 'react'
import { business } from '../data/content'
import DepositPanel from '../proposal/DepositPanel.jsx'
import { PART_LABEL, STATUS_LABEL, fmt } from '../proposals/model.js'
import Icon from '../components/Icon'
import { REINSTALL_PCT, yearlyPrice } from '../lib/addOns'
import { seasonYear } from '../lib/customers'

// The customer's own account: /account/ (sign in with Google or an emailed
// link, no password). Lists every proposal sent to their email, what's paid and what's
// due, and pays open amounts with the same PayPal panel as the proposal page.
// Dev preview with sample data: /account/?demo
const q = new URLSearchParams(window.location.search)
const demo = import.meta.env.DEV && q.has('demo')
const lib = demo ? null : import('../lib/account.js')

const PAY_TITLE = { deposit: 'Pay your deposit', balance: 'Pay your install balance', takedown: 'Pay for takedown' }
const PAY_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'For taking your lights down and labeling and boxing them for you to keep.' }
const STATE_TEXT = { paid: 'Paid', due: 'Due now', later: 'Not due yet', none: '—', free: '' }
const STATE_CLASS = { paid: 'text-emerald-300', due: 'text-glow-300 font-semibold', later: 'text-slate-400', none: 'text-slate-500', free: '' }
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

  async function google() {
    setBusy(true)
    try {
      await (await lib).signInGoogle()
    } catch {
      setView((v) => ({ ...v, error: 'Google sign-in didn’t work. Try the email link below, or call us.' }))
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
      <Body view={view} email={email} setEmail={setEmail} busy={busy} submit={submit} google={google} reload={load} logOut={logOut} />
    </main>
  )
}

function Body({ view, email, setEmail, busy, submit, google, reload, logOut }) {
  if (view.name === 'checking' || view.name === 'loading') return <p className="py-20 text-center text-slate-400">Loading your account…</p>
  if (view.name === 'error') return <Notice title="We couldn’t load your account" text="Please refresh, or call or text us." />
  if (view.name === 'badLink') return <Notice title="This sign-in link has expired or was already used" text="Ask for a new one below." action={<a href={`${import.meta.env.BASE_URL}account/`} className={`${btn} bg-white text-night-950`}>Get a new link</a>} />
  if (view.name === 'sent') return <Notice title="Check your email" text="If that email is on one of your proposals, a sign-in link is on its way from info@christmas-light-creations.com. Open it on this phone or computer. Not there in a few minutes? Check spam, or call us." />
  if (view.name === 'signin' || view.name === 'needEmail') {
    const finishing = view.name === 'needEmail'
    return (
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <h1 className="font-display text-2xl font-extrabold">{finishing ? 'Confirm your email' : 'Sign in to your account'}</h1>
        <p className="text-slate-300">{finishing ? 'Enter the email this link was sent to.' : 'See your agreements, what’s paid and anything due, and pay online. Use the email we sent your proposal to. No password needed.'}</p>
        {!finishing && (
          <>
            <button type="button" onClick={google} disabled={busy} className={`${btn} w-full bg-white text-night-950 disabled:opacity-60`}>
              <GoogleG /> Sign in with Google
            </button>
            <p className="text-center text-sm text-slate-400">or get a sign-in link by email</p>
          </>
        )}
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

// Google's "G" mark, as Google's sign-in button guidelines ask for.
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
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
  const me = list[0]?.customer ?? data.customer
  const owed = list.flatMap((p) => p.parts.filter((x) => x.state === 'due')).reduce((t, x) => t + x.amount, 0)
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold">{me?.name ? `Hi, ${me.name.split(' ')[0]}` : 'Your account'}</h1>
        {me?.address && <p className="text-slate-300">{me.address}</p>}
        <p className="text-sm text-slate-400">Signed in as {data.email}. <button type="button" onClick={logOut} className="min-h-11 underline">Sign out</button></p>
      </section>
      {data.price && <YearlyPrice price={data.price} />}
      {!list.length && !data.customer && <Notice title="No proposals under this email" text={`Call or text us at ${business.phone} and we’ll update it.`} />}
      {list.length > 0 && (
        <p className={`rounded-2xl px-5 py-3 font-semibold ${owed ? 'bg-glow-400/10 text-glow-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {owed ? `Due now: ${fmt(owed)}` : 'You’re all paid up. Thank you!'}
        </p>
      )}
      {list.map((p) => <ProposalCard key={p.token} p={p} reload={reload} />)}
      {data.price?.history?.length > 0 && <PaymentHistory history={data.price.history} />}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400">Questions about your lights or a bill?</span>
        {call}
      </div>
    </div>
  )
}

// How the yearly re-install price is built (docs/specs/add-ons.md). Only the
// current yearly price: no lifetime totals (owner's request).
function YearlyPrice({ price }) {
  const y = yearlyPrice(price, seasonYear())
  if (y.yearlyCents == null) return null
  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Your yearly price</h2>
      <p className="text-sm text-slate-300">You own your lights. Each year we put them back up for {REINSTALL_PCT}% of what they first cost. Anything you add is charged in full the year it’s added, then also at {REINSTALL_PCT}% every year after.</p>
      <table className="w-full text-left text-sm">
        <tbody>
          <tr>
            <td className="py-2 pr-2">Re-install of your original lights{y.since ? ` (${y.since})` : ''}<span className="block text-xs text-slate-400">{REINSTALL_PCT}% of {fmt(y.originalCents)}</span></td>
            <td className="py-2 text-right tabular-nums">{fmt(y.baseCents)}</td>
          </tr>
          {y.lines.map((l, i) => (
            <tr key={i} className="border-t border-white/10">
              <td className="py-2 pr-2">＋ {l.what}<span className="block text-xs text-slate-400">added {l.season} · {REINSTALL_PCT}% of {fmt(l.priceCents)}</span></td>
              <td className="py-2 text-right tabular-nums">{fmt(l.addsCents)}</td>
            </tr>
          ))}
          <tr className="border-t border-white/20 font-semibold">
            <td className="py-2">Yearly price, {y.season} season</td>
            <td className="py-2 text-right tabular-nums">{fmt(y.yearlyCents)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-slate-400">Before any discount (like early install).</p>
      {y.thisSeason.map((l, i) => (
        <p key={i} className="rounded-2xl bg-white/5 px-4 py-2 text-sm">New this season: {l.what} ({fmt(l.priceCents)}, charged in full this year). From next season it adds {fmt(l.addsCents)} a year.</p>
      ))}
    </section>
  )
}

// What they paid, season by season (from our records, incl. years before the
// website). No grand total on purpose.
const PAID_TEXT = { paid: 'Paid ✓', free: 'Free', unpaid: 'Not paid yet' }
const PAID_CLASS = { paid: 'text-emerald-300', free: 'text-emerald-300', unpaid: 'text-glow-300', '': 'text-slate-400' }
function PaymentHistory({ history }) {
  const row = (label, b) => b && (
    <div className="py-1">
      <span className="flex justify-between gap-3"><span>{label}</span>{b.amount != null && b.state !== 'free' && <span className="tabular-nums">{fmt(b.amount)}</span>}</span>
      <span className={`block ${PAID_CLASS[b.state]}`}>{PAID_TEXT[b.state] ?? ''}{b.by || b.date ? <span className="text-slate-400"> {[b.by, b.date].filter(Boolean).join(', ')}</span> : null}</span>
    </div>
  )
  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">What you’ve paid</h2>
      <ul className="divide-y divide-white/10 text-sm">
        {history.map((h) => (
          <li key={h.season} className="py-2">
            <p className="font-semibold">{h.season} season</p>
            {row('Lights up', h.install)}
            {row('Takedown', h.takedown)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">Something look off? Call or text us and we’ll check it.</p>
    </section>
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
              <td className={`py-2 text-right tabular-nums ${x.state === 'free' ? 'font-semibold text-emerald-300' : ''}`}>{x.state === 'free' ? 'Free' : fmt(x.state === 'paid' ? x.paid : x.amount)}</td>
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
