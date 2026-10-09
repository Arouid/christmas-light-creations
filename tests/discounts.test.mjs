import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthDay, installMonthDay, discountFor, suggestDiscount } from '../src/lib/discounts.js'

test('reads the dates the sheet uses', () => {
  assert.equal(monthDay('Oct 15'), '10-15')
  assert.equal(monthDay('October 3'), '10-03')
  assert.equal(monthDay('11/20/2026'), '11-20')
  assert.equal(monthDay('Oct 11-17'), '10-11')
  assert.equal(monthDay('first week of nov'), null)
  assert.equal(installMonthDay({ weekOf: 'Oct 18-24' }), '10-18')
  assert.equal(installMonthDay({ plannedDate: 'Oct 23', weekOf: 'Oct 18-24' }), '10-23', 'planned date wins')
})

test('Oct 15-31 is 10%, November on none', () => {
  assert.equal(discountFor('10-15'), 10)
  assert.equal(discountFor('10-21'), 10)
  assert.equal(discountFor('10-31'), 10)
  assert.equal(discountFor('11-01'), 0)
  assert.equal(discountFor('12-05'), 0)
  assert.equal(discountFor('10-10'), 0)
  assert.equal(discountFor(null), null)
})

test('suggests discount and total from the rate', () => {
  assert.deepEqual(suggestDiscount({ plannedDate: 'Oct 15', install: { rate: '$460.00', discount: '0', total: '$460.00' } }),
    { pct: 10, discount: '10%', discountReason: 'Early Install', total: '$414.00' })
  assert.equal(suggestDiscount({ plannedDate: 'Oct 15', install: { rate: '$460.00', discount: '10%', total: '$414.00' } }), null, 'already right')
  assert.deepEqual(suggestDiscount({ plannedDate: 'Nov 3', install: { rate: '$1,180', discount: '0', total: '$1,000' } }),
    { pct: 0, discount: '0', discountReason: '', total: '$1,180.00' }, 'regular November install: no discount')
})

test('never touches manual prices or incomplete records', () => {
  assert.equal(suggestDiscount({ plannedDate: 'Dec 2', install: { rate: '$870.00', discount: 'Special Rate', total: '$620.00' } }), null)
  assert.equal(suggestDiscount({ plannedDate: 'Oct 15', install: { rate: '$279.00', discountReason: 'Special Discount' } }), null)
  assert.equal(suggestDiscount({ install: { rate: '$400' } }), null, 'no date')
  assert.equal(suggestDiscount({ plannedDate: 'Oct 15', install: {} }), null, 'no rate')
})

test('pushed early installs never lose their discount', () => {
  const pushed = { plannedDate: 'Nov 5', install: { rate: '$460.00', discount: '10%', discountReason: 'Early Install', total: '$414.00' } }
  assert.equal(suggestDiscount(pushed), null, 'keeps 10% after moving to November')
  const noDiscount = { plannedDate: 'Nov 4', install: { rate: '$500.00', discount: '0', total: '$500.00' } }
  assert.deepEqual(suggestDiscount(noDiscount, undefined, 'Early Install'),
    { pct: 10, discount: '10%', discountReason: 'Early Install', total: '$450.00' }, 'Early Install in November still gets 10%')
  assert.equal(suggestDiscount(noDiscount, undefined, 'Regular Install'), null, 'regular in November: none, already right')
})

test('old 15% early discounts come down to 10%', () => {
  const old = { plannedDate: 'Oct 16', install: { rate: '$460.00', discount: '15%', discountReason: 'Early Install', total: '$391.00' } }
  assert.deepEqual(suggestDiscount(old), { pct: 10, discount: '10%', discountReason: 'Early Install', total: '$414.00' })
})
