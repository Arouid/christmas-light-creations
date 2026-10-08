import { useMemo, useState } from 'react'
import { business } from '../data/content'
import { LEAD_STATUSES, STATUS_LABELS } from '../lib/firebase'
import LeadCard from './LeadCard'
import { useLeads } from './useLeads'

function Screen({ children }) {
  return <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-5 p-6 text-center">{children}</main>
}

export default function LeadsApp() {
  const { user, leads, error, signIn, signOut, updateLead, demo } = useLeads()
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [signInError, setSignInError] = useState(false)

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]))
    leads?.forEach((l) => { c[l.status] = (c[l.status] ?? 0) + 1 })
    return c
  }, [leads])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (leads ?? []).filter((l) =>
      (filter === 'all' || (filter === 'open' ? !['booked', 'lost'].includes(l.status) : l.status === filter))
      && (!q || [l.firstName, l.lastName, l.city, l.address, l.phone, l.email].join(' ').toLowerCase().includes(q)))
  }, [leads, filter, search])

  if (user === undefined) return <Screen><p className="text-slate-400">Loading…</p></Screen>

  if (!user) {
    return (
      <Screen>
        <img src={business.logo} alt={business.name} className="h-16" />
        <h1 className="font-display text-3xl font-extrabold">Leads</h1>
        <p className="text-slate-400">Staff only. Sign in with the Google account your manager added.</p>
        <button type="button" onClick={() => signIn().catch(() => setSignInError(true))}
          className="w-full rounded-full bg-glow-400 py-3.5 font-semibold text-night-950">Sign in with Google</button>
        {signInError && <p className="text-sm text-berry-500" role="alert">Sign-in didn’t finish. Try again.</p>}
      </Screen>
    )
  }

  if (error === 'not-staff') {
    return (
      <Screen>
        <h1 className="font-display text-2xl font-extrabold">Not on the staff list</h1>
        <p className="text-slate-400">
          <span className="break-all font-medium text-slate-200">{user.email}</span> doesn’t have access yet. Ask the owner to add this email.
        </p>
        <button type="button" onClick={signOut} className="rounded-full border border-white/20 px-6 py-3 font-semibold">Use another account</button>
      </Screen>
    )
  }

  const chips = [['open', 'Open', (counts.new ?? 0) + (counts.called ?? 0) + (counts['estimate-sent'] ?? 0)],
    ...LEAD_STATUSES.map((s) => [s, STATUS_LABELS[s], counts[s]]), ['all', 'All', leads?.length ?? 0]]

  return (
    <div className="min-h-svh">
      {demo && (
        <p className="bg-berry-600 px-4 py-2 text-center text-sm font-medium">
          Preview with sample data. Not connected to Firebase yet.
        </p>
      )}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-night-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold">Leads</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden truncate text-slate-400 sm:inline">{user.email}</span>
            {!demo && <button type="button" onClick={signOut} className="rounded-full border border-white/20 px-3 py-1.5">Sign out</button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-4">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, phone…"
          className="block w-full rounded-xl border border-white/15 bg-night-900 px-4 py-3 text-base placeholder:text-slate-500" />
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Filter by status">
          {chips.map(([key, label, n]) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${filter === key ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
              {label} <span className="opacity-70">{n}</span>
            </button>
          ))}
        </div>

        {error && error !== 'not-staff' && <p className="mt-6 text-berry-500" role="alert">Couldn’t load leads: {error}</p>}
        {leads === null && !error && <p className="mt-6 text-slate-400">Loading leads…</p>}
        {leads && shown.length === 0 && <p className="mt-6 text-slate-400">No leads here.</p>}
        <ul className="mt-3 space-y-3">
          {shown.map((l) => <LeadCard key={l.id} lead={l} onUpdate={updateLead} />)}
        </ul>
      </main>
    </div>
  )
}
