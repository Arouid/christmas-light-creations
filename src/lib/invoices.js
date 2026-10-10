// Invoices for the staff app and the customer pages. The rules (totals,
// states, numbers, reminders, season fills) live in functions/invoices.js,
// shared with the server so both always agree; this adds what only the
// pages need: a new draft from a customer, and bulk drafts for a season.
import { yearlyPrice } from './addOns.js'
import { parseMoney } from './discounts.js'
import { INVOICE_SENT_BOX } from '../../functions/invoices.js'

export * from '../../functions/invoices.js'

let seq = 0
export const lineId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`
export const line = (description = '', cents = 0) => ({ id: lineId(), description, cents })

// Customer records may hold several emails in one box: invoices go to the first.
const firstEmail = (field) => (String(field ?? '').match(/[^\s<>,;"']+@[^\s<>,;"']+\.[a-z]{2,}/i) ?? [''])[0]
export const customerSnapshot = (c) => ({ name: c.fullName ?? '', email: firstEmail(c.email), phone: c.phone ?? '', address: c.address ?? '' })

export const newInvoice = (c, { season, kind = 'install', items } = {}) => ({
  status: 'draft', customerId: c.id, customer: customerSnapshot(c), season: String(season ?? ''), kind,
  items: items?.length ? items : [line()], note: '', terms: 'receipt', dueDate: '',
})

const dollarsToCents = (v) => { const n = parseMoney(v); return n == null ? null : Math.round(n * 100) }
const discountLabel = (b) => {
  const why = String(b.discountReason ?? '').trim() || 'Discount'
  return `${why}${/discount/i.test(why) ? '' : ' discount'}${b.discount ? ` (${b.discount})` : ''}`
}

// Lines and amount for one customer's re-install or takedown invoice:
// install = the season's Total due (with its discount shown as a line), else
// Rate, else the yearly price + add-ons new this season (charged in full).
// Used by the bulk drafts and the invoice editor's "＋ Add" buttons.
export function suggestedLines(c, season, kind) {
  if (kind !== 'install' && kind !== 'takedown') return []
  return draftLines(c, String(season), kind)
}

// Season billing boxes marked Paid "No", other than this season: money still
// owed from before (shown in the invoice editor's account panel).
export function unpaidSeasons(c, season) {
  const out = []
  for (const [y, s] of Object.entries(c?.seasons ?? {}).sort(([a], [b]) => b.localeCompare(a))) {
    if (y === String(season)) continue
    for (const part of ['install', 'takedown']) {
      const b = s?.[part]
      if (/^no$/i.test(String(b?.paid ?? '').trim())) out.push({ season: y, part, amount: b.total || b.rate || '' })
    }
  }
  return out
}

function draftLines(c, season, kind) {
  const b = c.seasons?.[season]?.[kind] ?? {}
  if (kind === 'takedown') {
    const rate = dollarsToCents(b.rate) ?? dollarsToCents(b.total)
    return rate == null ? [] : [line(`Takedown: taking down, labeling and boxing your lights (${season} season)`, rate)]
  }
  const what = `Re-install of your Christmas lights, ${season} season`
  const rate = dollarsToCents(b.rate)
  const total = dollarsToCents(b.total)
  if (rate != null && total != null && total < rate) return [line(what, rate), line(discountLabel(b), total - rate)]
  if (total ?? rate) return [line(what, total ?? rate)]
  const y = yearlyPrice(c, season)
  if (!y.yearlyCents) return []
  return [line(what, y.yearlyCents), ...y.thisSeason.filter((a) => a.priceCents > 0).map((a) => line(`Add-on: ${a.what} (new this season)`, a.priceCents))]
}

const SKIP_INSTALL = ['Not Servicing', 'Off Scheduler']

// Season tab → "Invoice these N": one row per customer with the draft's lines,
// ticked unless there's a reason not to bill them (shown to staff).
export function bulkCandidates({ customers, season, kind, invoices }) {
  const s = String(season)
  const billed = new Map((invoices ?? []).filter((i) => i.status !== 'void' && i.season === s && i.kind === kind).map((i) => [i.customerId, i]))
  return (customers ?? []).map((c) => {
    const sea = c.seasons?.[s] ?? {}
    const b = sea[kind] ?? {}
    const items = draftLines(c, s, kind)
    const cents = items.reduce((t, i) => t + i.cents, 0)
    const box = String(b.invoice ?? '').trim()
    const prior = billed.get(c.id)
    const reason = [
      prior && `Already invoiced (${prior.number || 'draft'})`,
      /^yes$/i.test(String(b.paid ?? '').trim()) && 'Already paid',
      box && box !== 'Not Yet Invoiced' && box !== INVOICE_SENT_BOX && `Invoice box says “${box}”`,
      box === INVOICE_SENT_BOX && 'Already invoiced',
      kind === 'install' && String(c.since ?? '') === s && 'New this season (billed by their proposal)',
      kind === 'install' && SKIP_INSTALL.includes(sea.installStatus) && `Season says “${sea.installStatus}”`,
      kind === 'install' && sea.firstContact === 'Declined' && 'Declined this season',
      kind === 'takedown' && sea.takedownStatus === 'No Takedown' && 'Season says “No Takedown”',
      kind === 'takedown' && (/no takedown cost/i.test(String(b.paid ?? '')) || (items.length && cents === 0)) && 'Free takedown',
      !items.length && 'No price on file',
    ].find(Boolean) ?? ''
    return { customer: c, items, cents, pick: !reason && cents > 0, reason, flag: firstEmail(c.email) ? '' : 'No email: text them the link' }
  })
}
