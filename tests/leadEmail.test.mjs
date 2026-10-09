import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alertRecipients, leadEmail } from '../functions/leadEmail.js'

const lead = {
  firstName: 'Pat', lastName: 'Sample', email: 'pat@example.com', phone: '(281) 555-0199',
  address: '123 Example St', city: 'Pearland', zip: '77581', contactMethod: 'Text',
  source: 'Road sign (Broadway 288)', message: 'Roofline and two trees <please>',
}

test('subject shows who, where and which sign (what the phone notification shows)', () => {
  assert.equal(leadEmail(lead).subject, 'New estimate: Pat Sample, Pearland (Road sign (Broadway 288))')
  assert.equal(leadEmail({ firstName: 'Jo' }).subject, 'New estimate: Jo')
})

test('body has tap-to-call, map link, message, and is HTML-safe', () => {
  const m = leadEmail(lead)
  assert.match(m.html, /href="tel:2815550199"/)
  assert.match(m.html, /google\.com\/maps\/search/)
  assert.match(m.html, /&lt;please&gt;/)
  assert.doesNotMatch(m.html, /<please>/)
  assert.match(m.text, /Message:\nRoofline and two trees <please>/)
  assert.equal(m.replyTo, 'pat@example.com')
})

test('recipients come from settings, cleaned and de-duplicated', () => {
  assert.deepEqual(alertRecipients({ alertEmails: [' A@x.com', 'a@x.com', 'bad', 'b@y.org'] }), ['a@x.com', 'b@y.org'])
  assert.deepEqual(alertRecipients(undefined), [])
})
