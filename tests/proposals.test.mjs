import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonical, docHash, fillTerms, fmt, itemsFromDesign, newItem, newProposal, newToken, sendProblems, termVars, totals } from '../src/proposals/model.js'
import { DEFAULT_TERMS } from '../src/proposals/terms.js'

const base = () => newProposal({
  customer: { name: 'Pat Sample', email: 'pat@example.com', phone: '281-555-0101', address: '123 Example St, Pearland, TX' },
  items: itemsFromDesign({ feet: 120.4, pricePerFoot: 4.5 }), // 120 ft × $4.50 = $540; takedown 15% = $81
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
  p.terms = DEFAULT_TERMS
  assert.deepEqual(sendProblems(p), ['the contract terms still marked [TO FILL IN]'])
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
