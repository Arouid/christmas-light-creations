import { useState } from 'react'
import {
  BLANK_LABEL, FIRST_CONTACT, INSTALL_STATUSES, INSTALL_TYPES, INVOICE_STATUSES, PAID, PAYMENT_TYPES,
  TAKEDOWN_STATUSES, gateFor, getPath, todayISO,
} from '../lib/customers'
import { textMessages } from '../lib/messages'
import ComposeEmail from './ComposeEmail'
import AddToRoute from './AddToRoute'
import Icon from '../components/Icon'
import Field from './Field'
import { TextButton } from './Reach'
import { LogCallForm, ServiceCallCard } from './ServiceView'
import StreetViewPhoto from './StreetViewPhoto'
import TextHistory from './TextHistory'
import DesignsPanel from './designs/DesignsPanel'
import DiscountSuggestion from './DiscountSuggestion'

const action = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15'

const GROUPS = [
  ['Contact', [
    ['fullName', 'Full name'], ['firstName', 'First name'], ['lastName', 'Last name'],
    ['phone', 'Phone', { inputMode: 'tel' }], ['email', 'Email', { inputMode: 'email' }],
  ]],
  ['Property', [
    ['address', 'Address'], ['city', 'City'], ['neighborhood', 'Neighborhood'], ['gateCode', 'Gate code'],
    ['locationBlock', 'Location block'], ['installType', 'Install type', { options: INSTALL_TYPES }],
  ]],
  ['Lights', [
    ['lightColor', 'Light color'], ['lightReminders', 'Light reminders'], ['freeColorSwapUsed', 'Used free color swap'],
    ['preferredTimeframe', 'Preferred install timeframe'],
    ['takedownNotes', 'Install / takedown notes', { rows: 6, wide: true }],
    ['installHistory', 'Install / add-on history', { rows: 3, wide: true }],
    ['oldSchedulingNotes', 'Old scheduling notes', { rows: 3, wide: true }],
  ]],
  ['Account', [
    ['since', 'Customer since', { inputMode: 'numeric' }], ['originalRate', 'Original rate'],
    ['normalPaymentMethod', 'Usual payment method'], ['pcNumber', 'PC#'],
    ['priceNotes', 'Price notes', { rows: 3, wide: true }], ['priceAdjustments', 'Price adjustments next year', { rows: 2, wide: true }],
    ['notes', 'Other notes', { rows: 3, wide: true }],
  ]],
]

const SEASON = [
  ['installStatus', 'Install status', { options: INSTALL_STATUSES, blankLabel: BLANK_LABEL.installStatus }],
  ['firstContact', 'Wants lights?', { options: FIRST_CONTACT }],
  ['timeframe', 'Timeframe'], ['weekOf', 'Week of'], ['day', 'Day'], ['plannedDate', 'Planned date'],
  ['schedulingNotes', 'Scheduling notes', { rows: 3, wide: true }], ['addOn', 'Add-on / modification', { wide: true }],
  ['takedownStatus', 'Takedown status', { options: TAKEDOWN_STATUSES, blankLabel: BLANK_LABEL.takedownStatus }],
  ['takedownResponse', 'Takedown response'],
]

const BILLING = {
  install: [['rate', 'Rate'], ['discount', 'Discount'], ['discountReason', 'Discount reason'], ['total', 'Total due'],
    ['invoice', 'Invoice', { options: INVOICE_STATUSES }], ['paid', 'Paid', { options: PAID }],
    ['paymentType', 'Paid by', { options: PAYMENT_TYPES }], ['paymentDate', 'Payment date']],
  takedown: [['rate', 'Rate'], ['invoice', 'Invoice', { options: INVOICE_STATUSES }], ['paid', 'Paid', { options: PAID }],
    ['paymentType', 'Paid by', { options: PAYMENT_TYPES }], ['paymentDate', 'Payment date']],
}

function Grid({ customer, base, fields, onUpdate, suggestions = {} }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, label, opts = {}]) => {
        const path = base ? `${base}.${key}` : key
        return (
          <Field key={path} label={label} value={getPath(customer, path)} options={opts.options} blankLabel={opts.blankLabel}
            rows={opts.rows} inputMode={opts.inputMode} suggestions={suggestions[key]} className={opts.wide ? 'sm:col-span-2' : ''}
            onSave={(v) => onUpdate(customer.id, path, v)} />
        )
      })}
    </div>
  )
}

function Section({ title, children, open = true }) {
  return (
    <details open={open} className="group rounded-2xl border border-white/10 bg-night-900">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
        {title}<Icon name="chevron" className="size-5 text-glow-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-white/10 p-4">{children}</div>
    </details>
  )
}

export default function CustomerDetail({ customer, season, onUpdate, onClose, gates = [], calls = [], onLogCall, onUpdateCall, user }) {
  const [logging, setLogging] = useState(false)
  const gate = gateFor(customer, gates)
  const myCalls = calls.filter((c) => c.customerId === customer.id)
  const neighborhoods = gates.map((g) => g.neighborhood).filter(Boolean)
  // Most recent season whose install is done: the moment to ask for a review.
  const reviewSeason = Object.keys(customer.seasons ?? {}).sort().reverse()
    .find((y) => customer.seasons[y]?.installStatus === 'Install Completed')
  const asked = reviewSeason && customer.seasons[reviewSeason].reviewAsked
  const markAsked = () => onUpdate(customer.id, `seasons.${reviewSeason}.reviewAsked`, todayISO())
  const phone = customer.phone?.replace(/[^\d+]/g, '')
  const seasons = Object.keys(customer.seasons ?? {}).concat(season).filter((y, i, a) => a.indexOf(y) === i).sort().reverse()

  return (
    <>
    <div className="fixed inset-0 z-30 hidden bg-night-950/60 lg:block" onClick={onClose} aria-hidden="true" />
    <div className="fixed inset-0 z-30 overflow-y-auto bg-night-950 lg:left-auto lg:w-[46rem] lg:border-l lg:border-white/10 lg:shadow-2xl" role="dialog" aria-modal="true" aria-label={customer.fullName}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-night-950/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2.5" aria-label="Back to list">
          <Icon name="left" className="size-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{customer.fullName}</h2>
          <p className="truncate text-sm text-slate-400">{[customer.city, customer.locationBlock].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {phone && <a className={action} href={`tel:${phone}`}><Icon name="phone" className="size-4" /> Call</a>}
          <TextButton phone={customer.phone} className={action} />
          <ComposeEmail person={customer} season={season} className={action} />
          <AddToRoute customers={[customer]} className={action} />
          {customer.address && (
            <a className={action} target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}>Map</a>
          )}
        </div>
        {gate && (
          <p className="rounded-xl bg-glow-400/10 px-4 py-3 text-glow-300">
            Gate code: <strong className="text-lg">{gate.code}</strong>
            {gate.source !== 'customer' && <span className="block text-sm text-glow-300/80">{gate.source} neighborhood gate{gate.notes ? ` · ${gate.notes}` : ''}</span>}
          </p>
        )}
        {customer.address && <StreetViewPhoto address={customer.address} />}

        {reviewSeason && (
          <div className="rounded-xl border border-glow-400/30 bg-glow-400/5 p-3">
            <p className="text-sm text-slate-300">
              ★ {reviewSeason} install completed. Ask for a Google review
              {asked && <span className="text-slate-400"> (asked {asked})</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <TextButton phone={customer.phone} className={action} label="Text review link" message={textMessages.review(customer)} onSent={markAsked} />
              <ComposeEmail person={customer} season={reviewSeason} start="review" label="Email review link" className={action} onSent={markAsked} />
            </div>
          </div>
        )}

        <Section title="🎨 Light designs" open={false}>
          <DesignsPanel owner={{ type: 'customer', id: customer.id, name: customer.fullName, address: customer.address }} />
        </Section>

        {seasons.map((y) => (
          <Section key={y} title={`${y} season`} open={y === season}>
            <Grid customer={customer} base={`seasons.${y}`} fields={SEASON} onUpdate={onUpdate} />
            <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-glow-400">Install billing</h3>
            <DiscountSuggestion customer={customer} year={y} onUpdate={onUpdate} />
            <Grid customer={customer} base={`seasons.${y}.install`} fields={BILLING.install} onUpdate={onUpdate} />
            <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-glow-400">Takedown billing</h3>
            <Grid customer={customer} base={`seasons.${y}.takedown`} fields={BILLING.takedown} onUpdate={onUpdate} />
          </Section>
        ))}

        {onLogCall && (
          <Section title={`Service calls (${myCalls.length})`} open={myCalls.some((c) => c.status === 'Open' || c.status === 'Scheduled')}>
            {logging
              ? <LogCallForm customer={customer} onLog={onLogCall} onDone={() => setLogging(false)} />
              : <button type="button" onClick={() => setLogging(true)} className="w-full rounded-xl bg-white/10 py-2.5 font-semibold">+ Log service call</button>}
            <ul className="space-y-3">
              {myCalls.map((c) => <ServiceCallCard key={c.id} call={c} onUpdate={onUpdateCall} />)}
            </ul>
          </Section>
        )}

        <Section title="Text & call history" open={false}>
          <TextHistory user={user} customerId={customer.id} />
        </Section>

        {GROUPS.map(([title, fields]) => (
          <Section key={title} title={title} open={title !== 'Account'}>
            <Grid customer={customer} fields={fields} onUpdate={onUpdate} suggestions={{ neighborhood: neighborhoods }} />
          </Section>
        ))}

        {customer.updatedBy && <p className="text-xs text-slate-500">Last changed by {customer.updatedBy}</p>}
      </div>
    </div>
    </>
  )
}
