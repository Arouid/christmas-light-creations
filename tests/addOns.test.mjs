import { test } from 'node:test'
import assert from 'node:assert/strict'
import { draftsFromText, needsAddOnCheck, yearlyPrice } from '../src/lib/addOns.js'
import { addOnFromProposal, customerForAccount, emailsOf } from '../functions/account.js'
import { canonical, newItem, newProposal, totals } from '../src/proposals/model.js'

const cust = {
  originalRate: '$680.00', since: '2016',
  addOns: [{ id: 'a', season: '2023', what: '8 windows', price: 240 }, { id: 'b', season: '2026', what: 'Arch', price: 300 }],
}

test('yearly price = 50% of original + 50% of each earlier add-on (undiscounted)', () => {
  const y = yearlyPrice(cust, '2026')
  assert.equal(y.baseCents, 34000)
  assert.deepEqual(y.lines.map((l) => l.addsCents), [12000])
  assert.equal(y.yearlyCents, 46000)
  // Added this season: billed in full now, not yet in the yearly price.
  assert.deepEqual(y.thisSeason.map((l) => [l.what, l.priceCents, l.addsCents]), [['Arch', 30000, 15000]])
  // Next season it's included, and it stays every year after.
  assert.equal(yearlyPrice(cust, '2027').yearlyCents, 61000)
  assert.equal(yearlyPrice(cust, '2030').yearlyCents, 61000)
})

test('no original rate → no yearly price (staff must set it)', () => {
  assert.equal(yearlyPrice({ addOns: cust.addOns }, '2026').yearlyCents, null)
})

test('old notes become drafts with year and price; the original install is skipped', () => {
  const d = draftsFromText('Original install 2016 $680\n2023: 8 windows $240; 2025 small arch by the walkway\nlikes warm white')
  assert.deepEqual(d.map(({ season, what, price }) => [season, what, price]), [['2023', '8 windows', 240], ['2025', 'small arch by the walkway', '']])
  assert.deepEqual(draftsFromText('Added tree wrap $1,250.50'), [{ season: '', what: 'Added tree wrap', price: 1250.5, from: 'Added tree wrap $1,250.50' }])
  assert.equal(needsAddOnCheck({ installHistory: 'x' }), true)
  assert.equal(needsAddOnCheck({ installHistory: 'x', addOnsChecked: true }), false)
})

test('signed add-on proposal records the undiscounted install, not takedown', () => {
  const p = newProposal({ items: [newItem('Arch', 1, '', 300), newItem('Bushes', 20, 'ft', 2.5), newItem('Takedown', 1, '', 150, 'removal')], discountPct: 10, season: '2026' })
  assert.deepEqual(addOnFromProposal('TOKEN123456789', p), { id: 'p-TOKEN123', season: '2026', what: 'Arch, Bushes', price: 350, source: 'proposal', token: 'TOKEN123456789' })
})

test('next-season price: new proposals undiscounted, older ones unchanged', () => {
  const items = [newItem('Roofline', 100, 'ft', 5)]
  const fresh = newProposal({ items, discountPct: 10 })
  assert.equal(totals(fresh).nextYear, 25000) // 50% of $500, before the 10% discount
  const { reinstallBasis: _drop, ...old } = fresh // sent before 2026-10-09
  assert.equal(totals(old).nextYear, 22500) // as it was signed: 50% of $450
  // Older proposals' fingerprint content doesn't gain new keys.
  assert.equal(canonical(old).includes('reinstallBasis'), false)
  assert.equal(canonical(old).includes('"kind"'), false)
})

test('customer account sees the price only after staff allow it, and only price inputs', () => {
  assert.equal(customerForAccount({ ...cust, priceShown: false }), null)
  assert.deepEqual(customerForAccount({ ...cust, priceShown: true, notes: 'staff only', gateCode: '1234' }), {
    originalRate: '$680.00', since: '2016', addOns: [{ season: '2023', what: '8 windows', price: 240 }, { season: '2026', what: 'Arch', price: 300 }],
  })
  assert.deepEqual(emailsOf('Pat@Example.com, pat.work@example.com'), ['pat@example.com', 'pat.work@example.com'])
})
