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
