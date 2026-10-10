import { test } from 'node:test'
import assert from 'node:assert/strict'
import { captureProblem, customIdFor, payableProblem } from '../functions/payments.js'
import { partCents } from '../functions/proposalMath.js'
import { accountUrl, emailsOf, normEmail } from '../functions/account.js'

// Security review 2026-10-09: what the payment functions refuse.
const items = [{ qty: 100, rate: 5 }, { qty: 1, rate: 150, due: 'removal' }]
const signed = { status: 'signed', items, depositPct: 50 }

test('payable: only signed proposals, known parts, not yet paid, something due', () => {
  assert.equal(payableProblem(signed, 'deposit'), null)
  assert.equal(payableProblem(undefined, 'deposit')[0], 'not-found')
  assert.equal(payableProblem(signed, 'refund')[0], 'invalid-argument')
  assert.equal(payableProblem(signed, ['deposit'])[0], 'invalid-argument')
  for (const status of ['draft', 'sent', 'viewed', 'void', 'declined']) {
    assert.equal(payableProblem({ ...signed, status }, 'deposit')[0], 'failed-precondition', status)
  }
  assert.equal(payableProblem({ ...signed, status: 'countersigned' }, 'deposit'), null)
  assert.equal(payableProblem({ ...signed, deposit: { status: 'paid' } }, 'deposit')[0], 'already-exists')
  assert.equal(payableProblem({ ...signed, depositPct: 0 }, 'deposit')[0], 'failed-precondition')
})

test('payable: balance and takedown only once staff ask, and only once', () => {
  assert.equal(payableProblem(signed, 'balance')[0], 'failed-precondition')
  assert.equal(payableProblem(signed, 'takedown')[0], 'failed-precondition')
  const asked = { ...signed, requests: { balance: true, takedown: true } }
  assert.equal(payableProblem(asked, 'balance'), null)
  assert.equal(payableProblem(asked, 'takedown'), null)
  assert.equal(payableProblem({ ...asked, payments: { takedown: { status: 'paid' } } }, 'takedown')[0], 'already-exists')
  assert.equal(payableProblem({ ...asked, requests: { balance: 'true' } }, 'balance')[0], 'failed-precondition')
})

const capture = ({ value = '250.00', currency = 'USD', customId = 'tok', status = 'COMPLETED' } = {}) => ({
  id: 'ORDER1', status,
  purchase_units: [{ custom_id: customId, payments: { captures: [{ id: 'CAP1', status, amount: { value, currency_code: currency } }] } }],
})

test('capture: accepts only a completed USD capture for this proposal, part and amount', () => {
  const want = { customId: 'tok', amount: partCents(signed, 'deposit') }
  assert.equal(want.amount, 25000)
  assert.equal(captureProblem(capture(), want), null)
  assert.ok(captureProblem(capture({ currency: 'JPY' }), want), 'same number in another currency')
  assert.ok(captureProblem(capture({ value: '249.99' }), want), 'short by a cent')
  assert.ok(captureProblem(capture({ value: '500.00' }), want), 'wrong amount')
  assert.ok(captureProblem(capture({ customId: 'other-token' }), want), "another proposal's order")
  assert.ok(captureProblem(capture({ customId: 'tok:balance' }), want), "another part's order")
  assert.ok(captureProblem(capture({ status: 'PENDING' }), want), 'not completed')
  assert.ok(captureProblem({}, want), 'empty answer')
  assert.ok(captureProblem(undefined, want), 'no answer')
})

test('custom ids keep parts apart', () => {
  assert.equal(customIdFor('tok', 'deposit'), 'tok')
  assert.equal(customIdFor('tok', 'balance'), 'tok:balance')
  assert.notEqual(customIdFor('tok', 'takedown'), customIdFor('tok', 'balance'))
})

test('accounts: email matching is exact apart from case and spaces', () => {
  assert.equal(normEmail('  John@Example.COM '), 'john@example.com')
  assert.notEqual(normEmail('john+x@example.com'), normEmail('john@example.com'))
  assert.notEqual(normEmail('j.ohn@example.com'), normEmail('john@example.com'))
  assert.equal(normEmail(undefined), '')
  assert.equal(normEmail({ toString: () => 'x' }), 'x')
  assert.deepEqual(emailsOf('A@x.com, b@y.com'), ['a@x.com', 'b@y.com'])
  assert.ok(!emailsOf('evil-a@x.com').includes('a@x.com'))
})

test('accounts: sign-in link never returns to a foreign site', () => {
  assert.equal(accountUrl('https://evil.example'), 'https://christmas-light-creations.com/account/')
  assert.equal(accountUrl('https://christmas-light-creations.com.evil.example'), 'https://christmas-light-creations.com/account/')
  assert.equal(accountUrl(undefined), 'https://christmas-light-creations.com/account/')
  assert.equal(accountUrl('http://localhost:5173'), 'http://localhost:5173/account/')
})

test('the order is checked before capturing: only an approved, single, USD, full-amount order for this payment', async () => {
  const { orderProblem, validOrderId } = await import('../functions/payments.js')
  const good = { status: 'APPROVED', intent: 'CAPTURE', purchase_units: [{ custom_id: 'TOK:balance', amount: { currency_code: 'USD', value: '267.30' } }] }
  const want = { customId: 'TOK:balance', amount: 26730 }
  assert.equal(orderProblem(good, want), null)
  const bad = (change) => orderProblem({ ...good, ...change }, want)
  assert.ok(bad({ status: 'CREATED' }), 'not approved by the payer yet')
  assert.ok(bad({ intent: 'AUTHORIZE' }))
  assert.ok(bad({ purchase_units: [{ ...good.purchase_units[0], amount: { currency_code: 'USD', value: '1.00' } }] }), 'wrong amount')
  assert.ok(bad({ purchase_units: [{ ...good.purchase_units[0], amount: { currency_code: 'MXN', value: '267.30' } }] }), 'wrong currency')
  assert.ok(bad({ purchase_units: [{ ...good.purchase_units[0], custom_id: 'TOK' }] }), 'deposit order used for the balance')
  assert.ok(bad({ purchase_units: [good.purchase_units[0], good.purchase_units[0]] }), 'two purchases')
  assert.ok(orderProblem(null, want))
  assert.equal(validOrderId('5O190127TN364715T'), true)
  assert.equal(validOrderId('../../v1/x'), false)
  assert.equal(validOrderId(''), false)
})

test('one capture at a time per payment; an abandoned lock expires', async () => {
  const { lockProblem, LOCK_MS } = await import('../functions/payments.js')
  const now = 1_000_000_000
  assert.equal(lockProblem(undefined, 'A', now), null)
  assert.equal(lockProblem({ orderId: 'A', at: now - 1000 }, 'A', now), null) // same order retrying
  assert.equal(lockProblem({ orderId: 'A', at: now - 1000 }, 'B', now)[0], 'aborted') // another order mid-capture
  assert.equal(lockProblem({ orderId: 'A', at: now - 1000 }, null, now)[0], 'aborted') // new order while one is going through
  assert.equal(lockProblem({ orderId: 'A', at: now - LOCK_MS - 1 }, 'B', now), null) // abandoned
})
