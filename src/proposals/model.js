// Proposals (estimate + contract) as plain JSON. Pure functions only (no
// React, no Firebase) so they can be tested and reused in another app.
//
// Money is kept in cents internally to avoid rounding drift.

export const PROPOSAL_VERSION = 2
export const STATUSES = ['draft', 'sent', 'viewed', 'signed', 'countersigned', 'declined', 'void']
export const STATUS_LABEL = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', signed: 'Signed by customer',
  countersigned: 'Signed by both', declined: 'Declined', void: 'Voided',
}

const cents = (dollars) => Math.round((Number(dollars) || 0) * 100)
export const fmt = (c) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

let seq = 0
export const itemId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`

// Line item: qty × rate. `due` = when it's paid: 'install' or 'removal'.
// `details` = what the paper form had per line: color, bulb type, hardware, timer.
export const newItem = (label = '', qty = 1, unit = '', rate = 0, due = 'install', details = '') => ({ id: itemId(), label, qty, unit, rate, due, details })
export const itemCents = (it) => Math.round((Number(it.qty) || 0) * cents(it.rate))

// Payment schedule: deposit (a % of the install after discount) when signed,
// the rest of the install when installed, removal items at removal.
export function totals(p) {
  const items = p.items ?? []
  const installSub = items.filter((i) => i.due !== 'removal').reduce((t, i) => t + itemCents(i), 0)
  const removal = items.filter((i) => i.due === 'removal').reduce((t, i) => t + itemCents(i), 0)
  const discount = Math.round((installSub * (Number(p.discountPct) || 0)) / 100)
  const install = installSub - discount
  const deposit = Math.round((install * (Number(p.depositPct) || 0)) / 100)
  // Next season: re-installing the same lights (CLC: 50% of the original install).
  const nextYear = Math.round((install * (p.reinstallPct ?? 50)) / 100)
  return { installSub, discount, install, removal, total: install + removal, deposit, dueAtInstall: install - deposit, dueAtRemoval: removal, nextYear }
}

// The three payments on a proposal (same as functions/proposalMath.js): the
// deposit at signing, the rest of the install when it's done, and takedown /
// storage at removal. Balance and takedown are payable once staff ask
// (requests.<part>); payments are recorded only by the server.
export const PAY_PARTS = ['deposit', 'balance', 'takedown']
export const PART_LABEL = { deposit: 'Deposit', balance: 'Install balance', takedown: 'Takedown & storage' }
export const paymentOf = (p, part) => (part === 'deposit' ? p.deposit : p.payments?.[part])
export function partAmount(p, part) {
  const t = totals(p)
  return part === 'deposit' ? t.deposit : part === 'balance' ? t.dueAtInstall : t.dueAtRemoval
}
export function isPayable(p, part) {
  const signed = p.status === 'signed' || p.status === 'countersigned'
  return signed && partAmount(p, part) > 0 && paymentOf(p, part)?.status !== 'paid' && (part === 'deposit' || p.requests?.[part] === true)
}

// Takedown & storage: a % of the install with a minimum (CLC's form: 15% of
// total, minimum $150), due at removal.
export function takedownItem(installCents, pct = 15, minDollars = 150) {
  const dollars = Math.max(Math.round(installCents * pct) / 10000, minDollars || 0)
  const label = `Takedown, labeling & storage bins (${pct}% of install${minDollars ? `, minimum $${minDollars}` : ''})`
  return newItem(label, 1, '', dollars, 'removal')
}

// Items from a light design: one line per area (like the paper form: front
// roofline, mulch beds, arch…) with its own feet and rate, then takedown.
// lines: [{ label, feet, rate, details }]
export function itemsFromDesign({ lines, feet, pricePerFoot, takedownPct = 15, takedownMin = 150 }) {
  const list = lines ?? [{ label: 'C9 lights, installed (12" spacing)', feet, rate: pricePerFoot }]
  const items = list.filter((l) => l.feet > 0).map((l) => newItem(l.label, Math.round(l.feet), 'ft', l.rate || 0, 'install', l.details ?? ''))
  if (takedownPct > 0 || takedownMin > 0) items.push(takedownItem(items.reduce((t, i) => t + itemCents(i), 0), takedownPct, takedownMin))
  return items
}

export function newProposal({ customer = {}, items = [], depositPct = 50, discountPct = 0, terms = '', title = 'Christmas lighting proposal', season = '' } = {}) {
  return {
    version: PROPOSAL_VERSION,
    title,
    season,
    customer: { name: customer.name ?? '', email: customer.email ?? '', phone: customer.phone ?? '', address: customer.address ?? '' },
    items,
    discountPct,
    discountLabel: discountPct ? 'Early install discount' : '',
    depositPct,
    notes: '',
    timer: '',
    reinstallPct: 50,
    terms,
    status: 'draft',
  }
}

// {placeholders} in contract terms, filled when the proposal is sent.
export function termVars(p, business = {}) {
  const t = totals(p)
  return {
    business: business.name ?? '',
    businessPhone: business.phone ?? '',
    customerName: p.customer?.name ?? '',
    address: p.customer?.address ?? '',
    season: p.season ?? '',
    total: fmt(t.total),
    install: fmt(t.install),
    deposit: fmt(t.deposit),
    depositPct: `${p.depositPct ?? 0}%`,
    dueAtInstall: fmt(t.dueAtInstall),
    removal: fmt(t.removal),
    nextYear: fmt(t.nextYear),
  }
}
export const fillTerms = (text, vars) => String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))

// The exact content a customer agrees to, in a fixed order. Its SHA-256 is the
// document fingerprint stored when sent and checked when signed: any change
// after sending gives a different fingerprint.
export function canonical(p) {
  const t = totals(p)
  return JSON.stringify({
    v: PROPOSAL_VERSION,
    // Fixed field order: Firestore hands map fields back sorted, not as saved.
    title: p.title ?? '', season: p.season ?? '', customer: ['name', 'email', 'phone', 'address'].map((k) => p.customer?.[k] ?? ''),
    items: (p.items ?? []).map((i) => [i.label, Number(i.qty) || 0, i.unit ?? '', cents(i.rate), i.due, i.details ?? '']),
    discountPct: Number(p.discountPct) || 0, depositPct: Number(p.depositPct) || 0,
    totals: [t.install, t.removal, t.total, t.deposit],
    notes: p.notes ?? '', timer: p.timer ?? '', reinstallPct: p.reinstallPct ?? 50, terms: p.terms ?? '', design: p.designImageHash ?? null,
  })
}

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text)
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export const docHash = (p) => sha256(canonical(p))

// Unguessable link id (128+ bits): the customer's page is reachable only by it.
export function newToken() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const r = globalThis.crypto.getRandomValues(new Uint8Array(24))
  return [...r].map((b) => abc[b % abc.length]).join('')
}

// What's missing before a proposal can be sent.
export function sendProblems(p) {
  const t = totals(p)
  const out = []
  if (!p.customer?.name) out.push('customer name')
  if (!p.customer?.address) out.push('address')
  if (!(p.items ?? []).length || t.total <= 0) out.push('at least one priced item')
  if (!String(p.terms ?? '').trim()) out.push('contract terms')
  if (String(p.terms ?? '').includes('[TO FILL IN')) out.push('the contract terms still marked [TO FILL IN]')
  return out
}
