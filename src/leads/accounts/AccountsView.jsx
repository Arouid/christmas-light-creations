import { useEffect, useMemo, useRef, useState } from 'react'
import { buildIndex, searchAccounts } from '../../lib/accountSearch'
import { gateFor } from '../../lib/customers'
import { money, parseMoney } from '../../lib/discounts'
import { findCustomer } from '../../lib/oldEstimates'
import { getCustomerLogin, loginLine } from '../../lib/customerLogins'
import Icon from '../../components/Icon'
import { demoMode } from '../demo'
import AddToRoute from '../AddToRoute'
import ComposeEmail from '../ComposeEmail'
import DesignsPanel from '../designs/DesignsPanel'
import ProposalsPanel from '../proposals/ProposalsPanel'
import { TextButton } from '../Reach'
import StreetViewPhoto from '../StreetViewPhoto'
import TextHistory from '../TextHistory'

const KIND = { customer: ['Customer', 'bg-emerald-500/20 text-emerald-300'], lead: ['Website lead', 'bg-glow-400/20 text-glow-300'], past: ['Past request', 'bg-white/10 text-slate-300'] }
const shape = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium'
const action = `${shape} bg-white/10 hover:bg-white/15`
const primary = `${shape} bg-glow-400 font-semibold text-night-950 hover:bg-glow-300` // one background class only
const RECENT_KEY = 'clcRecentAccounts'
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? [] } catch { return [] } }
const saveRecent = (list) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8))) } catch { /* private mode: fine */ } }

// #accounts                → search
// #accounts/customer/<id>  → that account (back button returns to search)
const keyFromHash = () => { const m = window.location.hash.match(/^#accounts\/(customer|lead|past)\/(.+)$/); return m ? `${m[1]}:${decodeURIComponent(m[2])}` : null }
const openKey = (key) => { const [kind, ...id] = key.split(':'); window.location.hash = `#accounts/${kind}/${encodeURIComponent(id.join(':'))}` }

function Section({ title, children, open = true }) {
  return (
    <details open={open} className="rounded-2xl border border-white/10 bg-night-900">
      <summary className="cursor-pointer px-4 py-3 font-semibold">{title}</summary>
      <div className="border-t border-white/10 p-4">{children}</div>
    </details>
  )
}

function SearchBox({ index, autoFocus, compact, onPick }) {
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const results = useMemo(() => searchAccounts(index, q), [index, q])
  const pick = (e) => { setQ(''); onPick(e.key) }
  return (
    <div className="relative">
      <div className={`flex items-center gap-3 rounded-full border border-white/20 bg-night-900 px-5 shadow-lg focus-within:border-glow-400 ${compact ? 'py-2.5' : 'py-4'}`}>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={q} autoFocus={autoFocus} onChange={(e) => { setQ(e.target.value); setHi(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
            if (e.key === 'Enter' && results[hi]) pick(results[hi])
          }}
          placeholder="Search name, street, phone, email or gate code" aria-label="Search accounts"
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500 ${compact ? 'text-base' : 'text-lg'}`} />
      </div>
      {q.trim() && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-night-900 shadow-2xl" role="listbox">
          {results.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === hi}>
              <button type="button" onMouseEnter={() => setHi(i)} onClick={() => pick(e)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${i === hi ? 'bg-white/10' : ''}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name || e.email || e.phone}</span>
                  <span className="block truncate text-sm text-slate-400">{[e.address, e.phone].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${KIND[e.kind][1]}`}>{KIND[e.kind][0]}</span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-4 py-4 text-sm text-slate-400">No one matches “{q}”.</li>}
        </ul>
      )}
    </div>
  )
}

function SeasonRows({ customer }) {
  const years = Object.keys(customer.seasons ?? {}).sort().reverse()
  if (!years.length) return <p className="text-sm text-slate-400">No seasons on file yet.</p>
  const billed = years.reduce((t, y) => t + (parseMoney(customer.seasons[y]?.install?.total) ?? 0), 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr><th className="py-1.5 pr-3">Season</th><th className="pr-3">Install</th><th className="pr-3">Date</th><th className="pr-3">Total</th><th className="pr-3">Paid</th><th>Takedown</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {years.map((y) => {
              const s = customer.seasons[y] ?? {}
              return (
                <tr key={y}>
                  <td className="py-2 pr-3 font-semibold">{y}</td>
                  <td className="pr-3">{s.installStatus || '—'}</td>
                  <td className="pr-3">{s.plannedDate || s.weekOf || '—'}</td>
                  <td className="pr-3">{s.install?.total || s.install?.rate || '—'}{s.install?.discount && s.install.discount !== '0' ? <span className="text-xs text-slate-400"> ({s.install.discount} off)</span> : ''}</td>
                  <td className="pr-3">{s.install?.paid || '—'}{s.install?.paymentType ? <span className="text-xs text-slate-400"> · {s.install.paymentType}</span> : ''}</td>
                  <td>{s.takedownStatus || '—'}{s.takedown?.paid ? <span className="text-xs text-slate-400"> · paid {s.takedown.paid}</span> : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-400">{years.length} season{years.length === 1 ? '' : 's'} on file{billed ? ` · ${money(billed)} in install totals` : ''}{customer.since ? ` · customer since ${customer.since}` : ''}</p>
    </div>
  )
}

function Header({ name, kind, address, lines, loginEmail, children }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-night-900">
      {address && <div className="[&_img]:max-h-80 [&_img]:w-full [&_img]:object-cover"><StreetViewPhoto address={address} /></div>}
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-extrabold">{name}</h2>
            <p className="text-slate-300">{address || 'No address on file'}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${KIND[kind][1]}`}>{KIND[kind][0]}</span>
        </div>
        {lines.filter(Boolean).length > 0 && <p className="text-sm text-slate-400">{lines.filter(Boolean).join(' · ')}</p>}
        <LoginLine email={loginEmail} />
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  )
}

// "Customer login: last signed in … · first …" / "never", matched by email.
// Hidden when there's no email or it can't be read (rules not yet republished).
function LoginLine({ email }) {
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!email) return
    let live = true
    const demo = { firstAt: new Date('2026-10-10T15:05:00'), lastAt: new Date('2026-10-12T14:40:00'), provider: 'Google' }
    ;(demoMode ? Promise.resolve(demo) : getCustomerLogin(email))
      .then((rec) => { if (live) setState({ email, text: loginLine(rec) }) })
      .catch(() => { if (live) setState(null) })
    return () => { live = false }
  }, [email])
  if (!email || state?.email !== email) return null
  return <p className="text-sm text-slate-400">{state.text}</p>
}

const mapLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

function CustomerAccount({ c, leads, past, calls, gates, season, user, onOpenCustomer }) {
  const gate = gateFor(c, gates)
  const phone = String(c.phone ?? '').replace(/\D/g, '')
  const myCalls = calls.filter((x) => x.customerId === c.id)
  const myLeads = leads.filter((l) => l.customerId === c.id)
  const myPast = past.filter((p) => p.customerId === c.id || findCustomer(p, [c]))
  return (
    <div className="space-y-4">
      <Header name={c.fullName} kind="customer" address={c.address} loginEmail={c.email}
        lines={[c.phone, c.email, c.locationBlock, c.neighborhood && `Neighborhood: ${c.neighborhood}`, gate && `Gate ${gate.code}`, c.installType]}>
        {phone && <a className={action} href={`tel:${phone}`}><Icon name="phone" className="size-4" /> Call</a>}
        <TextButton phone={c.phone} className={action} />
        <ComposeEmail person={c} season={season} className={action} />
        {c.address && <a className={action} href={mapLink(c.address)} target="_blank" rel="noreferrer">Map</a>}
        <AddToRoute customers={[c]} className={action} />
        <button type="button" onClick={() => onOpenCustomer(c.id)} className={primary}>Edit details</button>
      </Header>
      <Section title="Seasons"><SeasonRows customer={c} /></Section>
      {c.notes && <Section title="Notes"><p className="whitespace-pre-wrap text-sm text-slate-300">{c.notes}</p></Section>}
      <Section title={`Service calls (${myCalls.length})`} open={myCalls.some((x) => x.status === 'Open' || x.status === 'Scheduled')}>
        {myCalls.length ? (
          <ul className="divide-y divide-white/5 text-sm">
            {myCalls.map((x) => <li key={x.id} className="py-2"><span className="font-medium">{x.issue}</span> <span className="text-slate-400">· {x.received} · {x.status}{x.details ? ` · ${x.details}` : ''}</span></li>)}
          </ul>
        ) : <p className="text-sm text-slate-400">None.</p>}
      </Section>
      <Section title="🎨 Light designs" open={false}><DesignsPanel owner={{ type: 'customer', id: c.id, name: c.fullName, address: c.address }} /></Section>
      <Section title="📝 Proposals & contracts" open={false}><ProposalsPanel owner={{ type: 'customer', id: c.id, name: c.fullName, address: c.address, email: c.email, phone: c.phone, installType: c.installType }} /></Section>
      <Section title="Text & call history" open={false}><TextHistory user={user} customerId={c.id} /></Section>
      {(myLeads.length > 0 || myPast.length > 0) && (
        <Section title="Website requests" open={false}>
          <ul className="space-y-2 text-sm">
            {myLeads.map((l) => <li key={l.id} className="rounded-xl bg-white/5 p-3"><span className="text-slate-400">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ''} · new site · </span>{l.message}</li>)}
            {myPast.flatMap((p) => (p.requests ?? []).map((r) => <li key={p.id + r.date} className="rounded-xl bg-white/5 p-3"><span className="text-slate-400">{r.date} · old site · </span>{r.message || '(no message)'}</li>))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function LeadAccount({ l, season, onMakeCustomer, onOpenAccount }) {
  const address = [l.address, l.city, 'TX', l.zip].filter(Boolean).join(', ')
  const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim()
  const phone = String(l.phone ?? '').replace(/\D/g, '')
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-4">
      <Header name={name} kind="lead" address={address} loginEmail={l.email} lines={[l.phone, l.email, l.contactMethod && `Prefers ${l.contactMethod}`, l.source && `Heard from: ${l.source}`, l.status]}>
        {phone && <a className={action} href={`tel:${phone}`}><Icon name="phone" className="size-4" /> Call</a>}
        <TextButton phone={l.phone} className={action} />
        <ComposeEmail person={{ fullName: name, firstName: l.firstName, email: l.email, address }} season={season} start="estimate-thanks" className={action} />
        <a className={action} href={mapLink(address)} target="_blank" rel="noreferrer">Map</a>
        {onMakeCustomer && <button type="button" disabled={busy} onClick={async () => { setBusy(true); const id = await onMakeCustomer(l); onOpenAccount(`customer:${id}`) }} className={primary}>{busy ? 'Adding…' : '＋ Make customer'}</button>}
      </Header>
      {l.message && <Section title="Their request"><p className="whitespace-pre-wrap text-sm text-slate-300">{l.message}</p>{l.notes && <p className="mt-2 text-sm text-slate-400">Notes: {l.notes}</p>}</Section>}
      <Section title="🎨 Light designs" open={false}><DesignsPanel owner={{ type: 'lead', id: l.id, name, address }} /></Section>
      <Section title="📝 Proposals & contracts" open={false}><ProposalsPanel owner={{ type: 'lead', id: l.id, name, address, email: l.email, phone: l.phone }} /></Section>
    </div>
  )
}

function PastAccount({ p, onMakeCustomer, onOpenAccount }) {
  const phone = String(p.phone ?? '').replace(/\D/g, '')
  const address = [p.address, p.city].filter(Boolean).join(', ')
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-4">
      <Header name={p.fullName} kind="past" address={address} lines={[p.phone, p.email, p.status, p.lastAsked && `Last asked ${p.lastAsked}`]}>
        {phone && <a className={action} href={`tel:${phone}`}><Icon name="phone" className="size-4" /> Call</a>}
        <TextButton phone={p.phone} className={action} />
        {onMakeCustomer && <button type="button" disabled={busy} onClick={async () => { setBusy(true); const id = await onMakeCustomer(p); onOpenAccount(`customer:${id}`) }} className={primary}>{busy ? 'Adding…' : '＋ Make customer'}</button>}
      </Header>
      <Section title={`Their requests (${p.requests?.length ?? 0})`}>
        <ul className="space-y-2 text-sm">{(p.requests ?? []).map((r) => <li key={r.date + r.message} className="rounded-xl bg-white/5 p-3"><span className="text-slate-400">{r.date} · </span>{r.message || '(no message)'}</li>)}</ul>
        {p.notes && <p className="mt-2 text-sm text-slate-400">Notes: {p.notes}</p>}
      </Section>
    </div>
  )
}

// Accounts tab: a search box for everyone, and one page per person.
export default function AccountsView({ customers, leads = [], past = [], calls = [], gates = [], season, user, onOpenCustomer, onMakeLeadCustomer, onMakePastCustomer }) {
  const [key, setKey] = useState(keyFromHash)
  const [recent, setRecent] = useState(readRecent)
  const index = useMemo(() => buildIndex({ customers, leads, past }), [customers, leads, past])
  const top = useRef(null)

  useEffect(() => {
    const onHash = () => setKey(keyFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function open(k) {
    const next = [k, ...recent.filter((x) => x !== k)]
    setRecent(next)
    saveRecent(next)
    openKey(k)
    top.current?.scrollIntoView()
  }

  const [kind, ...rest] = (key ?? '').split(':')
  const id = rest.join(':')
  const entry = key && index.find((e) => e.key === key)
  const c = kind === 'customer' && customers.find((x) => x.id === id)
  const l = kind === 'lead' && leads.find((x) => x.id === id)
  const p = kind === 'past' && past.find((x) => x.id === id)

  if (!key) {
    return (
      <div ref={top} className="mx-auto max-w-2xl pt-[12vh]">
        <h1 className="mb-6 text-center font-display text-4xl font-extrabold">Accounts</h1>
        <SearchBox index={index} autoFocus onPick={open} />
        <p className="mt-4 text-center text-sm text-slate-400">{customers.length} customers · {leads.filter((x) => !x.customerId).length} website leads · {past.length} past requests</p>
        {recent.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Recently viewed</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((k) => { const e = index.find((x) => x.key === k); return e ? <button key={k} type="button" onClick={() => open(k)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">{e.name || e.email}</button> : null })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={top} className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <a href="#accounts" className="shrink-0 rounded-full bg-white/10 px-3 py-2.5 text-sm font-semibold" aria-label="Back to search">←</a>
        <div className="flex-1"><SearchBox index={index} compact onPick={open} /></div>
      </div>
      {c ? <CustomerAccount c={c} leads={leads} past={past} calls={calls} gates={gates} season={season} user={user} onOpenCustomer={onOpenCustomer} />
        : l ? <LeadAccount l={l} season={season} onMakeCustomer={onMakeLeadCustomer} onOpenAccount={open} />
          : p ? <PastAccount p={p} onMakeCustomer={onMakePastCustomer} onOpenAccount={open} />
            : <p className="text-slate-400">{entry === undefined && customers ? 'This account isn’t loaded yet, or it was removed.' : 'Loading…'}</p>}
    </div>
  )
}
