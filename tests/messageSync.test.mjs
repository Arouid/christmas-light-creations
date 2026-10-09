import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addressesOf, badBatch, buildDirectory, docsFor, dryRunSummary, parseItem, phonesOf, voiceId } from '../functions/messageSync.js'

// Hand-written samples in the shapes Google Voice and Gmail use (no real data).
const DATE = '2026-11-18T17:12:40.000Z'
const voiceText = {
  gmailId: 'g1', messageId: '<v1@txt.voice.google.com>', date: DATE,
  from: '"(555) 010-0101" <12818190163.15550100101.Xy7Abc_dE@txt.voice.google.com>',
  to: 'clc.voicemail.01@gmail.com', subject: 'New text message from (555) 010-0101',
  body: `<https://voice.google.com>
Thursday works, gate code is the same as last year.

YOUR ACCOUNT <https://voice.google.com> HELP CENTER <https://support.google.com/voice#topic=1707989>
To respond to this text message, reply to this email or visit Google Voice <https://voice.google.com>.
Google LLC 1600 Amphitheatre Pkwy Mountain View CA 94043 USA`,
}
const voicemail = {
  gmailId: 'g2', messageId: '<v2@google.com>', date: DATE, from: 'Google Voice <voice-noreply@google.com>',
  subject: 'New voicemail from (555) 010-0142 at 7:40 PM',
  body: `Voicemail from: (555) 010-0142 at 7:40 PM
Hey, the left side of the garage went out tonight. Can someone come look?
Play message <https://voice.google.com/voicemail/xyz>
YOUR ACCOUNT HELP CENTER HELP FORUM
This email was sent to you because you indicated that you'd like to receive voicemails via email.`,
}
const missed = { gmailId: 'g3', messageId: '<v3@google.com>', date: DATE, from: 'Google Voice <voice-noreply@google.com>',
  subject: 'New missed call from (555) 010-0177 at 9:02 AM', body: 'Missed call from (555) 010-0177\nYOUR ACCOUNT' }
const named = { ...voicemail, gmailId: 'g4', subject: 'New voicemail from Pat Sample at 7:40 PM', body: 'Please call me back.\nPlay message' }
const customerEmail = {
  gmailId: 'g5', messageId: '<CAB123@mail.gmail.com>', date: DATE, from: 'Pat Sample <Pat.Sample@Example.com>',
  to: 'info@christmas-light-creations.com', subject: 'Re: Your 2026 install',
  body: `Thursday evening is perfect, thanks!

On Tue, Nov 18, 2026 at 9:15 AM Christmas Light Creations <
info@christmas-light-creations.com> wrote:

> Hi Pat, can we install Thursday?
> Thanks`,
}
const sentEmail = { gmailId: 'g6', messageId: '<OUT9@mail.gmail.com>', date: DATE, from: '"Christmas Light Creations" <info@christmas-light-creations.com>',
  to: 'pat.sample@example.com', cc: 'info@christmas-light-creations.com', bcc: 'jordan@example.com, nobody@example.org', subject: 'Install day', body: 'See you Thursday.' }

const customers = [
  { id: 'sample-customer', phone: '555-010-0101 / (555) 010-0199', email: 'Pat.Sample@example.com' },
  { id: 'example-family', phone: '(555) 010-0142', email: 'jordan@example.com, j2@example.com' },
  { id: 'shared-phone', phone: '5550100142' },
]
const leads = [
  { id: 'lead1', phone: '555.010.0177', email: 'newbie@example.com' },
  { id: 'lead2', phone: '555 010 0188', email: 'converted@example.com', customerId: 'example-family' },
]
const dir = buildDirectory(customers, leads)

test('phone and address helpers', () => {
  assert.deepEqual(phonesOf('281-555-0101 / (832) 555 0102, +1 713.555.0103'), ['+12815550101', '+18325550102', '+17135550103'])
  assert.deepEqual(phonesOf(''), [])
  assert.deepEqual(addressesOf('"Pat" <Pat@Example.com>, b@x.co'), ['pat@example.com', 'b@x.co'])
})

test('Voice text: number from the sender address, footer and links removed', () => {
  const e = parseItem(voiceText)
  assert.equal(e.kind, 'text')
  assert.equal(e.direction, 'in')
  assert.equal(e.phone, '+15550100101')
  assert.equal(e.text, 'Thursday works, gate code is the same as last year.')
  assert.equal(e.at, DATE)
  assert.match(e.id, /^gv-[0-9a-f]{20}$/)
})

test('Voicemail keeps only the transcript; missed call has no text', () => {
  const v = parseItem(voicemail)
  assert.equal(v.kind, 'voicemail')
  assert.equal(v.phone, '+15550100142')
  assert.equal(v.text, 'Hey, the left side of the garage went out tonight. Can someone come look?')
  const m = parseItem(missed)
  assert.equal(m.kind, 'missed')
  assert.equal(m.phone, '+15550100177')
  assert.equal(m.text, '')
})

test('Voice showing a contact name instead of a number: kept as name, unmatched', () => {
  const e = parseItem(named)
  assert.equal(e.phone, '')
  assert.equal(e.name, 'Pat Sample')
  assert.deepEqual(docsFor(e, dir).map((d) => d.data.unmatched), [true])
})

test('group texts, other Voice mail and our own number are not customers', () => {
  assert.deepEqual(parseItem({ ...voiceText, subject: 'New group message' }), { skip: 'group-text' })
  assert.deepEqual(parseItem({ ...voicemail, subject: 'Your Google Voice number' }), { skip: 'voice-other' })
  const flipped = parseItem({ ...voiceText, from: '15550100101.12818190163.abc@txt.voice.google.com' })
  assert.equal(flipped.phone, '+15550100101')
  assert.deepEqual(parseItem({ ...voiceText, date: 'not a date' }), { skip: 'no-date' })
})

test('customer email in: quoted thread cut, sender is the counterpart', () => {
  const e = parseItem(customerEmail)
  assert.equal(e.kind, 'email')
  assert.equal(e.direction, 'in')
  assert.equal(e.text, 'Thursday evening is perfect, thanks!')
  assert.deepEqual(e.emails, ['pat.sample@example.com'])
  assert.equal(e.subject, 'Re: Your 2026 install')
})

test('email from info@ is out; To/Cc/Bcc customers each get it, others dropped', () => {
  const e = parseItem(sentEmail)
  assert.equal(e.direction, 'out')
  const docs = docsFor(e, dir)
  assert.deepEqual(docs.map((d) => [d.data.customerId, d.data.email]), [['sample-customer', 'pat.sample@example.com'], ['example-family', 'jordan@example.com']])
  assert.ok(docs.every((d) => d.id.startsWith(e.idBase)))
  assert.equal(new Set(docs.map((d) => d.id)).size, 2)
})

test('sign-in link emails, internal mail and Voice notices are never stored as customer emails', () => {
  assert.deepEqual(parseItem({ ...sentEmail, subject: 'Your Christmas Light Creations sign-in link' }), { skip: 'automatic' })
  assert.deepEqual(parseItem({ ...sentEmail, to: 'info@christmas-light-creations.com', cc: '', bcc: '' }), { skip: 'internal' })
  assert.equal(parseItem(voiceText).source, 'voice-email')
})

test('matching: customers first, converted lead goes to its customer, unknown email dropped', () => {
  const text = docsFor(parseItem(voiceText), dir)
  assert.equal(text[0].data.customerId, 'sample-customer')
  assert.equal(text[0].data.unmatched, undefined)
  const vm = docsFor(parseItem(voicemail), dir)[0].data
  assert.equal(vm.customerId, 'example-family')
  assert.deepEqual(vm.alsoMatches, ['shared-phone'])
  assert.equal(docsFor(parseItem(missed), dir)[0].data.leadId, 'lead1')
  const conv = docsFor(parseItem({ ...customerEmail, from: 'converted@example.com' }), dir)
  assert.equal(conv[0].data.customerId, 'example-family')
  assert.deepEqual(docsFor(parseItem({ ...customerEmail, from: 'vendor@example.org' }), dir), [])
  const unknown = docsFor(parseItem({ ...voiceText, from: '12818190163.15550109999.a@txt.voice.google.com' }), dir)
  assert.equal(unknown[0].data.unmatched, true)
  assert.equal(unknown[0].data.phone, '+15550109999')
})

test('ids: same event same id; text, time or kind change it', () => {
  const a = parseItem(voiceText)
  assert.equal(parseItem({ ...voiceText, gmailId: 'other' }).id, a.id)
  assert.equal(voiceId({ kind: 'text', phone: a.phone, at: '2026-11-18T17:12:59Z', text: a.text }), a.id, 'same minute')
  assert.notEqual(parseItem({ ...voiceText, body: 'Something else' }).id, a.id)
  assert.notEqual(parseItem({ ...voiceText, date: '2026-11-18T17:14:00Z' }).id, a.id)
  assert.equal(parseItem({ ...customerEmail, gmailId: 'zz' }).idBase, parseItem(customerEmail).idBase)
  assert.equal(parseItem({ ...customerEmail, messageId: '<CAB123@MAIL.GMAIL.COM>' }).idBase, parseItem(customerEmail).idBase)
})

test('long bodies are capped; batches are checked', () => {
  assert.ok(parseItem({ ...customerEmail, body: 'x'.repeat(10000) }).text.length <= 4000)
  assert.equal(badBatch({ items: [] }), '')
  assert.match(badBatch({}), /list/)
  assert.match(badBatch({ items: Array(51).fill({}) }), /50/)
  assert.deepEqual(parseItem(null), { skip: 'bad-item' })
})

test('dry run shows kind and match but no text or full number', () => {
  const e = parseItem(voiceText)
  const s = dryRunSummary(e, docsFor(e, dir))
  assert.deepEqual(s, { status: 'would-save', kind: 'text', direction: 'in', match: 'customer', chars: e.text.length, last4: '0101' })
  assert.ok(!JSON.stringify(s).includes('gate code'))
  assert.deepEqual(dryRunSummary({ skip: 'group-text' }, []), { status: 'skipped', reason: 'group-text' })
})
