// Sales tax (owner, 2026-10-12; docs/specs/receipts.md): Texas + local, 8.25%
// here, collected from October 15, 2026 on new lights (year-one installs,
// add-ons) and on every lease charge; never on re-installs of lights the
// customer owns, on taking those down, or on service calls. The rate, the
// permit number and the start date live in settings/app.salesTax (⚙ Settings).
// Pure; the math itself is in src/proposals/model.js and functions/invoices.js.
export const DEFAULT_SALES_TAX = { ratePct: 8.25, permit: '', from: '2026-10-15' }

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))
const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// What's saved, with the defaults filled in.
export function salesTaxSettings(settings) {
  const s = settings?.salesTax ?? {}
  const rate = num(s.ratePct)
  return {
    ratePct: rate == null ? DEFAULT_SALES_TAX.ratePct : Math.max(0, Math.min(25, rate)),
    permit: String(s.permit ?? '').trim().slice(0, 40),
    from: isDay(s.from) ? s.from : DEFAULT_SALES_TAX.from,
  }
}

// The rate to put on something made today (YYYY-MM-DD): 0 before the start date or when it's switched off.
export function taxRateFor(settings, today) {
  const { ratePct, from } = salesTaxSettings(settings)
  return ratePct > 0 && String(today ?? '') >= from ? ratePct : 0
}

// The tax snapshot a new proposal or invoice carries (null = no tax line).
export function taxSnapshot(settings, today) {
  const rate = taxRateFor(settings, today)
  if (!rate) return null
  const { permit } = salesTaxSettings(settings)
  return permit ? { ratePct: rate, permit } : { ratePct: rate }
}

// Whether an invoice of this kind is taxed unless staff say otherwise: add-ons
// are new lights; installs are mostly re-installs (owned lights), so staff tick
// the box for a first-year install billed by invoice; the rest never.
export const INVOICE_TAX_DEFAULT = { install: false, takedown: false, addon: true, service: false, other: false }
