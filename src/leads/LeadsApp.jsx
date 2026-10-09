import { useEffect, useState } from 'react'
import { business } from '../data/content'
import { leadToCustomer, seasonYear } from '../lib/customers'
import CustomerDetail from './CustomerDetail'
import CustomersView from './CustomersView'
import GatesView from './GatesView'
import ImportView from './ImportView'
import LeadsView from './LeadsView'
import MapView from './MapView'
import SeasonView from './SeasonView'
import SettingsPanel from './SettingsPanel'
import { VoiceAccount, getTextFrom, saveTextFrom } from './voice'
import { DiscountSchedule } from './discountContext'
import { DEFAULT_SCHEDULE } from '../lib/discounts'
import { mergeTemplates } from '../lib/emailTemplates'
import EmailsView from './EmailsView'
import PastRequestsView from './PastRequestsView'
import SignsView from './SignsView'
import RouteView from './RouteView'
import { EmailTemplates } from './templatesContext'
import ServiceView from './ServiceView'
import ViewEditor from './ViewEditor'
import ViewTab from './ViewTab'
import { mergeMany } from './staffStore'
import { useCustomers } from './useCustomers'
import { useLeads } from './useLeads'
import { useGateCodes, usePastRequests, useServiceCalls, useSettings, useSigns, useViews } from './useStaffLists'

// Built-in tabs; custom tabs (saved views) go after Season as #view-<id>.
const BEFORE = [['map', 'Map'], ['leads', 'Leads'], ['customers', 'Customers'], ['season', 'Season'], ['route', 'Route']]
const AFTER = [['signs', 'Signs'], ['past', 'Past requests'], ['emails', 'Emails'], ['service', 'Service'], ['gates', 'Gates'], ['import', 'Import']]

function Screen({ children }) {
  return <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-5 p-6 text-center">{children}</main>
}

const tabFromHash = () => {
  const h = window.location.hash.slice(1)
  return h.startsWith('view-') || [...BEFORE, ...AFTER].some(([k]) => k === h) ? h : 'map'
}

export default function LeadsApp() {
  const { user, leads, error, signIn, signOut, updateLead, demo } = useLeads()
  const customersApi = useCustomers(user)
  const serviceApi = useServiceCalls(user)
  const gatesApi = useGateCodes(user)
  const viewsApi = useViews(user)
  const settingsApi = useSettings(user)
  const pastApi = usePastRequests(user)
  const signsApi = useSigns(user)
  const [editing, setEditing] = useState(null) // null | {} (new) | view
  const [tab, setTab] = useState(tabFromHash)
  const [openId, setOpenId] = useState(null)
  const [signInError, setSignInError] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [textFrom, setTextFrom] = useState(getTextFrom)
  const season = seasonYear()

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (user === undefined) return <Screen><p className="text-slate-400">Loading…</p></Screen>

  if (!user) {
    return (
      <Screen>
        <img src={business.logo} alt={business.name} className="h-16" />
        <h1 className="font-display text-3xl font-extrabold">Staff</h1>
        <p className="text-slate-400">Staff only. Sign in with the Google account your manager added.</p>
        <button type="button" onClick={() => signIn().catch(() => setSignInError(true))}
          className="w-full rounded-full bg-glow-400 py-3.5 font-semibold text-night-950">Sign in with Google</button>
        {signInError && <p className="text-sm text-berry-500" role="alert">Sign-in didn’t finish. Try again.</p>}
      </Screen>
    )
  }

  // Only the core lists decide access; a refused extra list (e.g. rules not
  // yet published for a new feature) shows a warning instead of locking staff out.
  if ([error, customersApi.error].includes('not-staff')) {
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

  const { customers } = customersApi
  const gates = gatesApi.gates ?? []
  const calls = serviceApi.calls ?? []
  const listError = [customersApi.error, serviceApi.error, gatesApi.error, viewsApi.error, settingsApi.error, pastApi.error, signsApi.error].find((e) => e && e !== 'not-staff')
    ?? ([serviceApi.error, gatesApi.error, viewsApi.error, settingsApi.error, pastApi.error, signsApi.error].includes('not-staff')
      ? 'part of the app was refused by the database. The security rules probably need publishing again (firestore.rules).'
      : null)
  const views = viewsApi.views ?? []
  const currentView = tab.startsWith('view-') ? views.find((v) => `view-${v.id}` === tab) : null
  const tabs = [...BEFORE, ...views.map((v) => [`view-${v.id}`, v.name]), ...AFTER]

  async function saveView(data) {
    if (editing?.id) return viewsApi.save(editing.id, data)
    const id = await viewsApi.add(data)
    window.location.hash = `#view-${id}`
  }
  async function deleteView(id) {
    await viewsApi.remove(id)
    setEditing(null)
    window.location.hash = '#season'
  }

  const openCustomer = (id) => { setOpenId(id); window.location.hash = '#customers' }

  // Create the customer from the lead (or link the existing one with that name).
  async function makeCustomer(lead) {
    const fields = leadToCustomer(lead, season)
    let id
    try {
      id = await customersApi.create(fields)
    } catch (err) {
      const existing = customers?.find((c) => c.fullName?.toLowerCase() === fields.fullName.toLowerCase())
      if (!existing) throw err
      id = existing.id
    }
    await updateLead(lead.id, { customerId: id })
    return id
  }
  // Past website request -> customer (or link the existing one with that name).
  async function makePastCustomer(r) {
    const last = r.requests?.at(-1)
    const fields = Object.fromEntries(Object.entries({
      fullName: r.fullName, firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone,
      address: [r.address, r.city].filter(Boolean).join(', '), city: r.city, since: season,
      notes: `Old website estimate request (${r.lastAsked})${last?.message ? `: ${last.message}` : ''}`,
      seasons: { [season]: { installStatus: 'Confirmed - Needs to be Scheduled', firstContact: 'Confirmed' } },
    }).filter(([, v]) => v))
    try {
      return await customersApi.create(fields)
    } catch (err) {
      const existing = customers?.find((c) => c.fullName?.toLowerCase() === fields.fullName.toLowerCase())
      if (!existing) throw err
      return existing.id
    }
  }
  const open = openId && customers?.find((c) => c.id === openId)
  const loading = <p className="mt-6 text-slate-400">Loading customers…</p>

  const templates = mergeTemplates(settingsApi.settings?.emailTemplates)
  const voiceAccount = textFrom === 'own' ? '' : (settingsApi.settings?.voiceAccount ?? '')

  return (
    <VoiceAccount.Provider value={voiceAccount}>
    <DiscountSchedule.Provider value={settingsApi.settings?.discountSchedule ?? DEFAULT_SCHEDULE}>
    <EmailTemplates.Provider value={templates}>
    <div className={tab === 'map' ? 'flex h-svh flex-col' : 'min-h-svh'}>
      {demo && <p className="bg-berry-600 px-4 py-2 text-center text-sm font-medium">Preview with sample data. Not connected to Firebase.</p>}
      <header className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-night-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-3 lg:max-w-7xl">
          <h1 className="font-display text-xl font-extrabold">CLC Staff</h1>
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="hidden truncate text-slate-400 sm:inline">{user.email}</span>
            <button type="button" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings"
              className="shrink-0 rounded-full border border-white/20 px-3 py-1.5">⚙</button>
            {!demo && <button type="button" onClick={signOut} className="shrink-0 rounded-full border border-white/20 px-3 py-1.5">Sign out</button>}
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 lg:max-w-7xl" aria-label="Sections">
          {tabs.map(([k, label]) => (
            <a key={k} href={`#${k}`} aria-current={tab === k ? 'page' : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${tab === k ? 'border-glow-400 text-glow-300' : 'border-transparent text-slate-400'}`}>
              {label}
            </a>
          ))}
          {customers && (
            <button type="button" onClick={() => setEditing({})}
              className="shrink-0 px-3 py-3 text-sm font-semibold text-glow-400 hover:text-glow-300">+ New tab</button>
          )}
        </nav>
      </header>

      {tab === 'map' && (
        <div className="relative min-h-0 flex-1">
          {listError && <p className="absolute inset-x-0 top-0 z-10 bg-berry-600 px-4 py-1 text-sm" role="alert">Couldn’t load: {listError}</p>}
          {customers && (serviceApi.calls || serviceApi.error) && (settingsApi.settings || settingsApi.error)
            ? <MapView customers={customers} calls={calls} gates={gates} views={views} settings={settingsApi.settings ?? {}} season={season}
                onOpen={setOpenId} onLocateAll={customersApi.locateAll} onSaveSettings={settingsApi.save} />
            : <p className="p-6 text-slate-400">Loading map…</p>}
        </div>
      )}
      <main className={tab === 'map' ? 'hidden' : 'mx-auto max-w-3xl px-4 pb-16 pt-4 lg:max-w-7xl'}>
        {listError && <p className="mb-4 text-berry-500" role="alert">Couldn’t load: {listError}</p>}
        {tab === 'leads' && (
          <LeadsView leads={leads} error={error} onUpdate={updateLead} onMakeCustomer={customers ? makeCustomer : undefined} onOpenCustomer={openCustomer} />
        )}
        {tab === 'customers' && (customers
          ? <CustomersView customers={customers} season={season} onOpen={setOpenId} onCreate={customersApi.create} />
          : loading)}
        {tab === 'season' && (customers
          ? <SeasonView customers={customers} season={season} gates={gates} onOpen={setOpenId} onUpdate={customersApi.update} />
          : loading)}
        {tab.startsWith('view-') && (!customers || !viewsApi.views ? loading : currentView
          ? <ViewTab view={currentView} customers={customers} season={season} gates={gates} onOpen={setOpenId}
              onUpdate={customersApi.update} onEdit={() => setEditing(currentView)} onDelete={() => deleteView(currentView.id)} />
          : <p className="mt-6 text-slate-400">This tab was deleted. <a href="#season" className="text-glow-300 underline">Go to Season</a></p>)}
        {tab === 'route' && (customers && (settingsApi.settings || settingsApi.error)
          ? <RouteView customers={customers} gates={gates} season={season} settings={settingsApi.settings ?? {}} onSaveSettings={settingsApi.save}
              onLocateAll={customersApi.locateAll} onOpen={setOpenId} />
          : loading)}
        {tab === 'signs' && (customers && (signsApi.drops || signsApi.error)
          ? <SignsView drops={signsApi.error === 'not-staff' ? [] : signsApi.drops} error={signsApi.error === 'not-staff' ? null : signsApi.error}
              leads={leads} customers={customers} season={season} settings={settingsApi.settings ?? {}} onSaveSettings={settingsApi.save}
              onAdd={signsApi.add} onUpdate={signsApi.update} onRemove={signsApi.remove} onUpdateLead={updateLead} />
          : loading)}
        {tab === 'past' && (customers
          ? <PastRequestsView requests={pastApi.error === 'not-staff' ? [] : pastApi.requests} error={pastApi.error === 'not-staff' ? null : pastApi.error}
              customers={customers} season={season} onUpdate={pastApi.update} onMakeCustomer={makePastCustomer} onOpenCustomer={openCustomer} />
          : loading)}
        {tab === 'emails' && (customers
          ? <EmailsView saved={settingsApi.settings?.emailTemplates ?? []} onSave={settingsApi.save}
              customers={customers} season={season} onUpdate={customersApi.update} />
          : loading)}
        {tab === 'service' && (customers && serviceApi.calls
          ? <ServiceView calls={calls} customers={customers} gates={gates} onLog={serviceApi.log} onUpdate={serviceApi.update} onOpen={setOpenId} />
          : loading)}
        {tab === 'gates' && (gatesApi.gates
          ? <GatesView gates={gates} onUpdate={gatesApi.update} onAdd={gatesApi.add} />
          : loading)}
        {tab === 'import' && (customers
          ? <ImportView existing={customers} onImport={customersApi.importMany} onImportGates={gatesApi.importMany}
              onImportMessages={(records, onProgress) => mergeMany(user, 'messages', records, onProgress)}
              existingPast={pastApi.requests ?? []} onImportPast={pastApi.importMany} />
          : loading)}
      </main>

      {editing && customers && (
        <ViewEditor view={editing} customers={customers} season={season} onSave={saveView} onDelete={() => deleteView(editing.id)} onClose={() => setEditing(null)} />
      )}
      {open && (
        <CustomerDetail customer={open} season={season} onUpdate={customersApi.update} onClose={() => setOpenId(null)}
          gates={gates} calls={calls} onLogCall={serviceApi.log} onUpdateCall={serviceApi.update} user={user} />
      )}
      {showSettings && (
        <SettingsPanel settings={settingsApi.settings ?? {}} onSave={settingsApi.save} textFrom={textFrom}
          onTextFrom={(v) => { setTextFrom(v); saveTextFrom(v) }} onClose={() => setShowSettings(false)} />
      )}
    </div>
    </EmailTemplates.Provider>
    </DiscountSchedule.Provider>
    </VoiceAccount.Provider>
  )
}
