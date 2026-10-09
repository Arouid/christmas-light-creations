import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonical, docHash, fillTerms, fmt, itemsFromDesign, newItem, newProposal, newToken, sendProblems, termVars, totals } from '../src/proposals/model.js'
import { DEFAULT_TERMS } from '../src/proposals/terms.js'

const base = () => newProposal({
  customer: { name: 'Pat Sample', email: 'pat@example.com', phone: '281-555-0101', address: '123 Example St, Pearland, TX' },
  items: itemsFromDesign({ feet: 120.4, pricePerFoot: 4.5, takedownMin: 0 }), // 120 ft × $4.50 = $540; takedown 15% = $81
  discountPct: 10, depositPct: 50, season: '2026',
})

test('payment schedule: discount on the install only, deposit from the discounted install', () => {
  const t = totals(base())
  assert.equal(fmt(t.installSub), '$540.00')
  assert.equal(fmt(t.discount), '$54.00')
  assert.equal(fmt(t.install), '$486.00')
  assert.equal(fmt(t.removal), '$81.00')
  assert.equal(fmt(t.total), '$567.00')
  assert.equal(fmt(t.deposit), '$243.00')
  assert.equal(fmt(t.dueAtInstall), '$243.00')
  assert.equal(fmt(t.dueAtRemoval), '$81.00')
})

test('terms placeholders fill from the proposal', () => {
  const p = base()
  const filled = fillTerms(DEFAULT_TERMS, termVars(p, { name: 'Christmas Light Creations', phone: '281-819-0163' }))
  assert.match(filled, /deposit of \$243\.00 \(50% of the install\)/)
  assert.match(filled, /at 123 Example St, Pearland, TX for the 2026 season/)
  assert.doesNotMatch(filled, /\{(total|deposit|address)\}/)
})

test('can’t send with missing pieces or unfinished terms', () => {
  const p = base()
  assert.deepEqual(sendProblems(p), ['contract terms'])
  p.terms = 'Refunds: [TO FILL IN: policy]'
  assert.deepEqual(sendProblems(p), ['the contract terms still marked [TO FILL IN]'])
  p.terms = DEFAULT_TERMS
  assert.deepEqual(sendProblems(p), [], 'the default terms are finished')
  p.terms = 'All good.'
  assert.deepEqual(sendProblems(p), [])
})

test('document fingerprint changes with any agreed detail, not with status', async () => {
  const p = { ...base(), terms: 'Terms v1' }
  const h1 = await docHash(p)
  assert.match(h1, /^[0-9a-f]{64}$/)
  assert.equal(await docHash({ ...p, status: 'sent', sentAt: 'x' }), h1)
  assert.notEqual(await docHash({ ...p, items: [...p.items, newItem('Wreath', 1, '', 40)] }), h1)
  assert.notEqual(await docHash({ ...p, terms: 'Terms v2' }), h1)
  assert.ok(canonical(p).includes('Pat Sample'))
})

test('link tokens are long and random', () => {
  const a = newToken()
  assert.equal(a.length, 24)
  assert.notEqual(a, newToken())
  assert.match(a, /^[A-Za-z2-9]+$/)
})

import { takedownItem } from '../src/proposals/model.js'

test('paper-form rules: one line per area, takedown 15% with a $150 minimum, re-install 50%', () => {
  const items = itemsFromDesign({ lines: [
    { label: 'Front roofline', feet: 141, rate: 5, details: 'Clear incandescent · clips · timer' },
    { label: 'Mulch beds', feet: 125, rate: 3.75, details: 'Clear · stakes' },
    { label: 'Arch', feet: 24, rate: 4.5 },
  ] })
  assert.deepEqual(items.map((i) => [i.label, i.qty]), [['Front roofline', 141], ['Mulch beds', 125], ['Arch', 24], [items[3].label, 1]])
  const p = newProposal({ items, depositPct: 50 })
  const t = totals(p)
  assert.equal(fmt(t.install), '$1,281.75', '$705 + $468.75 + $108')
  assert.equal(fmt(t.removal), '$192.26', '15% of install (over the $150 minimum)')
  assert.equal(fmt(t.nextYear), '$640.88')
  assert.equal(items[0].details, 'Clear incandescent · clips · timer')
  assert.equal(fmt(Math.round(takedownItem(50000).rate * 100)), '$150.00', 'small job: minimum $150')
})

test('fingerprint ignores field order and missing customer fields (Firestore sorts map keys)', async () => {
  const p = newProposal({ customer: { name: 'Ann Lee', address: '1 Elm St' } })
  const fromDb = { ...p, customer: { address: '1 Elm St', email: '', name: 'Ann Lee', phone: '' } }
  assert.equal(await docHash(p), await docHash(fromDb))
  assert.notEqual(await docHash(p), await docHash({ ...p, customer: { ...p.customer, address: '2 Elm St' } }))
})
