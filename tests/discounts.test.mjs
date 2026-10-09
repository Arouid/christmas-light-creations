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

test('Oct 15-21 is 15%, rest of October 10%, November on none', () => {
  assert.equal(discountFor('10-15'), 15)
  assert.equal(discountFor('10-21'), 15)
  assert.equal(discountFor('10-22'), 10)
  assert.equal(discountFor('10-31'), 10)
  assert.equal(discountFor('11-01'), 0)
  assert.equal(discountFor('12-05'), 0)
  assert.equal(discountFor('10-10'), 0)
  assert.equal(discountFor(null), null)
})

test('suggests discount and total from the rate', () => {
  assert.deepEqual(suggestDiscount({ plannedDate: 'Oct 15', install: { rate: '$460.00', discount: '0', total: '$460.00' } }),
    { pct: 15, discount: '15%', discountReason: 'Early Install', total: '$391.00' })
  assert.equal(suggestDiscount({ plannedDate: 'Oct 15', install: { rate: '$460.00', discount: '15%', total: '$391.00' } }), null, 'already right')
  assert.deepEqual(suggestDiscount({ plannedDate: 'Nov 3', install: { rate: '$1,180', discount: '10%', total: '$1,062' } }),
    { pct: 0, discount: '0', discountReason: '', total: '$1,180.00' })
})

test('never touches manual prices or incomplete records', () => {
  assert.equal(suggestDiscount({ plannedDate: 'Dec 2', install: { rate: '$870.00', discount: 'Special Rate', total: '$620.00' } }), null)
  assert.equal(suggestDiscount({ plannedDate: 'Oct 15', install: { rate: '$279.00', discountReason: 'Special Discount' } }), null)
  assert.equal(suggestDiscount({ install: { rate: '$400' } }), null, 'no date')
  assert.equal(suggestDiscount({ plannedDate: 'Oct 15', install: {} }), null, 'no rate')
})
