import { useEffect, useState } from 'react'
import { accountReviewCard, business } from '../data/content'
import { laterValue, reviewCardHidden, saveReviewCard } from './reviewCard'
import DepositPanel from '../proposal/DepositPanel.jsx'
import { STATUS_LABEL, dueText, fmt, isPayIn3, partLabel } from '../proposals/model.js'
import Icon from '../components/Icon'
import RecaptchaNote from '../components/RecaptchaNote'
import { REINSTALL_PCT, yearlyPrice } from '../lib/addOns'
import { seasonYear } from '../lib/customers'
import { KIND_SHORT, longDate } from '../lib/invoices'
import { InstallButtons } from '../components/InstallApp'
import { isIos, standalone, useInstall } from '../components/useInstall'
import AccountDrawer from './AccountDrawer.jsx'
import { NOTE_MAX, REPORT_ISSUES, scheduleText, shortDate } from '../../functions/service.js'
import { TEXT_MAX as CHAT_MAX } from '../../functions/chat.js'
import { TREE_NOTICE, TREE_TITLE } from '../../functions/notices.js'
import { searchHelp } from '../data/help.js'
import { WEEKS } from '../../functions/rebook.js'
import { demoCodeStep, demoPhoneStep, phoneError, prettyPhone } from './phoneSignIn.js'
import AccountTour from './AccountTour.jsx'
import { accountTourSteps, tourWorthOpening } from '../data/accountTour.js'

// The customer's own account: /account/ (sign in with Google, a code texted
// to their phone, or an emailed link; no password). Lists every proposal sent
// to their email or phone, what's paid and what's due, and pays open amounts
// with the same PayPal panel as the proposal page.
// Dev preview with sample data: /account/?demo; the sign-in screens, with
// nothing sent: /account/?demo=signin (any 6 digits sign in).
const q = new URLSearchParams(window.location.search)
const demo = import.meta.env.DEV && q.has('demo')
const demoSignIn = demo && q.get('demo') === 'signin'
const lib = demo ? null : import('../lib/account.js')
// Where Firebase's invisible robot check for phone sign-in anchors (docs/specs/phone-sign-in.md).
const RECAPTCHA_ID = 'phone-recaptcha'

const PAY_TITLE = { deposit: 'Pay your deposit', balance: 'Pay your install balance', takedown: 'Pay for takedown' }
const PAY_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'For taking your lights down and labeling and boxing them for you to keep.' }
// Pay in 3 (owner 2026-10-12): the same three slots, named as payments 1, 2 and 3.
const PAYIN3_TITLE = { deposit: 'Payment 1 of 3', balance: 'Payment 2 of 3', takedown: 'Payment 3 of 3' }
const PAYIN3_NOTE = { deposit: 'This holds your install date.', balance: 'Your lights are up. Thank you!', takedown: 'Your lights are down for the season. Thank you!' }
const payTitle = (p, part) => (isPayIn3(p) ? PAYIN3_TITLE : PAY_TITLE)[part]
const payNote = (p, part) => (isPayIn3(p) ? PAYIN3_NOTE : PAY_NOTE)[part]
const STATE_TEXT = { paid: 'Paid', due: 'Due now', later: 'Not due yet', none: '—', free: '' }
const STATE_CLASS = { paid: 'text-emerald-300', due: 'text-glow-300 font-semibold', later: 'text-slate-400', none: 'text-slate-400', free: '' }
const proposalLink = (token) => `${import.meta.env.BASE_URL}proposal/?t=${token}`
const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold'
// Has this phone/computer had the account tour? (docs/specs/account-tour.md)
const TOUR_KEY = 'clcAccountTourDone'
const tourDone = () => { try { return localStorage.getItem(TOUR_KEY) === '1' } catch { return true } }
const markTourDone = () => { try { localStorage.setItem(TOUR_KEY, '1') } catch { /* private mode: it shows again next time, fine */ } }

const call = (
  <a href={business.phoneHref} className={`${btn} border border-white/20`}>
    <Icon name="phone" className="size-5" /> {business.phone}
  </a>
)

export default function AccountPage() {
  const [view, setView] = useState({ name: 'checking' })
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('') // phone sign-in: the number, then the texted code
  const [codeText, setCodeText] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false) // the ☰ drawer (AccountDrawer.jsx)
  const { installed } = useInstall()
  const data = view.name === 'account' ? view.data : null
  // The tour: by itself once per device on the first signed-in visit, any
  // time from ☰. null = not opened or closed by them yet on this visit.
  const [tourSeen] = useState(tourDone)
  const [tour, setTour] = useState(null)
  const tourSteps = data ? accountTourSteps(data, { installed }) : []
  const tourOpen = tour ?? (Boolean(data) && !tourSeen && tourWorthOpening(tourSteps))
  const closeTour = () => { markTourDone(); setTour(false) }
  // What the drawer links to, by what's on the page (anchors below).
  const menuItems = data ? [
    (data.schedule || data.service) && { href: '#lights', label: 'Your lights', icon: '🎄' },
    data.chat && { href: '#chat', label: 'Chat with us', icon: '💬' },
    ((data.proposals?.length ?? 0) > 0 || (data.invoices?.length ?? 0) > 0) && { href: '#agreements', label: 'Agreements & payments', icon: '🧾' },
    (data.invoices ?? []).some((i) => i.state === 'paid') && { href: '#paid', label: 'Paid invoices', icon: '✓' },
    data.price && { href: '#price', label: 'Your yearly price', icon: '💲' },
    data.price?.history?.length > 0 && { href: '#history', label: 'What you’ve paid', icon: '📒' },
    data.details && { href: '#property-details', label: 'Your property details', icon: '🏡' },
    data.details && { href: '#emails', label: 'Email preferences', icon: '✉️' },
    !installed && { href: '#app', label: 'Get the app', icon: '📱' },
    { href: '#help', label: 'Help', icon: '❓' },
  ].filter(Boolean) : [{ href: '#help', label: 'Help', icon: '❓' }]

  async function load() {
    if (demo) {
      const { DEMO_ACCOUNT } = await import('./demoAccount.js')
      // ?demo=rebook: a returning customer who isn't on this season's list yet.
      const rebook = q.get('demo') === 'rebook' ? { ...DEMO_ACCOUNT, schedule: { ...DEMO_ACCOUNT.schedule, installStatus: '', day: '', plannedDate: '', weekOf: '' } } : DEMO_ACCOUNT
      setView({ name: 'account', data: rebook })
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
    if (demo) { const t = setTimeout(() => (demoSignIn ? setView({ name: 'signin' }) : load()), 0); return () => clearTimeout(t) }
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

  // Sign in with your phone number: Firebase texts a 6-digit code and checks
  // it (src/lib/account.js). In demo nothing is sent and any 6 digits work.
  async function phoneSend(e) {
    e?.preventDefault()
    setBusy(true)
    try {
      if (demo) {
        const r = demoPhoneStep(phone)
        setView(r.error ? { name: 'phone', error: r.error } : { name: 'code', phone: r.phone })
        return
      }
      const sent = await (await lib).sendPhoneCode(phone, RECAPTCHA_ID)
      setCodeText('')
      setView({ name: 'code', phone: sent })
    } catch (err) {
      setView((v) => ({ ...v, error: phoneError(err) }))
    } finally {
      setBusy(false)
    }
  }
  async function phoneConfirm(e) {
    e.preventDefault()
    const r = demoCodeStep(codeText)
    if (r.error) { setView((v) => ({ ...v, error: r.error })); return }
    setBusy(true)
    try {
      if (demo) {
        const { DEMO_ACCOUNT } = await import('./demoAccount.js')
        setView({ name: 'account', data: { ...DEMO_ACCOUNT, email: '', phone: view.phone } })
        return
      }
      await (await lib).confirmPhoneCode(codeText.replace(/\D/g, '')) // watchUser then loads the account
      setCodeText('')
    } catch (err) {
      setView((v) => ({ ...v, error: phoneError(err) }))
    } finally {
      setBusy(false)
    }
  }
  function phoneBack(to) {
    setCodeText('')
    if (!demo) lib.then((a) => a.cancelPhoneCode())
    setView({ name: to })
  }
  const phoneUi = { phone, setPhone, codeText, setCodeText, send: phoneSend, confirm: phoneConfirm, back: phoneBack }

  async function logOut() {
    if (demo) return
    await (await lib).signOut()
  }

  return (
    <main className="mx-auto min-h-svh max-w-3xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <a href={`${import.meta.env.BASE_URL}account/`} className="flex items-center gap-2">
          <img src={business.logo} alt="" className="size-10" />
          <span className="font-display text-lg font-extrabold leading-tight">Your account</span>
        </a>
        <div className="flex items-center gap-2">
          <a href={business.phoneHref} className={`${btn} bg-glow-400 px-4 text-night-950`} aria-label={`Call ${business.phone}`}>
            <Icon name="phone" className="size-5" /> <span className="hidden sm:inline">{business.phone}</span><span className="sm:hidden">Call</span>
          </a>
          <button type="button" id="account-menu" onClick={() => setMenu(true)} aria-label="Menu" aria-expanded={menu} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl print:hidden">☰</button>
        </div>
      </header>
      <AccountDrawer open={menu} onClose={() => setMenu(false)} items={menuItems} email={data?.email || prettyPhone(data?.phone ?? '')} onSignOut={data && !demo ? logOut : null} onTour={tourSteps.length ? () => setTour(true) : null} />
      {tourOpen && tourSteps.length > 0 && <AccountTour steps={tourSteps} name={(data.proposals?.[0]?.customer ?? data.customer ?? data.invoices?.[0]?.customer)?.name} onClose={closeTour} />}
      {demo && <p className="mb-4 rounded-xl bg-berry-600 px-4 py-2 text-center text-sm">Preview with sample data{demoSignIn ? ': nothing is sent, any 6 digits sign in' : ''}</p>}
      <Body view={view} email={email} setEmail={setEmail} busy={busy} submit={submit} google={google} phoneUi={phoneUi} reload={load} logOut={logOut} />
      <RecaptchaNote className="mt-10" />
    </main>
  )
}

function Body({ view, email, setEmail, busy, submit, google, phoneUi, reload, logOut }) {
  if (view.name === 'checking' || view.name === 'loading') return <p className="py-20 text-center text-slate-400">Loading your account…</p>
  if (view.name === 'error') return <Notice title="We couldn’t load your account" text="Please refresh, or call or text us." />
  if (view.name === 'badLink') return <Notice title="This sign-in link has expired or was already used" text="Ask for a new one below." action={<a href={`${import.meta.env.BASE_URL}account/`} className={`${btn} bg-white text-night-950`}>Get a new link</a>} />
  if (view.name === 'sent') return <Notice title="Check your email" text="If that email is on one of your proposals, a sign-in link is on its way from info@christmas-light-creations.com. Open it on this phone or computer. Not there in a few minutes? Check spam, or call us." />
  if (view.name === 'phone' || view.name === 'code') return <div className="space-y-6"><PhoneSignIn view={view} busy={busy} {...phoneUi} /><Help /></div>
  if (view.name === 'signin' || view.name === 'needEmail') {
    const finishing = view.name === 'needEmail'
    return (
      <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
        <h1 className="font-display text-2xl font-extrabold">{finishing ? 'Confirm your email' : 'Sign in to your account'}</h1>
        <p className="text-slate-300">{finishing ? 'Enter the email this link was sent to.' : 'See your agreements, what’s paid and anything due, and pay online. Use the email we sent your proposal to, or the phone number we have for you. No password needed.'}</p>
        {!finishing && (
          <>
            <button type="button" onClick={google} disabled={busy} className={`${btn} w-full bg-white text-night-950 disabled:opacity-60`}>
              <GoogleG /> Sign in with Google
            </button>
            <button type="button" onClick={() => phoneUi.back('phone')} disabled={busy} className={`${btn} w-full border border-white/20 disabled:opacity-60`}>
              <Icon name="phone" className="size-5" /> Sign in with your phone number
            </button>
            <p className="text-center text-sm text-slate-400">or get a sign-in link by email</p>
            {/* iPhone opens emailed links in Safari, not in the home-screen app. */}
            {isIos() && standalone() && <p className="text-sm text-slate-400">In the app on an iPhone, use Google or your phone number: an emailed link opens in Safari instead.</p>}
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
      <Help />
      </div>
    )
  }
  return <Account data={view.data} reload={reload} logOut={logOut} />
}

// Sign in with your phone number (docs/specs/phone-sign-in.md): the number,
// then the 6-digit code Firebase texted. The empty div is where Firebase's
// invisible robot check anchors; it stays mounted through both steps so
// "Send again" can use it. Its badge is hidden; RecaptchaNote says so.
const field = 'min-h-11 w-full rounded-xl border border-white/20 bg-night-950 px-4 py-3 text-base'
function PhoneSignIn({ view, busy, phone, setPhone, codeText, setCodeText, send, confirm, back }) {
  const code = view.name === 'code'
  return (
    <form onSubmit={code ? confirm : send} className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h1 className="font-display text-2xl font-extrabold">{code ? 'Enter the code we texted you' : 'Sign in with your phone number'}</h1>
      <p className="text-slate-300">{code ? `We sent a 6-digit code to ${prettyPhone(view.phone)}. It usually arrives within a minute.` : 'Type the mobile number we have for you and we’ll text you a 6-digit code. No password needed.'}</p>
      {code ? (
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">6-digit code</span>
          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required autoFocus value={codeText} onChange={(e) => setCodeText(e.target.value)}
            className={`${field} text-2xl tracking-[0.3em]`} />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Mobile number</span>
          <input type="tel" inputMode="tel" autoComplete="tel" required autoFocus placeholder="(281) 555-0101" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
        </label>
      )}
      <div id={RECAPTCHA_ID} />
      {view.error && <p className="text-sm text-berry-500" role="alert">{view.error}</p>}
      <button type="submit" disabled={busy} className={`${btn} w-full bg-glow-400 text-night-950 disabled:opacity-60`}>
        {busy ? 'One moment…' : code ? 'Sign in' : 'Text me a code'}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        {code && <button type="button" onClick={() => send()} disabled={busy} className="min-h-11 underline disabled:opacity-60">Didn’t get it? Send again</button>}
        <button type="button" onClick={() => back(code ? 'phone' : 'signin')} disabled={busy} className="min-h-11 text-slate-300 underline disabled:opacity-60">{code ? 'Use a different number' : 'Other ways to sign in'}</button>
      </div>
      <p className="text-xs text-slate-400">It must be a mobile number that gets texts (not a landline). Message and data rates may apply. No code? Use the email link, or call {business.phone}.</p>
    </form>
  )
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
  const invoices = data.invoices ?? []
  const me = list[0]?.customer ?? data.customer ?? invoices[0]?.customer
  const unpaid = invoices.filter((i) => i.state === 'open' || i.state === 'overdue')
  const owed = list.flatMap((p) => p.parts.filter((x) => x.state === 'due')).reduce((t, x) => t + x.amount, 0) + unpaid.reduce((t, i) => t + i.cents, 0)
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold">{me?.name ? `Hi, ${me.name.split(' ')[0]}` : 'Your account'}</h1>
        {me?.address && <p className="text-slate-300">{me.address}</p>}
        <p className="text-sm text-slate-400">Signed in as {data.email || prettyPhone(data.phone)}. <button type="button" onClick={logOut} className="min-h-11 underline">Sign out</button></p>
      </section>
      {data.review?.show && <ReviewCard />}
      {data.details && <DetailsNudge details={data.details} />}
      <Lights schedule={data.schedule} service={data.service} reload={reload} />
      {data.chat && <Chat chat={data.chat} reload={reload} />}
      {data.details && <Details details={data.details} onSaved={reload} />}
      {data.details && <EmailPrefs details={data.details} onSaved={reload} />}
      {data.price && <YearlyPrice price={data.price} />}
      {!list.length && !data.customer && !invoices.length && <Notice title={`Nothing under this ${data.email ? 'email' : 'phone number'} yet`} text={`If you’re a customer, call or text us at ${business.phone} and we’ll link it to your records.`} />}
      <div id="agreements" className="scroll-mt-24 space-y-6">
        {(list.length > 0 || invoices.length > 0) && (
          <p className={`rounded-2xl px-5 py-3 font-semibold ${owed ? 'bg-glow-400/10 text-glow-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
            {owed ? `Due now: ${fmt(owed)}` : 'You’re all paid up. Thank you!'}
          </p>
        )}
        {unpaid.map((i) => <InvoiceCard key={i.token} i={i} reload={reload} />)}
        {list.map((p) => <ProposalCard key={p.token} p={p} reload={reload} />)}
      </div>
      {invoices.length > unpaid.length && <PaidInvoices invoices={invoices.filter((i) => i.state === 'paid')} />}
      {data.price?.history?.length > 0 && <PaymentHistory history={data.price.history} />}
      <GetTheApp />
      <Help />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400">Questions about your lights or a bill?</span>
        {call}
      </div>
    </div>
  )
}

// Your lights this season (docs/specs/account-service.md): the schedule line
// from the season fields staff fill in, and Report a problem, which becomes a
// service call on the Service tab (through the server, never from here).
function Lights({ schedule, service, reload }) {
  const sched = scheduleText(schedule)
  if (!sched && !service) return null
  return (
    <section id="lights" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Your lights{sched?.season ? `, ${sched.season} season` : ''}</h2>
      {sched && !sched.none && (
        <p className="text-lg">
          <span className="text-slate-400">Lights up:</span> <strong>{sched.install}</strong>
          <span className="px-2 text-slate-500">·</span>
          <span className="text-slate-400">Takedown:</span> <strong>{sched.takedown}</strong>
        </p>
      )}
      {sched?.none && <Rebook onDone={reload} />}
      {service && <ReportProblem service={service} />}
      {/* Told plainly, not only in the agreement (owner 2026-10-12). */}
      <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300"><strong className="text-glow-300">{TREE_TITLE}: </strong>{TREE_NOTICE}</p>
    </section>
  )
}

// Chat with us (docs/specs/account-chat.md, owner 2026-10-12): the thread with
// us, kept in our own database. Send goes through the server
// (sendAccountMessage), which tells staff; our replies land here and in an
// email. The page can't listen live, so it re-reads the account when the tab
// comes back and on ↻.
const chatWhen = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }), hour: 'numeric', minute: '2-digit' })
}
const CHAT_SHOW = 12
function Chat({ chat, reload }) {
  const [text, setText] = useState('')
  const [state, setState] = useState(null) // null | 'sending' | 'sent' | 'checking' | { error }
  const [all, setAll] = useState(false)
  const [sent, setSent] = useState(null) // { of: chat, thread }: what the server answered, until the next load
  const thread = sent?.of === chat ? sent.thread : chat
  const messages = thread.messages ?? []
  const shown = all ? messages : messages.slice(-CHAT_SHOW)

  useEffect(() => {
    if (demo || !reload) return
    const onShow = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [reload])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) { setState({ error: 'Write a message first.' }); return }
    setState('sending')
    try {
      const next = demo
        ? { messages: [...messages, { from: 'customer', text: body, at: new Date().toISOString() }], waiting: true, dropped: thread.dropped ?? 0 }
        : (await (await lib).sendAccountMessage(body)).chat
      setSent({ of: chat, thread: next })
      setText('')
      setState('sent')
    } catch (err) {
      setState({ error: err?.message || 'That didn’t send. Please try again, or call us.' })
    }
  }

  async function check() {
    setState('checking')
    try { await reload?.() } finally { setState(null) }
  }

  return (
    <section id="chat" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold">Chat with us</h2>
        {!demo && <button type="button" onClick={check} disabled={state === 'checking'} className="min-h-11 rounded-full px-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-60">↻ {state === 'checking' ? 'Checking…' : 'Check for replies'}</button>}
      </div>
      <p className="text-sm text-slate-300">Ask about your date, your lights, a bill, anything. We answer here and by email, usually within a few hours. Urgent? Call <a href={business.phoneHref} className="underline">{business.phone}</a>.</p>
      {messages.length > 0 && (
        <div className="space-y-2">
          {!all && messages.length > CHAT_SHOW && (
            <button type="button" onClick={() => setAll(true)} className="w-full rounded-xl bg-white/5 py-2 text-sm">Show all {messages.length}{thread.dropped ? ` (${thread.dropped} older ones were dropped)` : ''}</button>
          )}
          <ul className="space-y-2" aria-label="Messages">
            {shown.map((m, i) => (
              <li key={`${m.at}-${i}`} className={`flex ${m.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm ${m.from === 'customer' ? 'bg-glow-400/15 text-slate-50' : 'bg-white/10'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{m.from === 'customer' ? 'You' : business.name} · {chatWhen(m.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {thread.waiting && <p className="text-sm text-glow-300">We’ve got your message and will answer soon.</p>}
      <form onSubmit={send} className="space-y-2">
        <label className="block">
          <span className="sr-only">Your message</span>
          <textarea value={text} onChange={(e) => { setText(e.target.value.slice(0, CHAT_MAX)); if (state !== 'sending') setState(null) }} rows={3} maxLength={CHAT_MAX} placeholder="Type your message…"
            className="w-full rounded-xl border border-white/20 bg-night-950 px-4 py-3 text-base" />
        </label>
        {state?.error && <p className="text-sm text-berry-500" role="alert">{state.error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state === 'sending'} className={`${btn} bg-glow-400 text-night-950 disabled:opacity-60`}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
          {state === 'sent' && <span className="text-sm text-emerald-300">Sent ✓ We’ll answer here and by email.</span>}
          {text.length > CHAT_MAX - 100 && <span className="text-xs text-slate-400">{CHAT_MAX - text.length} characters left</span>}
        </div>
      </form>
    </section>
  )
}

// Your property details (docs/specs/account-service.md, owner 2026-10-12): the
// things the agreement asks customers to tell us, filled in by them and saved
// through the server (updateMyDetails) onto their record; the crew sees them
// on the route.
const DETAIL_INPUTS = [
  ['gateCode', 'Gate code', 'input', 'e.g. #1234'],
  ['hoa', 'HOA (name, any rules about lights)', 'input', 'e.g. Shadow Creek Ranch HOA'],
  ['lightsDownBy', 'Date your HOA wants lights down by (if any)', 'input', 'e.g. Jan 10'],
  ['hazards', 'Things in the yard we should avoid', 'textarea', 'Sprinkler heads, landscape lights and their wires, pet-fence wire, cameras, fragile plants…'],
  ['pets', 'Pets', 'input', 'e.g. two dogs, friendly; keep the gate shut'],
]
// Google review card for past customers (docs/specs/review-ask.md → On the
// account page). Shown when the server says so (myAccount → review), until
// staff mark They reviewed; this device remembers a tap or "Not now" (reviewCard.js).
function ReviewCard() {
  const [off, setOff] = useState(reviewCardHidden)
  const [thanked, setThanked] = useState(false)
  if (off) return null
  const tapped = () => { setThanked(true); saveReviewCard('done') }
  const later = () => { setOff(true); saveReviewCard(laterValue()) }
  return (
    <section aria-label="Google review" className="space-y-3 rounded-3xl border border-glow-400/40 bg-glow-400/10 p-5">
      <h2 className="font-display text-xl font-extrabold">{accountReviewCard.title}</h2>
      {thanked
        ? <p className="text-glow-300">{accountReviewCard.thanks}</p>
        : <>
          <p className="text-slate-200">{accountReviewCard.text}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={business.reviewLink} target="_blank" rel="noreferrer" onClick={tapped} className={`${btn} bg-glow-400 px-5 py-3 text-night-950`}>{accountReviewCard.button}</a>
            <button type="button" onClick={later} className="min-h-11 px-2 text-slate-400 underline">{accountReviewCard.later}</button>
          </div>
        </>}
    </section>
  )
}

// First sign-in nudge (owner 2026-10-12): most customers get their account
// before the crew comes, so ask once for the details while they're here.
// Goes away once anything is filled in, or when dismissed on this device.
const NUDGE_KEY = 'clcDetailsNudgeOff'
function DetailsNudge({ details }) {
  const [off, setOff] = useState(() => { try { return localStorage.getItem(NUDGE_KEY) === '1' } catch { return false } })
  const empty = DETAIL_INPUTS.every(([k]) => !String(details?.[k] ?? '').trim())
  if (!empty || off) return null
  const dismiss = () => { setOff(true); try { localStorage.setItem(NUDGE_KEY, '1') } catch { /* fine */ } }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glow-400/50 bg-glow-400/10 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-slate-200"><strong className="text-glow-300">Two minutes before we come:</strong> add your gate code, anything in the yard we should avoid, and pets, so the crew is ready.</p>
      <a href="#property-details" className={`${btn} bg-glow-400 px-4 py-2 text-night-950`}>Fill it in</a>
      <button type="button" onClick={dismiss} aria-label="Not now" className="min-h-11 px-2 text-slate-400">✕</button>
    </div>
  )
}

function Details({ details, onSaved }) {
  const [v, setV] = useState(details)
  const [state, setState] = useState(null) // null | 'saving' | 'saved' | { error }
  const changed = DETAIL_INPUTS.some(([k]) => (v[k] ?? '') !== (details[k] ?? ''))
  async function save(e) {
    e.preventDefault()
    setState('saving')
    try {
      // Only the text fields: the email switch (EmailPrefs) saves itself.
      if (!demo) await (await lib).updateMyDetails(Object.fromEntries(DETAIL_INPUTS.map(([k]) => [k, v[k] ?? ''])))
      setState('saved')
      onSaved?.()
    } catch (err) {
      setState({ error: err?.message || 'That didn’t save. Please try again, or call us.' })
    }
  }
  const field = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100'
  return (
    <form id="property-details" onSubmit={save} className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Your property details</h2>
      <p className="text-sm text-slate-300">Helps our crew do a clean job: they see this on the day. Change it any time.</p>
      {DETAIL_INPUTS.map(([k, label, kind, placeholder]) => (
        <label key={k} className="block text-sm text-slate-300">{label}
          {kind === 'textarea'
            ? <textarea value={v[k] ?? ''} rows={3} maxLength={600} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setState(null) }} placeholder={placeholder} className={field} />
            : <input value={v[k] ?? ''} maxLength={160} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setState(null) }} placeholder={placeholder} className={field} />}
        </label>
      ))}
      {state?.error && <p className="text-sm text-berry-500" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!changed || state === 'saving'} className={`${btn} bg-glow-400 text-night-950 disabled:opacity-50`}>{state === 'saving' ? 'Saving…' : 'Save'}</button>
        {state === 'saved' && <span className="text-sm text-emerald-300">Saved ✓ Thank you.</span>}
      </div>
    </form>
  )
}

const OPEN_TEXT = { Open: 'We’ve got it', Scheduled: 'On the schedule' }
function ReportProblem({ service }) {
  const [mode, setMode] = useState('idle') // idle | form | sent
  const [problem, setProblem] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reported, setReported] = useState(null)
  const open = reported ?? service.open

  async function send(e) {
    e.preventDefault()
    if (!problem) { setError('Pick what’s wrong first.'); return }
    setBusy(true)
    setError('')
    try {
      const r = demo
        ? { open: { id: 'demo', issue: REPORT_ISSUES.find((i) => i.key === problem).issue, received: new Date().toISOString().slice(0, 10), status: 'Open', source: 'customer', details: note.trim() } }
        : await (await lib).reportProblem(problem, note)
      setReported(r.open)
      setMode('sent')
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again, or call us.')
    } finally {
      setBusy(false)
    }
  }

  if (open) {
    return (
      <div className="space-y-2 rounded-2xl bg-glow-400/10 px-4 py-3">
        {mode === 'sent' && <p className="font-semibold text-glow-300">Got it! We’ll be out within {service.days} days. If it’s urgent, call {business.phone}.</p>}
        <p><span className="font-semibold">🛠 {OPEN_TEXT[open.status] ?? open.status}:</span> {open.issue}{open.received ? `, reported ${shortDate(open.received)}` : ''}</p>
        {open.details && <p className="text-sm text-slate-300">“{open.details}”</p>}
        {mode !== 'sent' && <p className="text-sm text-slate-400">Something else, or it’s urgent? Call or text us at <a href={business.phoneHref} className="underline">{business.phone}</a>.</p>}
      </div>
    )
  }
  if (mode === 'form') {
    return (
      <form onSubmit={send} className="space-y-3">
        <p className="font-semibold">What’s wrong?</p>
        <div className="space-y-2">
          {REPORT_ISSUES.map((i) => (
            <label key={i.key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 ${problem === i.key ? 'border-glow-400 bg-glow-400/10' : 'border-white/15'}`}>
              <input type="radio" name="problem" value={i.key} checked={problem === i.key} onChange={() => setProblem(i.key)} className="size-4 shrink-0 accent-glow-400" />
              <span>{i.label}</span>
            </label>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Anything that helps us find it (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))} rows={3} placeholder="Which side of the house, since when…"
            className="w-full rounded-xl border border-white/20 bg-night-950 px-4 py-3 text-base" />
        </label>
        <p className="text-sm text-slate-400">Photos from here are coming soon. For now, you can text one to {business.phone}.</p>
        {error && <p className="text-sm text-berry-500" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={`${btn} bg-glow-400 text-night-950 disabled:opacity-60`}>{busy ? 'Sending…' : 'Send report'}</button>
          <button type="button" onClick={() => setMode('idle')} className={`${btn} border border-white/20`}>Cancel</button>
        </div>
      </form>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-slate-300">Something out? Tell us and we’ll fix it, free.</p>
      <button type="button" onClick={() => setMode('form')} className={`${btn} bg-white text-night-950`}>🛠 Report a problem</button>
    </div>
  )
}

// The account on their home screen (docs/specs/customer-app.md). Gone once
// they're in the installed app.
function GetTheApp() {
  const { installed } = useInstall()
  if (installed) return null
  return (
    <section id="app" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Get the app</h2>
      <p className="text-sm text-slate-300">Put Christmas Light Creations on your phone’s home screen: opens full-screen, no password, always up to date.</p>
      <p className="text-sm text-glow-300">Phone notifications of any kind only work from the installed app. Without it, you get email only.</p>
      <InstallButtons app="Christmas Light Creations" signIn="sign in the same way" />
    </section>
  )
}

// How the yearly re-install price is built (docs/specs/add-ons.md). Only the
// current yearly price: no lifetime totals (owner's request).
const signed = (c) => (c < 0 ? `−${fmt(-c)}` : `+${fmt(c)}`)
function YearlyPrice({ price }) {
  const y = yearlyPrice(price, seasonYear())
  if (y.yearlyCents == null) return null
  return (
    <section id="price" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Your yearly price</h2>
      <p className="text-sm text-slate-300">You own your lights. Each year we put them back up for less than they first cost (usually {REINSTALL_PCT}%). Anything you add is charged in full the year it’s added, then adds to the yearly price after that.</p>
      <table className="w-full text-left text-sm">
        <tbody>
          <tr>
            <td className="py-2 pr-2">Re-install of your original lights{y.since ? ` (${y.since})` : ''}{!y.baseCustom && <span className="block text-xs text-slate-400">{REINSTALL_PCT}% of {fmt(y.originalCents)}</span>}</td>
            <td className="py-2 text-right tabular-nums">{fmt(y.baseCents)}</td>
          </tr>
          {y.lines.map((l, i) => (
            <tr key={i} className="border-t border-white/10">
              <td className="py-2 pr-2">{l.kind === 'change' ? l.what : `＋ ${l.what}`}<span className="block text-xs text-slate-400">{l.kind === 'change' ? `price change from ${l.season}` : `added ${l.season}${l.custom ? '' : ` · ${REINSTALL_PCT}% of ${fmt(l.priceCents)}`}`}</span></td>
              <td className="py-2 text-right tabular-nums">{signed(l.addsCents)}</td>
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
        <p key={i} className="rounded-2xl bg-white/5 px-4 py-2 text-sm">New this season: {l.what}{l.priceCents ? ` (${fmt(l.priceCents)}, charged in full this year)` : ''}. From next season it adds {fmt(l.addsCents)} a year.</p>
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
    <section id="history" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
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

// An invoice still to pay: what it's for, when it's due, Pay (same PayPal buttons).
const invoiceLink = (token) => `${import.meta.env.BASE_URL}invoice/?t=${token}`
function InvoiceCard({ i, reload }) {
  const late = i.state === 'overdue'
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold">Invoice {i.number}</h2>
          <p className="text-sm text-slate-400">{KIND_SHORT[i.kind] ?? ''}{i.season ? `, ${i.season} season` : ''}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm ${late ? 'bg-berry-600/30 text-berry-500' : 'bg-glow-400/10 text-glow-300'}`}>{late ? 'Overdue' : 'Due'}</span>
      </div>
      <p className="flex justify-between gap-3 font-semibold"><span>{late ? `Was due ${longDate(i.dueDate)}` : i.dueDate > i.sentDay ? `Due ${longDate(i.dueDate)}` : 'Due on receipt'}</span><span className="tabular-nums">{fmt(i.cents)}</span></p>
      <a href={invoiceLink(i.token)} className={`${btn} bg-white text-night-950`}>View or print the invoice</a>
      <DepositPanel token={i.token} of="invoice" title={`Pay invoice ${i.number}`} note={`${late ? 'Past due.' : 'Thank you!'} By paying you agree to the seasonal service terms on your invoice.`} amountLabel={fmt(i.cents)} onPaid={reload} />
    </section>
  )
}

// Paid invoices, newest first, each with its receipt. No total (owner's request).
function PaidInvoices({ invoices }) {
  return (
    <section id="paid" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Paid invoices</h2>
      <ul className="divide-y divide-white/10 text-sm">
        {invoices.map((i) => (
          <li key={i.token} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>{i.number} · {KIND_SHORT[i.kind] ?? ''} {i.season}<span className="block text-emerald-300">Paid ✓ {fmt(i.paid?.cents ?? i.cents)}{i.paid?.method ? ` by ${i.paid.method}` : ''}{i.paid?.date ? `, ${longDate(i.paid.date)}` : ''}{i.paid?.sandbox ? ' (test)' : ''}</span></span>
            <a href={invoiceLink(i.token)} className="min-h-11 content-center underline">Receipt</a>
          </li>
        ))}
      </ul>
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
              <td className="py-2">{partLabel(p, x.part)}</td>
              <td className={`py-2 text-right tabular-nums ${x.state === 'free' ? 'font-semibold text-emerald-300' : ''}`}>{x.state === 'free' ? 'Free' : fmt(x.state === 'paid' ? x.paid : x.amount)}</td>
              <td className={`py-2 text-right ${STATE_CLASS[x.state]}`}>{x.state === 'later' && x.due ? `Due ${dueText(x.due)}` : STATE_TEXT[x.state]}{x.state === 'paid' && x.sandbox ? ' (test)' : ''}</td>
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
        <DepositPanel key={x.part} token={p.token} part={x.part} title={payTitle(p, x.part)} note={payNote(p, x.part)} amountLabel={fmt(x.amount)} onPaid={reload} />
      ))}
    </section>
  )
}

// Email preferences (owner 2026-10-12): weather heads-ups and seasonal tips
// can be turned off here; agreements, bills, payment reminders, scheduling and
// replies always come through. Saved onto their record (emailNotices).
function EmailPrefs({ details, onSaved }) {
  const [on, setOn] = useState(details.emailNotices !== false)
  const [state, setState] = useState(null) // null | 'saving' | 'saved' | { error }
  async function toggle(next) {
    setOn(next)
    setState('saving')
    try {
      if (!demo) await (await lib).updateMyDetails({ emailNotices: next })
      setState('saved')
      onSaved?.()
    } catch (err) {
      setOn(!next)
      setState({ error: err?.message || 'That didn’t save. Please try again, or call us.' })
    }
  }
  return (
    <section id="emails" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Email preferences</h2>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} disabled={state === 'saving'} onChange={(e) => toggle(e.target.checked)} className="mt-1 size-5 accent-glow-400" />
        <span className="text-slate-200"><span className="font-semibold">Weather heads-ups and seasonal tips</span><span className="block text-sm text-slate-400">When storms, strong wind or a freeze are coming: what usually goes wrong with lights and the one thing that fixes it.</span></span>
      </label>
      <p className="text-sm text-slate-400">Agreements, bills, payment reminders, scheduling and replies to you always come through.</p>
      {state === 'saved' && <p className="text-sm text-emerald-300">Saved ✓</p>}
      {state?.error && <p className="text-sm text-berry-500" role="alert">{state.error}</p>}
    </section>
  )
}

// Help (owner 2026-10-12: self-help with a search box, since we don't run a
// tech-support line). Answers in src/data/help.js; shown signed in and out.
function Help() {
  const [q, setQ] = useState('')
  const list = searchHelp(q)
  return (
    <section id="help" className="scroll-mt-24 space-y-3 rounded-3xl border border-white/10 bg-night-900 p-5">
      <h2 className="font-display text-xl font-extrabold">Help</h2>
      <label className="block text-sm text-slate-300">Search for an answer
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. lights out, pay, gate code, app"
          className="mt-1 block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100" />
      </label>
      {list.length ? (
        <ul className="divide-y divide-white/10">
          {list.map((h) => (
            <li key={h.id}>
              <details className="group py-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                  {h.q}<Icon name="chevron" className="size-5 shrink-0 text-glow-400 transition group-open:rotate-180" />
                </summary>
                <p className="pb-3 text-sm text-slate-300">{h.a}</p>
              </details>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-300">Nothing matches that. Call or text {business.phone} and a person will help.</p>}
    </section>
  )
}

// "Yes, put my lights back up" (functions/rebook.js, owner 2026-10-13): one
// tap instead of a call. Shown only while they aren't on this season's list.
function Rebook({ onDone }) {
  const [week, setWeek] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState(null) // null | 'sending' | 'done' | 'already' | { error }
  async function go() {
    setState('sending')
    try {
      const r = demo ? { booked: true } : await (await lib).rebookMe(week, note)
      setState(r?.booked ? 'done' : 'already')
      if (!demo) onDone?.()
    } catch (err) {
      setState({ error: err?.message || 'That didn’t go through. Call or text us and we’ll book you.' })
    }
  }
  if (state === 'done') return <p className="rounded-2xl bg-pine-500/15 px-4 py-3 text-pine-500"><strong>You’re on the list ✓</strong> We’ll text you your install date as the schedule fills in.</p>
  if (state === 'already') return <p className="rounded-2xl bg-pine-500/15 px-4 py-3 text-pine-500">You’re already on this season’s list. We’ll text you your date.</p>
  return (
    <div className="space-y-3 rounded-2xl border border-glow-400/40 bg-glow-400/10 p-4">
      <p className="text-slate-200"><strong className="text-glow-300">Want your lights back up this season?</strong> One tap and you’re on the list; no call needed.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Which week suits you?">
        {WEEKS.map((w) => (
          <button key={w} type="button" onClick={() => setWeek(week === w ? '' : w)} aria-pressed={week === w}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${week === w ? 'border-glow-400 bg-glow-400/20 text-glow-300' : 'border-white/15 text-slate-200'}`}>{w}</button>
        ))}
      </div>
      <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Anything changed? New color, more lights, a gate code… (optional)"
        className="block w-full rounded-xl border border-white/15 bg-night-950 px-4 py-3 text-base text-slate-100" />
      {state?.error && <p className="text-sm text-berry-500" role="alert">{state.error}</p>}
      <button type="button" onClick={go} disabled={state === 'sending'} className={`${btn} w-full bg-glow-400 text-night-950 disabled:opacity-50`}>
        {state === 'sending' ? 'One moment…' : 'Yes, put my lights back up'}
      </button>
    </div>
  )
}
