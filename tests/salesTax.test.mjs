import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SALES_TAX, INVOICE_TAX_DEFAULT, salesTaxSettings, taxRateFor, taxSnapshot } from '../src/lib/salesTax.js'

test('sales tax settings: 8.25% from October 15, 2026 unless the owner changes it', () => {
  assert.deepEqual(salesTaxSettings(undefined), DEFAULT_SALES_TAX)
  assert.deepEqual(salesTaxSettings({ salesTax: { ratePct: '6.25', permit: ' 3-12345-6789-0 ', from: '2026-11-01' } }), { ratePct: 6.25, permit: '3-12345-6789-0', from: '2026-11-01' })
  assert.equal(salesTaxSettings({ salesTax: { ratePct: 'abc', from: 'soon' } }).ratePct, 8.25)
  assert.equal(salesTaxSettings({ salesTax: { ratePct: 99 } }).ratePct, 25, 'a typo can’t make a 99% tax')
})

test('the rate for a given day: nothing before the start date, nothing when switched off', () => {
  assert.equal(taxRateFor({}, '2026-10-14'), 0)
  assert.equal(taxRateFor({}, '2026-10-15'), 8.25)
  assert.equal(taxRateFor({ salesTax: { ratePct: 0 } }, '2026-12-01'), 0)
  assert.deepEqual(taxSnapshot({}, '2026-10-20'), { ratePct: 8.25 })
  assert.deepEqual(taxSnapshot({ salesTax: { permit: 'P-1' } }, '2026-10-20'), { ratePct: 8.25, permit: 'P-1' })
  assert.equal(taxSnapshot({}, '2026-10-01'), null)
})

test('invoice kinds: add-ons are taxed by default, re-installs, takedowns and service calls are not', () => {
  assert.deepEqual(INVOICE_TAX_DEFAULT, { install: false, takedown: false, addon: true, service: false, other: false })
})
