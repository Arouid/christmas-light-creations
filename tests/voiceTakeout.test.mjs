import { test } from 'node:test'
import assert from 'node:assert/strict'
import { voiceId } from '../functions/messageSync.js'
import { dropEmailCopies, durationOf, htmlText, namesToPhones, oldEmailText, parseTakeoutHtml, parseVoiceEmail } from '../scripts/old-site/voiceTakeout.mjs'
import { matchMessages, phonesOf, unmatchedCsv } from '../src/lib/messageImport.js'

// Hand-written samples in the shapes of Google Takeout (no real data).
const conversation = `<body><div class="hChatLog hfeed">
<div class="message"><abbr class="dt" title="2026-09-27T19:07:37.975-05:00">Sep 27</abbr>:
<cite class="sender vcard"><a class="tel" href="tel:+12818190163"><abbr class="fn" title="">Me</abbr></a></cite>:
<q>Hi Pat! You&#39;re on week 1.<br><br>Thank you</q>
<div><img src="x" alt="Image MMS Attachment" /></div></div> <div class="message"><abbr class="dt" title="2026-09-27T19:25:11.233-05:00">Sep 27</abbr>:
<cite class="sender vcard"><a class="tel" href="tel:+15550100101"><span class="fn">Pat Sample</span></a></cite>:
<q>Great &amp; thanks</q>
</div></div></body>`

const call = (label, extra = '') => `<body><div class="haudio"><div class="contributor vcard">${label} call from
<a class="tel" href="tel:+15550100102"><span class="fn">Sam</span></a></div>
<abbr class="published" title="2026-09-28T18:13:27.862-05:00">Sep 28</abbr>${extra}
<abbr class="duration" title="PT1M5S">(00:01:05)</abbr></div></body>`

test('Takeout text conversation: both directions, UTC times, ids from voiceId', () => {
  const { entries } = parseTakeoutHtml('Takeout/Voice/Calls/Pat Sample - Text - 2026-09-28T00_07_37Z.html', conversation)
  assert.equal(entries.length, 2)
  const [out, inn] = entries
  assert.deepEqual(out.data, { source: 'takeout', kind: 'text', direction: 'out', at: '2026-09-28T00:07:37.975Z', phone: '+15550100101', text: "Hi Pat! You're on week 1.\n\nThank you" })
  assert.equal(inn.data.direction, 'in')
  assert.equal(inn.data.text, 'Great & thanks')
  assert.equal(inn.id, voiceId({ kind: 'text', phone: '+15550100101', at: inn.data.at, text: 'Great & thanks' }))
})

test('Takeout: only our own texts, filed under a name -> number from other files', () => {
  const mine = conversation.replace(/<div class="message">(?:(?!<div class="message">)[\s\S])*Pat Sample[\s\S]*?<\/div>/, '')
  assert.equal(parseTakeoutHtml('Pat Sample - Text - 2026-09-28T00_07_37Z.html', mine).skipped, 'no-number')
  const names = namesToPhones([conversation])
  assert.equal(names.get('Pat Sample'), '+15550100101')
  const { entries } = parseTakeoutHtml('Pat Sample - Text - 2026-09-28T00_07_37Z.html', mine, (n) => names.get(n))
  assert.equal(entries[0].data.phone, '+15550100101')
})

test('Takeout calls: kind, direction, duration; voicemail transcript; groups skipped', () => {
  assert.deepEqual(parseTakeoutHtml('Sam - Received - 2026-09-28T23_13_27Z.html', call('Received')).entries[0].data,
    { source: 'takeout', kind: 'call', direction: 'in', at: '2026-09-28T23:13:27.862Z', phone: '+15550100102', duration: '1:05' })
  assert.equal(parseTakeoutHtml('Sam - Placed - x.html', call('Placed')).entries[0].data.direction, 'out')
  const missed = parseTakeoutHtml('Sam - Missed - x.html', call('Missed')).entries[0].data
  assert.equal(missed.kind, 'missed')
  assert.equal(missed.duration, undefined)
  const vm = parseTakeoutHtml('Sam - Voicemail - x.html', call('Voicemail', 'Transcript:\n<span class="description"><span class="full-text">Call me back</span>')).entries[0].data
  assert.equal(vm.text, 'Call me back')
  assert.equal(parseTakeoutHtml('Group - Text - x.html', '<div class="participants"></div>').skipped, 'group-text')
})

test('helpers: duration, html text', () => {
  assert.equal(durationOf('PT3S'), '0:03')
  assert.equal(durationOf('PT1H2M3S'), '1:02:03')
  assert.equal(htmlText('a<br>b &#8239;&quot;c&quot;'), 'a\nb  "c"')
})

const rawEmail = (from, subject, body, extra = '') => `From: ${from}
Subject: ${subject}
Date: Sun, 27 Dec 2015 19:09:16 +0000
Content-Type: text/plain; charset=UTF-8; format=flowed; delsp=yes${extra ? `\n${extra}` : ''}

${body}`

test('old Voice text email: the old business number (0288) is not the customer', () => {
  const e = parseVoiceEmail(rawEmail('"(555) 010-0101" <12818190288.15550100101.X6m@txt.voice.google.com>', 'SMS from (555) 010-0101',
    'How much?\n\n--\nSent using SMS-to-email. Reply to this email to text the sender back and save on SMS fees.'))
  assert.equal(e.data.phone, '+15550100101')
  assert.equal(e.data.text, 'How much?')
  assert.equal(e.data.source, 'voice-email')
  assert.equal(e.id, voiceId({ kind: 'text', phone: '+15550100101', at: '2015-12-27T19:09:16.000Z', text: 'How much?' }))
})

test('old Voice emails: quoted-printable voicemail, boilerplate removed', () => {
  const e = parseVoiceEmail(rawEmail('Google Voice <voice-noreply@google.com>', 'New voicemail from (555) 010-0102 at 3:15 PM',
    'Transcript: Hi this is Sam, call me =\nback please\nPlay message: https://www.google.com/voice/fm/1',
    'Content-Transfer-Encoding: quoted-printable').replace('format=flowed; delsp=yes', ''))
  assert.equal(e.data.kind, 'voicemail')
  assert.equal(e.data.phone, '+15550100102')
  assert.equal(e.data.text, 'Hi this is Sam, call me back please')
  assert.equal(oldEmailText('MMS Received'), '📷 Photo')
  assert.equal(oldEmailText('Transcript: Unable to transcribe this message.'), '')
})

test('email copies of Takeout entries are dropped', () => {
  const t = { id: 't', data: { source: 'takeout', kind: 'missed', phone: '+15550100101', at: '2024-01-01T10:00:30.000Z' } }
  const copy = { id: 'e1', data: { source: 'voice-email', kind: 'missed', phone: '+15550100101', at: '2024-01-01T10:01:00.000Z' } }
  const other = { id: 'e2', data: { source: 'voice-email', kind: 'missed', phone: '+15550100101', at: '2024-01-01T11:00:00.000Z' } }
  assert.deepEqual(dropEmailCopies([t, copy, other]).map((e) => e.id), ['t', 'e2'])
})

test('import: matched by phone to customers; the rest listed by number', () => {
  const customers = [{ id: 'pat', phone: '(555) 010-0101 / 555.010.0109' }, { id: 'old' }]
  const list = [
    { id: 'a', data: { phone: '+15550100109', kind: 'text', direction: 'in', at: '2020-01-01T00:00:00Z', text: 'hi' } },
    { id: 'b', data: { phone: '+15550100102', kind: 'text', direction: 'in', at: '2021-01-01T00:00:00Z', text: 'who, "me"?' } },
    { id: 'c', data: { phone: '+15550100102', kind: 'missed', direction: 'in', at: '2019-01-01T00:00:00Z' } },
    { id: 'd', data: { customerId: 'old', kind: 'call', direction: 'out', at: '2018-01-01T00:00:00Z' } },
    { id: 'e', data: { customerId: 'gone', kind: 'call', direction: 'out', at: '2018-01-01T00:00:00Z' } },
  ]
  const r = matchMessages(list, customers)
  assert.deepEqual(r.records.map((x) => [x.id, x.data.customerId]), [['a', 'pat'], ['d', 'old']])
  assert.equal(r.customers, 2)
  assert.deepEqual(r.unmatched, [{ phone: '+15550100102', entries: 2, first: '2019-01-01T00:00:00Z', last: '2021-01-01T00:00:00Z', sample: 'who, "me"?' }])
  assert.equal(unmatchedCsv(r.unmatched), 'Phone,Entries,First,Last,Sample text\r\n+15550100102,2,2019-01-01,2021-01-01,"who, ""me""?"')
  assert.deepEqual(phonesOf('281-555-0101 / +1 (832) 555 0102'), ['+12815550101', '+18325550102'])
})
