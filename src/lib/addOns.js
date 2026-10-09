// Add-ons and the yearly re-install price (spec: docs/specs/add-ons.md).
// Pure functions, used by the staff app and the customer's account page.
//
// Rule (owner, 2026-10-09): everything from UNDISCOUNTED prices. Yearly price
// = 50% of the original first-year price + 50% of each add-on added in an
// earlier season. An add-on is billed in full the season it's added.
// 50% is only the default (owner: "things are a little more nuanced"):
//   customer.reinstallBase   re-install price per year, instead of 50% of original
//   entry.adds               per-year amount for one add-on, instead of 50% of its price
//   entry.kind 'change'      any other price change (+ or −) from its season on
import { parseMoney } from './discounts.js'

export const REINSTALL_PCT = 50
const cents = (dollars) => Math.round((Number(dollars) || 0) * 100)
const half = (c) => Math.round((c * REINSTALL_PCT) / 100)
export const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== '' && Number.isFinite(Number(v))

let seq = 0
export const addOnId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`

const line = (a) => {
  const priceCents = cents(a.price)
  const custom = isSet(a.adds)
  return { ...a, kind: a.kind === 'change' ? 'change' : 'addon', priceCents, custom, addsCents: custom ? cents(a.adds) : half(priceCents) }
}

// Amounts in cents. `season` = the season being priced (e.g. '2026').
export function yearlyPrice(customer, season) {
  const s = String(season)
  const originalCents = parseMoney(customer?.originalRate) == null ? null : cents(parseMoney(customer.originalRate))
  const list = (customer?.addOns ?? []).filter((a) => a && a.season && (cents(a.price) > 0 || isSet(a.adds)))
    .map(line).toSorted((a, b) => String(a.season).localeCompare(String(b.season)))
  // Add-ons count from the season after they're added; price changes from their own season.
  const lines = list.filter((a) => (a.kind === 'change' ? String(a.season) <= s : String(a.season) < s))
  const baseCustom = isSet(customer?.reinstallBase)
  const base = baseCustom ? cents(customer.reinstallBase) : originalCents == null ? null : half(originalCents)
  return {
    season: s,
    originalCents,
    since: customer?.since ?? '',
    baseCents: base,
    baseCustom,
    lines,
    // Added this season: billed in full now, raises the price from next season.
    thisSeason: list.filter((a) => a.kind === 'addon' && String(a.season) === s),
    yearlyCents: base == null ? null : base + lines.reduce((t, l) => t + l.addsCents, 0),
  }
}

// Old sheet text ("Install / add-on history") → drafts for staff to confirm.
// One draft per line or ";"-separated part that mentions a year or a $ amount.
export function draftsFromText(text) {
  return String(text ?? '').split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean).flatMap((part) => {
    const year = part.match(/\b(20[0-4]\d)\b/)?.[1] ?? ''
    const amount = part.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/)?.[1]
    // The original install isn't an add-on (it's the customer's Original rate).
    if ((!year && !amount) || /original|first year|initial|new install/i.test(part)) return []
    const what = part.replace(/\$\s?[\d,]+(?:\.\d{1,2})?/g, '').replace(/\b20[0-4]\d\b/g, '').replace(/^[\s:,\-–]+|[\s:,\-–]+$/g, '').replace(/\s{2,}/g, ' ')
    return [{ season: year, what: what || part, price: amount ? Number(amount.replace(/,/g, '')) : '', from: part }]
  })
}

// Customers whose old add-on text still needs a look.
export const needsAddOnCheck = (c) => Boolean(String(c.installHistory ?? '').trim()) && !c.addOnsChecked
