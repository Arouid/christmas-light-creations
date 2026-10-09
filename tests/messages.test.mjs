import { test } from 'node:test'
import assert from 'node:assert/strict'
import { e164, voiceUrl, gmailUrl, textMessages, PLACEHOLDERS } from '../src/lib/messages.js'
import { STOCK_TEMPLATES, TEMPLATE_GROUPS, mergeTemplates } from '../src/lib/emailTemplates.js'

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

test('stock email templates: valid placeholders, known groups, unique ids', () => {
  const keys = new Set(PLACEHOLDERS.map((p) => p.key))
  const ids = new Set()
  for (const t of STOCK_TEMPLATES) {
    assert.ok(!ids.has(t.id), `duplicate id ${t.id}`)
    ids.add(t.id)
    assert.ok(TEMPLATE_GROUPS.includes(t.group), `${t.id}: unknown group`)
    assert.match(t.body, /^Hi \{first\},/, `${t.id}: greets by first name`)
    for (const [, k] of `${t.subject} ${t.body}`.matchAll(/\{(\w+)\}/g)) assert.ok(keys.has(k), `${t.id}: unknown {${k}}`)
  }
  for (const id of ['reinstall', 'schedule', 'review', 'custom']) assert.ok(ids.has(id), `keeps ${id} (emailsSent history)`)
  assert.match(STOCK_TEMPLATES.find((t) => t.id === 'review').body, /\{reviewLink\}/)
  assert.match(textMessages.review({}), /^Hi there,/)
})

test('staff edits replace stock templates; added ones come last', () => {
  const merged = mergeTemplates([{ id: 'review', label: 'Ask for a review' }, { id: 'x1', label: 'Ours', subject: 's', body: 'b' }])
  assert.equal(merged.find((t) => t.id === 'review').label, 'Ask for a review')
  assert.ok(merged.find((t) => t.id === 'review').edited)
  assert.match(merged.find((t) => t.id === 'review').body, /\{reviewLink\}/, 'unedited fields keep stock text')
  assert.deepEqual(merged.at(-1), { group: 'Our templates', id: 'x1', label: 'Ours', subject: 's', body: 'b', custom: true })
  assert.equal(mergeTemplates().length, STOCK_TEMPLATES.length)
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
