// Proposals (estimate + contract) as plain JSON. Pure functions only (no
// React, no Firebase) so they can be tested and reused in another app.
//
// Money is kept in cents internally to avoid rounding drift.

export const PROPOSAL_VERSION = 1
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
export const newItem = (label = '', qty = 1, unit = '', rate = 0, due = 'install') => ({ id: itemId(), label, qty, unit, rate, due })
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
  return { installSub, discount, install, removal, total: install + removal, deposit, dueAtInstall: install - deposit, dueAtRemoval: removal }
}

// Items from a light design: lit feet × price per foot, plus takedown & storage
// as a % of the install (CLC policy: no more than 15%, due at removal).
export function itemsFromDesign({ feet, pricePerFoot, takedownPct = 15, label = 'C9 lights, installed (12" spacing)' }) {
  const ft = Math.round(feet)
  const install = newItem(label, ft, 'ft', pricePerFoot || 0, 'install')
  const items = [install]
  if (takedownPct > 0) items.push(newItem(`Takedown, labeling & storage bins (${takedownPct}% of install)`, 1, '', Math.round(ft * (pricePerFoot || 0) * takedownPct) / 100, 'removal'))
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
    title: p.title, season: p.season, customer: p.customer,
    items: (p.items ?? []).map((i) => [i.label, Number(i.qty) || 0, i.unit ?? '', cents(i.rate), i.due]),
    discountPct: Number(p.discountPct) || 0, depositPct: Number(p.depositPct) || 0,
    totals: [t.install, t.removal, t.total, t.deposit],
    notes: p.notes ?? '', terms: p.terms ?? '', design: p.designImageHash ?? null,
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
