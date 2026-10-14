import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contactPatch, sameSender } from '../src/lib/linkSender.js'
import { buildDirectory, docsFor } from '../functions/messageSync.js'

test('linking teaches the record: a new number goes to otherPhones, a known one changes nothing', () => {
  const c = { id: 'pat', phone: '(281) 555-0101', otherPhones: ['+18325550102'], email: 'Pat@example.com', otherEmails: ['pat.work@example.com'] }
  assert.deepEqual(contactPatch(c, { phone: '+17135550103', kind: 'text' }), { otherPhones: ['+18325550102', '+17135550103'] })
  assert.deepEqual(contactPatch(c, { phone: '+12815550101' }), {}, 'the main number')
  assert.deepEqual(contactPatch(c, { phone: '832-555-0102' }), {}, 'already in otherPhones, any format')
  assert.deepEqual(contactPatch(c, { email: 'PAT@example.com' }), {}, 'the main email, any case')
  assert.deepEqual(contactPatch(c, { email: 'pat.home@example.com' }), { otherEmails: ['pat.work@example.com', 'pat.home@example.com'] })
  assert.deepEqual(contactPatch({ id: 'new' }, { phone: '+17135550103' }), { otherPhones: ['+17135550103'] })
  assert.deepEqual(contactPatch(c, { kind: 'request' }), {})
})

test('the rest of that sender’s open messages link along', () => {
  const items = [
    { id: 'a', phone: '+17135550103', dismissed: false },
    { id: 'b', phone: '+17135550103' },
    { id: 'c', phone: '+17135550103', dismissed: true },
    { id: 'd', phone: '+12815550199' },
    { id: 'e', email: 'pat.home@example.com' },
  ]
  assert.deepEqual(sameSender(items, items[0]).map((x) => x.id), ['b'])
  assert.deepEqual(sameSender(items, { id: 'z', email: 'Pat.Home@example.com' }).map((x) => x.id), ['e'])
  assert.deepEqual(sameSender(items, { id: 'z' }), [])
})

test('the live sync matches a customer’s extra numbers and emails, like the import does', () => {
  const dir = buildDirectory([{ id: 'pat', phone: '(281) 555-0101', otherPhones: ['+17135550103'], email: 'pat@example.com', otherEmails: ['Pat.Home@example.com'] }], [])
  const text = { id: 'gv-1', source: 'voice-email', kind: 'text', direction: 'in', phone: '+17135550103', at: '2026-10-14T17:00:00.000Z', text: 'Hi' }
  assert.deepEqual(docsFor(text, dir)[0].data.customerId, 'pat')
  const mail = { idBase: 'em-1', source: 'gmail', kind: 'email', direction: 'in', emails: ['pat.home@example.com'], at: '2026-10-14T17:00:00.000Z', text: 'Hi' }
  assert.equal(docsFor(mail, dir)[0].data.customerId, 'pat')
})
