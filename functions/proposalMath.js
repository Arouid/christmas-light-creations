// Payment amounts, computed on the server from the stored proposal (never
// trusted from the customer's browser). Same math as src/proposals/model.js
// `totals()`, sales tax included; tests/depositParity.test.mjs checks the two agree.
const cents = (dollars) => Math.round((Number(dollars) || 0) * 100)
const itemCents = (it) => Math.round((Number(it.qty) || 0) * cents(it.rate))
const pct = (c, rate) => Math.round((c * rate) / 100)
const taxable = (it) => it.taxable === true
const sum = (list) => list.reduce((t, i) => t + itemCents(i), 0)

// The install (after discount) and the removal, each with its sales tax
// (p.tax.ratePct, only on lines marked taxable; older proposals have no rate).
// p.tax.mode 'included': the prices already contain the tax, so nothing is added.
function parts(p) {
  const items = p.items ?? []
  const installItems = items.filter((i) => i.due !== 'removal')
  const removalItems = items.filter((i) => i.due === 'removal')
  const discountPct = Number(p.discountPct) || 0
  const rate = Number(p.tax?.ratePct) || 0
  const added = rate > 0 && p.tax?.mode !== 'included'
  const installSub = sum(installItems)
  const install = installSub - pct(installSub, discountPct)
  const taxableSub = sum(installItems.filter(taxable))
  const installTax = added ? pct(taxableSub - pct(taxableSub, discountPct), rate) : 0
  const removal = sum(removalItems)
  const removalTax = added ? pct(sum(removalItems.filter(taxable)), rate) : 0
  return { installTotal: install + installTax, removalTotal: removal + removalTax }
}

export function depositCents(p) {
  return pct(parts(p).installTotal, Number(p.depositPct) || 0)
}

// The three payments on a proposal: deposit at signing, the rest of the
// install when it's done, takedown at removal.
export const PARTS = ['deposit', 'balance', 'takedown']

export function partCents(p, part) {
  const { installTotal, removalTotal } = parts(p)
  if (part === 'deposit') return depositCents(p)
  if (part === 'balance') return installTotal - depositCents(p)
  if (part === 'takedown') return removalTotal
  return 0
}

// Where each payment is recorded on the proposal (deposit kept at the top
// level, as before).
export const paymentOf = (p, part) => (part === 'deposit' ? p.deposit : p.payments?.[part])

export const dollars = (c) => (c / 100).toFixed(2)
