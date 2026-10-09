// The deposit amount, computed on the server from the stored proposal (never
// trusted from the customer's browser). Same math as src/proposals/model.js
// `totals()`; tests/depositParity.test.mjs checks the two agree.
const cents = (dollars) => Math.round((Number(dollars) || 0) * 100)
const itemCents = (it) => Math.round((Number(it.qty) || 0) * cents(it.rate))

export function depositCents(p) {
  const installSub = (p.items ?? []).filter((i) => i.due !== 'removal').reduce((t, i) => t + itemCents(i), 0)
  const install = installSub - Math.round((installSub * (Number(p.discountPct) || 0)) / 100)
  return Math.round((install * (Number(p.depositPct) || 0)) / 100)
}

export const dollars = (c) => (c / 100).toFixed(2)
