import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PAY_DAYS, centralDayOf, dueText, payIn3Due, payIn3Reminder } from '../functions/payIn3.js'
import { payableProblem } from '../functions/payments.js'
import { accountSummary } from '../functions/account.js'
import { isPayable, newItem, newProposal, partDue } from '../src/proposals/model.js'

test('pay in 3 dates: the chosen day (1st or 15th) in each of the two months after signing', () => {
  assert.deepEqual(PAY_DAYS, [1, 15])
  assert.deepEqual(payIn3Due('2026-10-12', 15), { balance: '2026-11-15', takedown: '2026-12-15' })
  assert.deepEqual(payIn3Due('2026-10-30', 1), { balance: '2026-11-01', takedown: '2026-12-01' })
  assert.deepEqual(payIn3Due('2026-12-20', '15'), { balance: '2027-01-15', takedown: '2027-02-15' }, 'into the next year, string day accepted')
  assert.equal(payIn3Due('2026-10-12', 10), null, 'only the 1st or the 15th')
  assert.equal(payIn3Due('', 15), null)
  assert.equal(centralDayOf('2026-10-13T03:30:00Z'), '2026-10-12', 'late evening Central is still the 12th')
  assert.equal(centralDayOf({ seconds: Date.UTC(2026, 9, 12, 15) / 1000 }), '2026-10-12')
  assert.equal(dueText('2026-11-15'), 'November 15')
})

test('reminders: on the due day and a week later, nothing else', () => {
  assert.equal(payIn3Reminder('2026-11-15', '2026-11-15'), 'due')
  assert.equal(payIn3Reminder('2026-11-15', '2026-11-22'), 'late')
  assert.equal(payIn3Reminder('2026-11-15', '2026-11-16'), null)
  assert.equal(payIn3Reminder('2026-11-15', '2026-11-14'), null)
})

test('payments 2 and 3 open on their day (page, server and account alike), or when staff ask', () => {
  const p = { ...newProposal({ items: [newItem('Roofline', 100, 'ft', 5)] }), plan: 'payin3', status: 'signed', signedAt: '2026-10-12T20:00:00Z', payDay: 15 }
  assert.equal(partDue(p, 'balance'), '2026-11-15')
  assert.equal(partDue(p, 'deposit'), null)
  assert.ok(isPayable(p, 'deposit', '2026-10-12'))
  assert.ok(!isPayable(p, 'balance', '2026-11-14'))
  assert.ok(isPayable(p, 'balance', '2026-11-15'))
  assert.ok(isPayable({ ...p, requests: { balance: true } }, 'balance', '2026-10-20'), 'staff can still ask early')
  assert.equal(payableProblem(p, 'balance', '2026-11-14')?.[1], 'This payment isn’t due yet')
  assert.equal(payableProblem(p, 'balance', '2026-11-15'), null)
  assert.equal(payableProblem(p, 'balance')?.[0], 'failed-precondition', 'without a day only staff requests open it')
  const before = accountSummary('t', p, '2026-11-01').parts.find((x) => x.part === 'balance')
  assert.equal(before.state, 'later'); assert.equal(before.due, '2026-11-15')
  assert.equal(accountSummary('t', p, '2026-11-15').parts.find((x) => x.part === 'balance').state, 'due')
  // A purchase (no plan) is unchanged: balance waits for staff.
  const plain = { ...newProposal({ items: [newItem('Roofline', 100, 'ft', 5)] }), status: 'signed', signedAt: '2026-10-12T20:00:00Z' }
  assert.ok(!isPayable(plain, 'balance', '2026-12-01'))
  assert.equal(accountSummary('t', plain, '2026-12-01').parts.find((x) => x.part === 'balance').due, null)
})
