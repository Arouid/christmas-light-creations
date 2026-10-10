import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appSentKeys, buildDirectory, docsFor, parseItem } from '../functions/messageSync.js'
import { DAILY_LIMIT, historyEntry, historyTarget, recipientsOf, sendAllowed, staffEmailRequest } from '../functions/staffEmail.js'

// Sample people (no real data).
const customer = { fullName: 'Pat Sample', email: 'Pat.Sample@Example.com, pat2@example.com', otherEmails: ['old.pat@example.org'] }
const ok = { to: ' Pat.Sample@Example.com ', subject: ' Your 2026 Christmas lights ', text: 'Hi Pat,\r\n\r\nWe are booking 2026 installs now.\r\n\r\nThank you,\r\nChristmas Light Creations\r\n', customerId: 'pat-sample', template: 'reinstall' }

test('a good request is cleaned up', () => {
  const r = staffEmailRequest(ok)
  assert.equal(r.problem, undefined)
  assert.equal(r.to, 'pat.sample@example.com')
  assert.equal(r.subject, 'Your 2026 Christmas lights')
  assert.equal(r.text, 'Hi Pat,\n\nWe are booking 2026 installs now.\n\nThank you,\nChristmas Light Creations')
  assert.deepEqual(r.target, { field: 'customerId', coll: 'customers', id: 'pat-sample' })
  assert.equal(r.template, 'reinstall')
})

test('bad requests are refused with a reason', () => {
  const refused = (change) => staffEmailRequest({ ...ok, ...change }).problem?.[0]
  assert.equal(staffEmailRequest(null).problem[0], 'invalid-argument')
  for (const to of ['', 'pat', 'pat@example', 'a@x.com, b@y.com', 'a@x.com;b@y.com', 'Pat <pat@example.com>', `${'a'.repeat(200)}@x.com`]) {
    assert.equal(refused({ to }), 'invalid-argument', to)
  }
  assert.equal(refused({ subject: '' }), 'invalid-argument')
  assert.equal(refused({ subject: '   ' }), 'invalid-argument')
  assert.equal(refused({ subject: 'Hi\nBcc: everyone@example.com' }), 'invalid-argument')
  assert.equal(refused({ subject: 'x'.repeat(201) }), 'invalid-argument')
  assert.equal(refused({ text: ' \n ' }), 'invalid-argument')
  assert.equal(refused({ text: 'x'.repeat(10_001) }), 'invalid-argument')
  assert.equal(refused({ text: 42 }), 'invalid-argument')
  assert.equal(refused({ customerId: undefined }), 'invalid-argument')
  assert.equal(refused({ leadId: 'lead1' }), 'invalid-argument') // two targets
  assert.equal(refused({ customerId: 'a/b' }), 'invalid-argument')
  assert.equal(refused({ customerId: '__x__' }), 'invalid-argument')
  assert.equal(refused({ customerId: 7 }), 'invalid-argument')
  const lead = staffEmailRequest({ ...ok, customerId: undefined, leadId: 'lead1' })
  assert.deepEqual(lead.target, { field: 'leadId', coll: 'leads', id: 'lead1' })
})

test('only addresses on the record can be emailed', () => {
  assert.deepEqual(recipientsOf(customer), ['pat.sample@example.com', 'pat2@example.com', 'old.pat@example.org'])
  assert.deepEqual(recipientsOf({ email: 'newbie@example.com' }), ['newbie@example.com'])
  assert.deepEqual(recipientsOf({}), [])
})

test('history goes to the customer when the lead or past request is linked to one', () => {
  assert.deepEqual(historyTarget({ field: 'customerId', id: 'c1' }, {}), { customerId: 'c1' })
  assert.deepEqual(historyTarget({ field: 'leadId', id: 'l1' }, {}), { leadId: 'l1' })
  assert.deepEqual(historyTarget({ field: 'leadId', id: 'l1' }, { customerId: 'c1' }), { customerId: 'c1' })
  assert.deepEqual(historyTarget({ field: 'pastRequestId', id: 'p1' }, {}), { pastRequestId: 'p1' })
  assert.deepEqual(historyTarget({ field: 'pastRequestId', id: 'p1' }, { customerId: 'c1' }), { pastRequestId: 'p1', customerId: 'c1' })
})

test('the sync recognises the Sent copy of an app email (same id and keys)', () => {
  const req = staffEmailRequest(ok)
  const messageId = '<0c4f-91AB@christmas-light-creations.com>'
  const { id, data } = historyEntry({ req, record: customer, messageId, staff: 'scott@example.com', at: '2026-10-09T20:00:00.000Z' })
  assert.match(id, /^em-[0-9a-f]{20}-pat-sample$/)
  assert.equal(data.customerId, 'pat-sample')
  assert.equal(data.direction, 'out')
  assert.equal(data.source, 'app')
  assert.equal(data.sentBy, 'scott@example.com')
  assert.equal(data.syncedAt, undefined) // the daily "sync stopped" check reads syncedAt

  // The copy Gmail keeps in info@'s Sent folder, as the Apps Script collects it.
  const sent = {
    gmailId: 'g-sent', messageId: messageId.toUpperCase(), date: '2026-10-09T20:00:02.000Z',
    from: '"Christmas Light Creations" <info@christmas-light-creations.com>', to: 'Pat.Sample@Example.com',
    subject: 'Your 2026 Christmas lights', body: `${ok.text}\r\n`,
  }
  const event = parseItem(sent)
  const dir = buildDirectory([{ id: 'pat-sample', email: customer.email }], [])
  assert.equal(docsFor(event, dir)[0].id, id)
  assert.deepEqual(appSentKeys(event), { mailId: data.mailId, mailPrint: data.mailPrint })

  // Gmail changing the Message-ID still matches on the print.
  const rewritten = appSentKeys(parseItem({ ...sent, messageId: '<other@mail.gmail.com>' }))
  assert.notEqual(rewritten.mailId, data.mailId)
  assert.equal(rewritten.mailPrint, data.mailPrint)

  // A different message, subject or recipient doesn't.
  assert.notEqual(appSentKeys(parseItem({ ...sent, body: 'Hi Pat, something else entirely.' })).mailPrint, data.mailPrint)
  assert.notEqual(appSentKeys(parseItem({ ...sent, subject: 'Install day' })).mailPrint, data.mailPrint)
  assert.notEqual(appSentKeys(parseItem({ ...sent, to: 'pat2@example.com' })).mailPrint, data.mailPrint)
})

test('only single-recipient emails from info@ get app keys', () => {
  const base = { gmailId: 'g', messageId: '<x@y>', date: '2026-10-09T20:00:00.000Z', subject: 'Hi', body: 'Hello' }
  assert.equal(appSentKeys(parseItem({ ...base, from: 'Pat <pat@example.com>', to: 'info@christmas-light-creations.com' })), null)
  assert.equal(appSentKeys(parseItem({ ...base, from: 'info@christmas-light-creations.com', to: 'a@example.com, b@example.com' })), null)
  assert.ok(appSentKeys(parseItem({ ...base, from: 'info@christmas-light-creations.com', to: 'a@example.com' })))
  assert.equal(appSentKeys({ skip: 'empty' }), null)
})

test('daily limit and one send per second per staff member', () => {
  const day = '2026-10-09'
  const first = sendAllowed(undefined, 'scott@example.com', 10_000, day)
  assert.deepEqual(first.next, { day, count: 1, last: { 'scott@example.com': 10_000 } })
  assert.equal(sendAllowed(first.next, 'scott@example.com', 10_500, day).problem[0], 'resource-exhausted')
  assert.equal(sendAllowed(first.next, 'katie@example.com', 10_500, day).next.count, 2)
  assert.equal(sendAllowed(first.next, 'scott@example.com', 11_000, day).next.count, 2)
  const full = { day, count: DAILY_LIMIT, last: {} }
  assert.match(sendAllowed(full, 'scott@example.com', 99_000, day).problem[1], /Daily limit/)
  assert.deepEqual(sendAllowed(full, 'scott@example.com', 99_000, '2026-10-10').next, { day: '2026-10-10', count: 1, last: { 'scott@example.com': 99_000 } })
  assert.equal(sendAllowed({ day, count: DAILY_LIMIT - 1, last: {} }, 'scott@example.com', 99_000, day).next.count, DAILY_LIMIT)
})
