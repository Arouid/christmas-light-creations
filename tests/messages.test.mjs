import { test } from 'node:test'
import assert from 'node:assert/strict'
import { e164, voiceUrl, gmailUrl, textMessages, PLACEHOLDERS, setSender } from '../src/lib/messages.js'
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
  assert.match(textMessages.account({ firstName: 'Pat' }), /^Hi Pat, Christmas Light Creations here\. Your account: https:\/\/christmas-light-creations\.com\/account\//)
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

test('{me}: the sender signs the email; unknown sender leaves no hole (owner 2026-10-13)', () => {
  const c = { firstName: 'Pat' }
  setSender('Katie P.')
  assert.equal(fillTemplate('Hi {first},\n\nThank you,\n{me}\n{business}', c, 2026), 'Hi Pat,\n\nThank you,\nKatie\nChristmas Light Creations')
  setSender('Katie P.', 'Customer care')
  assert.equal(fillTemplate('Thank you,\n{me}{myTitle}\n{business}', c, 2026), 'Thank you,\nKatie, Customer care\nChristmas Light Creations', 'the title follows the name')
  assert.equal(fillTemplate('{me}{myTitle}', c, 2026, { me: 'Lacie', myTitle: 'Co-owner' }), 'Lacie, Co-owner')
  assert.equal(fillTemplate('{me}{myTitle}', c, 2026, { me: '', myTitle: 'Co-owner' }), '', 'no name, no title')
  setSender('')
  assert.equal(fillTemplate('Hi {first},\n\nThank you,\n{me}\n{business}', c, 2026), 'Hi Pat,\n\nThank you,\nChristmas Light Creations', 'the blank line is dropped')
  assert.equal(fillTemplate('Signed, {me}.', c, 2026, { me: 'Lacie' }), 'Signed, Lacie.', 'extra.me wins')
  assert.ok(PLACEHOLDERS.find((p) => p.key === 'me').optional)
  const done = STOCK_TEMPLATES.find((t) => t.id === 'install-done')
  assert.ok(done.body.endsWith('Thank you,\n{me}{myTitle}\n{business}\n{businessPhone}'), 'the stock sign-off carries the sender and the title')
})

import { earlyOffer } from '../src/lib/messages.js'

test('{earlyOffer}: the 10% line through Oct 31 only, then the line is gone (win-back templates)', () => {
  assert.equal(earlyOffer(new Date(2026, 9, 31)), 'Installs done by October 31st get 10% off, and October dates go first.')
  assert.equal(earlyOffer(new Date(2026, 9, 15), true), ' Installs done by Oct 31 get 10% off.')
  assert.equal(earlyOffer(new Date(2026, 10, 1)), '')
  assert.equal(earlyOffer(new Date(2026, 11, 20), true), '')
  const t = 'Free estimate.\n{earlyOffer}\n\nReply here.'
  assert.equal(fillTemplate(t, {}, '2026', { today: new Date(2026, 9, 20) }), 'Free estimate.\nInstalls done by October 31st get 10% off, and October dates go first.\n\nReply here.')
  assert.equal(fillTemplate(t, {}, '2026', { today: new Date(2026, 10, 2) }), 'Free estimate.\n\nReply here.', 'after Oct 31 the line is dropped')
  assert.deepEqual(missingPlaceholders(t, {}, '2026'), [], 'never reported as missing')
  // The season's win-back: the offer only through {earlyOffer}, the designer, a way to say no, the follow-up says it's the last.
  for (const id of ['winback', 'comeback', 'winback-older', 'winback-last']) {
    const w = STOCK_TEMPLATES.find((x) => x.id === id)
    assert.match(w.body, /\n\{earlyOffer\}\n/, `${id}: the offer on its own line`)
    assert.doesNotMatch(w.body, /October 31|10%/, `${id}: no hard-coded offer`)
    assert.doesNotMatch(w.body, /—/, `${id}: no em dash`)
  }
  for (const id of ['winback', 'comeback', 'winback-older']) {
    const w = STOCK_TEMPLATES.find((x) => x.id === id).body
    assert.match(w, /\{website\}\/design\//, `${id}: the free designer`)
    assert.match(w, /no thanks.*won't email you again/, `${id}: an easy no`)
  }
  assert.match(STOCK_TEMPLATES.find((x) => x.id === 'comeback').body, /\{website\}\/account\/.*one tap/s)
  assert.match(STOCK_TEMPLATES.find((x) => x.id === 'winback-last').body, /last email/)
})

import { RECENT_YEARS, winbackTemplate } from '../src/lib/emailTemplates.js'

test('win-back: each person starts on their group’s email (former customers, recent, older)', () => {
  assert.equal(RECENT_YEARS, 5)
  assert.equal(winbackTemplate({ payments: [{ amount: 400 }], year: '2015' }, '2026'), 'comeback')
  assert.equal(winbackTemplate({ year: '2026' }, '2026'), 'winback')
  assert.equal(winbackTemplate({ year: '2021' }, '2026'), 'winback', '2021–2026 are recent')
  assert.equal(winbackTemplate({ year: '2020' }, '2026'), 'winback-older')
  assert.equal(winbackTemplate({}, '2026'), 'winback-older', 'no year: treated as old')
  assert.ok(['comeback', 'winback', 'winback-older', 'winback-last'].every((id) => STOCK_TEMPLATES.some((t) => t.id === id)))
})
