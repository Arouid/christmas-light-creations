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
  assert.match(filled, /home or business at 123 Example St, Pearland, TX\./)
  assert.ok(!DEFAULT_TERMS.includes('late fee of'), 'no late fees (owner)')
  assert.match(filled, /for the 2026 season/)
  assert.doesNotMatch(filled, /\{\w+\}/, 'every placeholder filled')
  assert.ok(filled.includes(`The total is ${fmt(totals(p).total)}. A deposit`), 'no tax note without a rate')
  const taxed = fillTerms(DEFAULT_TERMS, termVars({ ...p, tax: { ratePct: 8.25 } }, { name: 'CLC' }))
  const tp = { ...p, tax: { ratePct: 8.25 } }
  assert.ok(taxed.includes(`The total is ${fmt(totals(tp).total)}, including ${fmt(totals(tp).tax)} of Texas sales tax (8.25%).`), taxed.slice(0, 400))
  const incl = fillTerms(DEFAULT_TERMS, termVars({ ...p, tax: { ratePct: 8.25, mode: 'included' } }, { name: 'CLC' }))
  assert.ok(incl.includes(`The total is ${fmt(totals(p).total)}, which includes Texas sales tax.`), incl.slice(0, 400))
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

test('payments: deposit once signed; balance and takedown only after staff ask; never twice', async () => {
  const { isPayable, partAmount } = await import('../src/proposals/model.js')
  const p = newProposal({ items: [newItem('Lights', 100, 'ft', 4.5), newItem('Takedown', 1, '', 150, 'removal')], depositPct: 50 })
  assert.equal(isPayable(p, 'deposit'), false, 'not before signing')
  p.status = 'signed'
  assert.equal(isPayable(p, 'deposit'), true)
  assert.equal(isPayable(p, 'balance'), false, 'balance waits for staff')
  p.requests = { balance: true }
  assert.equal(isPayable(p, 'balance'), true)
  assert.equal(partAmount(p, 'balance'), 22500)
  assert.equal(partAmount(p, 'takedown'), 15000)
  p.payments = { balance: { status: 'paid', amount: 22500 } }
  assert.equal(isPayable(p, 'balance'), false, 'not twice')
  assert.equal(isPayable(p, 'takedown'), false)
})

// Sales tax (owner 2026-10-12, docs/specs/receipts.md).
test('sales tax: on taxable lines after the discount, inside the deposit; takedown of owned lights untaxed; older proposals unchanged', () => {
  const items = [newItem('Roofline C9', 100, 'ft', 5), newItem('Takedown', 1, '', 150, 'removal')]
  assert.equal(items[0].taxable, true)
  assert.equal(items[1].taxable, false)
  const p = newProposal({ items, discountPct: 10, depositPct: 50, tax: { ratePct: 8.25 } })
  const t = totals(p)
  assert.equal(t.install, 45000)
  assert.equal(t.installTax, 3713, '8.25% of $450.00 = $37.125 → $37.13')
  assert.equal(t.removalTax, 0)
  assert.equal(t.tax, 3713)
  assert.equal(t.installTotal, 48713)
  assert.equal(t.deposit, 24357, 'half of the taxed install')
  assert.equal(t.dueAtInstall, 24356)
  assert.equal(t.dueAtRemoval, 15000)
  assert.equal(t.total, 63713)
  assert.equal(t.nextYear, 25000, 're-install price is before tax')
  const v = termVars(p, { name: 'CLC' })
  assert.equal(v.tax, '$37.13'); assert.equal(v.taxRate, '8.25%'); assert.equal(v.total, '$637.13'); assert.equal(v.removal, '$150.00')
  // A taxable removal line (a lease: takedown inside the taxed price).
  const lease = newProposal({ items: [newItem('Lease, 2026 season', 1, '', 1000), newItem('Takedown', 1, '', 100, 'removal', '', true)], tax: { ratePct: 8 } })
  assert.equal(totals(lease).removalTax, 800)
  assert.equal(totals(lease).dueAtRemoval, 10800)
  // No rate → nothing, even with taxable lines; and the fingerprint input doesn't mention tax.
  const old = newProposal({ items, discountPct: 10, depositPct: 50 })
  const to = totals(old)
  assert.equal(to.tax, 0); assert.equal(to.deposit, 22500); assert.equal(to.total, 60000)
  assert.ok(!canonical(old).includes('"tax"'))
  assert.ok(canonical(p).includes('"tax":[8.25,[1,0],3713,0,"added"]'))
  assert.notEqual(canonical(p), canonical({ ...p, items: [{ ...items[0], taxable: false }, items[1]] }), 'flipping a line’s tax changes the fingerprint')
})

test('sales tax included in the prices (owner: hideable on the contract): totals unchanged, the tax backed out for the books, a different fingerprint', () => {
  const items = [newItem('Roofline C9', 100, 'ft', 5), newItem('Takedown', 1, '', 150, 'removal')]
  const p = newProposal({ items, discountPct: 10, depositPct: 50, tax: { ratePct: 8.25, mode: 'included' } })
  const t = totals(p)
  assert.equal(t.taxIncluded, true)
  assert.equal(t.installTotal, 45000); assert.equal(t.total, 60000); assert.equal(t.deposit, 22500, 'the customer pays the listed prices')
  assert.equal(t.installTax, 3430, '$450 contains $34.30 of tax at 8.25% (450 − 450 ÷ 1.0825)')
  assert.equal(t.tax, 3430)
  assert.ok(canonical(p).includes('"included"'))
  assert.notEqual(canonical(p), canonical({ ...p, tax: { ratePct: 8.25 } }))
})

// Pay in 3 and leases (owner 2026-10-12, docs/specs/pay-in-3.md).
test('pay in 3: three equal payments of everything, tax inside, the last takes the odd cent; a lease is 10% off next season', async () => {
  const { KINDS, PLANS, isPayIn3, partLabel, thirds } = await import('../src/proposals/model.js')
  assert.deepEqual(thirds(100000), [33333, 33333, 33334])
  assert.deepEqual(thirds(1000), [333, 333, 334])
  const items = [newItem('Roofline C9', 100, 'ft', 5), newItem('Takedown', 1, '', 150, 'removal')]
  const p = newProposal({ items, discountPct: 10, depositPct: 50, tax: { ratePct: 8.25 } })
  const plain = totals(p)
  const t = totals({ ...p, plan: 'payin3' })
  assert.equal(t.payIn3, true)
  assert.equal(t.total, plain.total, 'the same money, split differently')
  assert.equal(t.deposit + t.dueAtInstall + t.dueAtRemoval, t.total)
  assert.deepEqual([t.deposit, t.dueAtInstall, t.dueAtRemoval], thirds(plain.total))
  assert.equal(t.nextYear, plain.nextYear, 'a purchase paid in 3 still re-installs at 50%')
  const lease = totals({ ...p, kind: 'lease', plan: 'payin3', items: [items[0]] })
  assert.equal(lease.nextYear, 45000, '10% off the $500 list price next season')
  assert.equal(partLabel({ plan: 'payin3' }, 'takedown'), 'Payment 3 of 3')
  assert.equal(partLabel({}, 'takedown'), 'Takedown')
  assert.ok(isPayIn3({ plan: 'payin3' }) && !isPayIn3({ kind: 'lease' }))
  assert.ok(KINDS.some(([k]) => k === 'lease') && PLANS.some(([k]) => k === 'payin3'))
  const v = termVars({ ...p, plan: 'payin3' }, { name: 'CLC' })
  assert.equal(v.payment1, fmt(t.deposit)); assert.equal(v.payment3, fmt(t.dueAtRemoval))
  assert.ok(canonical({ ...p, plan: 'payin3' }).includes('"plan":"payin3"') && !canonical(p).includes('plan'))
})

test('terms by kind and plan: Pay in 3 swaps the payment and cancellation clauses, a lease the ownership clause, the rest untouched', async () => {
  const { LEASE_OWNERSHIP, PAYIN3_CANCELLATION, PAYIN3_PAYMENT, defaultTerms } = await import('../src/proposals/terms.js')
  assert.equal(defaultTerms(), DEFAULT_TERMS)
  const p3 = defaultTerms({ plan: 'payin3' })
  assert.ok(p3.includes(PAYIN3_PAYMENT) && p3.includes(PAYIN3_CANCELLATION) && !p3.includes('A deposit of {deposit}'))
  assert.ok(p3.includes('3. Scheduling and weather.') && p3.includes('12. Electronic signature.') && p3.includes('8. Damage, insurance and limits on liability.'))
  const lease = defaultTerms({ kind: 'lease', plan: 'payin3' })
  assert.ok(lease.includes(LEASE_OWNERSHIP) && !lease.includes('the lights and materials are yours'))
  const { ADDON_OWNERSHIP } = await import('../src/proposals/terms.js')
  const addon = defaultTerms({ kind: 'addon' })
  assert.ok(addon.includes(ADDON_OWNERSHIP) && addon.includes('2. Price and payment. The total') && !addon.includes('the lights and materials are yours'))
  assert.ok(DEFAULT_TERMS.includes('home or business at {address}') && DEFAULT_TERMS.includes('christmas-light-creations.com/privacy'))
  // The owner's own terms keep their other clauses; terms without numbered clauses are left alone.
  const custom = DEFAULT_TERMS.replace('Installs begin October 15', 'Installs begin October 20')
  assert.ok(defaultTerms({ plan: 'payin3' }, custom).includes('October 20') && defaultTerms({ plan: 'payin3' }, custom).includes(PAYIN3_PAYMENT))
  assert.equal(defaultTerms({ plan: 'payin3' }, 'Just a paragraph.'), 'Just a paragraph.')
})

test('seasonal service terms (invoices): fill with the business only, say paying is agreeing, Texas and the limits in capitals, no late fees', async () => {
  const { SEASONAL_TERMS } = await import('../src/proposals/terms.js')
  const t = fillTerms(SEASONAL_TERMS, { business: 'Christmas Light Creations', businessPhone: '281-819-0163' })
  assert.doesNotMatch(t, /\{\w+\}/)
  assert.ok(t.includes('Paying the invoice is your agreement') && t.includes('Brazoria County, Texas') && t.includes('OUR TOTAL LIABILITY FOR THIS WORK IS LIMITED') && t.includes('We do not charge late fees'))
  const words = t.split(/\s+/).filter(Boolean).length
  assert.ok(words > 300 && words < 900, `about a page: ${words} words`)
})

test('gutters and clips (owner 2026-10-12): explained in the access clause and excluded in the capitalized limits, in both documents', async () => {
  const { SEASONAL_TERMS } = await import('../src/proposals/terms.js')
  for (const t of [DEFAULT_TERMS, SEASONAL_TERMS]) {
    assert.ok(t.includes('Clips can end up in a gutter for many reasons') && t.includes('not responsible for clogged gutters, downspouts or drainage'))
    assert.ok(t.includes('FOR CLOGGED GUTTERS, DOWNSPOUTS OR DRAINAGE OR WATER DAMAGE FROM A CLOG'))
    assert.ok(t.includes('Normal ladder use can leave marks, scratches or small bends') || t.includes('normal ladder use can leave marks, scratches or small bends'))
    assert.ok(t.includes('dropping or slamming a ladder into it') && t.includes('FOR MARKS, SCRATCHES OR SMALL BENDS IN GUTTERS FROM NORMAL LADDER USE'))
    assert.ok(t.includes('some wear is unavoidable') && t.includes('FOR NORMAL WEAR TO PLANTS, BEDS, MULCH AND LAWNS'))
    assert.ok(t.includes('express permission to enter and work anywhere on the outside of the property') && t.includes('we never enter the home'))
    assert.ok(t.includes('You are required to tell us, before we start') && t.includes('landscape and pathway lights and their wires') && t.includes('NOT TOLD ABOUT AND COULD NOT REASONABLY SEE'))
  }
})
