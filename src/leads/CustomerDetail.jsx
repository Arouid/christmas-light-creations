import {
  BLANK_LABEL, FIRST_CONTACT, INSTALL_STATUSES, INSTALL_TYPES, INVOICE_STATUSES, PAID, PAYMENT_TYPES,
  TAKEDOWN_STATUSES, getPath,
} from '../lib/customers'
import Icon from '../components/Icon'
import Field from './Field'
import StreetViewPhoto from './StreetViewPhoto'

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

function Grid({ customer, base, fields, onUpdate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, label, opts = {}]) => {
        const path = base ? `${base}.${key}` : key
        return (
          <Field key={path} label={label} value={getPath(customer, path)} options={opts.options} blankLabel={opts.blankLabel}
            rows={opts.rows} inputMode={opts.inputMode} className={opts.wide ? 'sm:col-span-2' : ''}
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

export default function CustomerDetail({ customer, season, onUpdate, onClose }) {
  const phone = customer.phone?.replace(/[^\d+]/g, '')
  const seasons = Object.keys(customer.seasons ?? {}).concat(season).filter((y, i, a) => a.indexOf(y) === i).sort().reverse()

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-night-950" role="dialog" aria-modal="true" aria-label={customer.fullName}>
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
          {phone && <a className={action} href={`sms:${phone}`}><Icon name="chat" className="size-4" /> Text</a>}
          {customer.email && <a className={action} href={`mailto:${customer.email}`}>Email</a>}
          {customer.address && (
            <a className={action} target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}>Map</a>
          )}
        </div>
        {customer.gateCode && (
          <p className="rounded-xl bg-glow-400/10 px-4 py-3 text-glow-300">Gate code: <strong className="text-lg">{customer.gateCode}</strong></p>
        )}
        {customer.address && <StreetViewPhoto address={customer.address} />}

        {seasons.map((y) => (
          <Section key={y} title={`${y} season`} open={y === season}>
            <Grid customer={customer} base={`seasons.${y}`} fields={SEASON} onUpdate={onUpdate} />
            <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-glow-400">Install billing</h3>
            <Grid customer={customer} base={`seasons.${y}.install`} fields={BILLING.install} onUpdate={onUpdate} />
            <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-glow-400">Takedown billing</h3>
            <Grid customer={customer} base={`seasons.${y}.takedown`} fields={BILLING.takedown} onUpdate={onUpdate} />
          </Section>
        ))}

        {GROUPS.map(([title, fields]) => (
          <Section key={title} title={title} open={title !== 'Account'}>
            <Grid customer={customer} fields={fields} onUpdate={onUpdate} />
          </Section>
        ))}

        {customer.updatedBy && <p className="text-xs text-slate-500">Last changed by {customer.updatedBy}</p>}
      </div>
    </div>
  )
}
