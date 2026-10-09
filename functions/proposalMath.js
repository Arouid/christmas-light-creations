// Payment amounts, computed on the server from the stored proposal (never
// trusted from the customer's browser). Same math as src/proposals/model.js
// `totals()`; tests/depositParity.test.mjs checks the two agree.
const cents = (dollars) => Math.round((Number(dollars) || 0) * 100)
const itemCents = (it) => Math.round((Number(it.qty) || 0) * cents(it.rate))

function installCents(p) {
  const installSub = (p.items ?? []).filter((i) => i.due !== 'removal').reduce((t, i) => t + itemCents(i), 0)
  return installSub - Math.round((installSub * (Number(p.discountPct) || 0)) / 100)
}

export function depositCents(p) {
  return Math.round((installCents(p) * (Number(p.depositPct) || 0)) / 100)
}

// The three payments on a proposal: deposit at signing, the rest of the
// install when it's done, takedown at removal.
export const PARTS = ['deposit', 'balance', 'takedown']

export function partCents(p, part) {
  if (part === 'deposit') return depositCents(p)
  if (part === 'balance') return installCents(p) - depositCents(p)
  if (part === 'takedown') return (p.items ?? []).filter((i) => i.due === 'removal').reduce((t, i) => t + itemCents(i), 0)
  return 0
}

// Where each payment is recorded on the proposal (deposit kept at the top
// level, as before).
export const paymentOf = (p, part) => (part === 'deposit' ? p.deposit : p.payments?.[part])

export const dollars = (c) => (c / 100).toFixed(2)
