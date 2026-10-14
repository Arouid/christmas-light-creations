import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_BLOCKED, blockedReason, describeKey, isBlocked, normalizeKey, senderKey, withBlocked, withoutBlocked } from '../functions/blocklist.js'

test('keys: phones become E.164 however they are written, emails lowercase, junk is dropped', () => {
  assert.equal(normalizeKey('(518) 765-7232'), '+15187657232')
  assert.equal(normalizeKey('1 518 765 7232'), '+15187657232')
  assert.equal(normalizeKey('+15187657232'), '+15187657232')
  assert.equal(normalizeKey(' Orders-Shop.com@Shared1.CCSEND.com '), 'orders-shop.com@shared1.ccsend.com')
  assert.equal(normalizeKey('hello'), '')
  assert.equal(normalizeKey(''), '')
  assert.equal(normalizeKey(null), '')
})

test('the sender of a stored message or a sync event', () => {
  assert.equal(senderKey({ phone: '+15187657232', kind: 'text' }), '+15187657232')
  assert.equal(senderKey({ email: 'Orders@shared1.ccsend.com', kind: 'email' }), 'orders@shared1.ccsend.com')
  assert.equal(senderKey({ emails: ['Rick@janpro.example.com'], direction: 'in' }), 'rick@janpro.example.com')
  assert.equal(senderKey({}), '')
})

test('block, unblock, no duplicates, capped', () => {
  let list = withBlocked(undefined, '518-765-7232')
  assert.deepEqual(list, ['+15187657232'])
  list = withBlocked(list, '+1 (518) 765-7232')
  assert.deepEqual(list, ['+15187657232'], 'same number once')
  list = withBlocked(list, 'Orders@shared1.ccsend.com')
  assert.ok(isBlocked(list, '(518) 765-7232') && isBlocked(list, 'orders@SHARED1.ccsend.com'))
  assert.equal(isBlocked(list, '281-819-0163'), false)
  assert.deepEqual(withoutBlocked(list, '5187657232'), ['orders@shared1.ccsend.com'])
  assert.deepEqual(withBlocked(['junk', '', 'x@y.z'], ''), ['x@y.z'], 'junk entries are cleaned out, an empty key adds nothing')
  const big = withBlocked(Array.from({ length: MAX_BLOCKED }, (_, i) => `+1800555${String(i).padStart(4, '0')}`), '+15187657232')
  assert.equal(big.length, MAX_BLOCKED)
  assert.equal(big.at(-1), '+15187657232')
})

test('the sync drops incoming texts and emails from blocked senders, never outgoing mail', () => {
  const list = ['+15187657232', 'orders@shared1.ccsend.com']
  assert.equal(blockedReason({ source: 'voice-email', direction: 'in', phone: '+15187657232' }, list), 'blocked')
  assert.equal(blockedReason({ source: 'gmail', direction: 'in', emails: ['orders@shared1.ccsend.com'] }, list), 'blocked')
  assert.equal(blockedReason({ source: 'gmail', direction: 'out', emails: ['orders@shared1.ccsend.com'] }, list), '')
  assert.equal(blockedReason({ source: 'voice-email', direction: 'in', phone: '+12815550101' }, list), '')
  assert.equal(blockedReason({ direction: 'in', phone: '+15187657232' }, undefined), '')
  assert.equal(blockedReason(null, list), '')
})

test('the Settings list shows numbers as people write them', () => {
  assert.equal(describeKey('+15187657232'), '(518) 765-7232')
  assert.equal(describeKey('orders@shared1.ccsend.com'), 'orders@shared1.ccsend.com')
  assert.equal(describeKey('+4420712345'), '+4420712345')
})
