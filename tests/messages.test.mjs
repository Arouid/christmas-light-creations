import { test } from 'node:test'
import assert from 'node:assert/strict'
import { e164, voiceUrl, gmailUrl, TEMPLATES, textMessages } from '../src/lib/messages.js'

test('phone numbers become +1 format for Google Voice', () => {
  assert.equal(e164('(281) 819-0163'), '+12818190163')
  assert.equal(e164('1-281-819-0163'), '+12818190163')
  assert.equal(e164(''), '')
  assert.equal(voiceUrl('281-819-0163'), 'https://voice.google.com/u/0/messages?itemId=t.%2B12818190163')
  assert.equal(voiceUrl('2818190163', 'biz@example.com'), 'https://voice.google.com/u/biz%40example.com/messages?itemId=t.%2B12818190163')
})

test('Gmail compose opens from the business account with fields filled', () => {
  const u = new URL(gmailUrl({ bcc: 'a@x.com,b@y.com', subject: 'Hi', body: 'Line 1\nLine 2' }))
  assert.equal(u.pathname, '/mail/u/info@christmas-light-creations.com/')
  assert.equal(u.searchParams.get('bcc'), 'a@x.com,b@y.com')
  assert.equal(u.searchParams.get('body'), 'Line 1\nLine 2')
})

test('templates greet by first name and include the review link where needed', () => {
  const c = { firstName: 'Pat' }
  assert.match(TEMPLATES.reinstall.body(c, '2026'), /^Hi Pat,/)
  assert.match(TEMPLATES.review.body(c), /g\.page\/r\//)
  assert.match(textMessages.review({}), /^Hi there,/)
})

import { fillTemplate, missingPlaceholders } from '../src/lib/messages.js'

test('placeholders fill per customer; first name falls back to "there"', () => {
  const c = { firstName: 'Pat', city: 'Pearland', gateCode: '1234', seasons: { 2026: { plannedDate: 'Nov 20', install: { total: '$414.00' } } } }
  const t = 'Hi {first}, see you {date} in {city}. Gate {gate}. Total {total}. {business} {businessPhone}'
  assert.equal(fillTemplate(t, c, '2026'), 'Hi Pat, see you Nov 20 in Pearland. Gate 1234. Total $414.00. Christmas Light Creations 281-819-0163')
  assert.equal(fillTemplate('Hi {first}', {}, '2026'), 'Hi there')
  assert.equal(fillTemplate('{unknown} stays', c, '2026'), '{unknown} stays')
})

test('missing values are reported so nobody gets an email with a blank in it', () => {
  assert.deepEqual(missingPlaceholders('Hi {first}, gate {gate}, date {date}', { firstName: 'Pat' }, '2026'), ['Gate code', 'Planned date'])
  assert.deepEqual(missingPlaceholders('Hi {first}', {}, '2026'), [])
})
