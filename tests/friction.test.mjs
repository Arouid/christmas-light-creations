import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIT_OPTIONS, composeMessage, needsPhone } from '../src/lib/estimateForm.js'
import { SIGN_H, SIGN_W, signatureFromName } from '../src/lib/typedSignature.js'
import { CONFIRMED, WEEKS, describeRebook, rebookEmail, rebookPatch, rebookPush, rebookRequest } from '../functions/rebook.js'
import { STOCK_TEMPLATES } from '../src/lib/emailTemplates.js'

test('estimate form: chips and the note fold into one message; a call or text needs a number', () => {
  assert.equal(composeMessage(['Trees', 'Roofline', 'bogus'], '  Warm white please\r\n'), 'Light: roofline, trees\nWarm white please')
  assert.equal(composeMessage([], ''), 'No details given: please advise')
  assert.equal(composeMessage(['Roofline'], '', { gift: true }), 'Gift wrapping (no details given)', 'gift requests skip the light chips')
  assert.equal(composeMessage([], 'Twelve boxes', { gift: true }), 'Twelve boxes')
  assert.ok(LIT_OPTIONS.includes('Not sure yet'))
  assert.ok(needsPhone('Phone', '') && needsPhone('Text', ' ') && !needsPhone('Email', '') && !needsPhone('Text', '281-819-0163'))
})

test('type-to-sign: the typed name becomes a PNG data URL on a 600×200 canvas; short names are refused', () => {
  const calls = []
  const fakeCanvas = () => ({
    width: 0, height: 0,
    getContext: () => ({ clearRect() {}, fillText(...a) { calls.push(['text', ...a]) }, fillRect() {}, measureText: (t) => ({ width: t.length * 30 }), set font(v) { calls.push(['font', v]) } }),
    toDataURL: () => 'data:image/png;base64,AAAA',
  })
  assert.equal(signatureFromName('Pat  Sample', fakeCanvas), 'data:image/png;base64,AAAA')
  assert.ok(calls.some(([k, t]) => k === 'text' && t === 'Pat Sample'))
  assert.equal(signatureFromName('P', fakeCanvas), null)
  assert.equal(SIGN_W, 600); assert.equal(SIGN_H, 200)
  const fonts = calls.filter(([k]) => k === 'font').map(([, v]) => v)
  assert.ok(fonts[0].includes('64px'), 'tries the big size first')
})

test('re-book: request checks, the season patch, already-on-the-list, and what staff hear', () => {
  assert.deepEqual(rebookRequest({ week: 'Mid-November', note: '  New color:  warm white ' }), { week: 'Mid-November', note: 'New color: warm white' })
  assert.deepEqual(rebookRequest({}), { week: '', note: '' })
  assert.equal(rebookRequest({ week: 'Christmas Eve' }).error[0], 'invalid-argument')
  assert.equal(rebookRequest({ note: 5 }).error[0], 'invalid-argument')
  assert.equal(rebookRequest({ note: 'x'.repeat(400) }).note.length, 300)
  const now = new Date('2026-10-13T15:00:00Z')
  const p = rebookPatch({ installStatus: 'Not Confirmed' }, { week: 'Late October', note: 'Add the arch' }, now).patch
  assert.deepEqual(p, { installStatus: CONFIRMED, firstContact: 'Confirmed', rebookedAt: now.toISOString(), timeframe: 'Late October', customerNote: 'Add the arch' })
  assert.deepEqual(Object.keys(rebookPatch(undefined, { week: '', note: '' }, now).patch), ['installStatus', 'firstContact', 'rebookedAt'])
  for (const st of [CONFIRMED, 'Install Scheduled', 'Install Completed', 'Off Scheduler', 'Not Servicing']) assert.equal(rebookPatch({ installStatus: st }, {}, now).already, st)
  assert.ok(WEEKS.includes('Whenever works'))
  assert.equal(describeRebook({ week: 'Mid-October', note: 'Gate code 1234' }), 'wants mid-october · “Gate code 1234”')
  assert.equal(describeRebook({ week: '', note: '' }), 'no preference given')
  const push = rebookPush({ fullName: 'Pat Sample' }, 'pat-sample', { week: 'Late October', note: '' })
  assert.equal(push.title, 'Pat Sample wants their lights back up'); assert.equal(push.link, '#accounts/customer/pat-sample')
  const mail = rebookEmail({ fullName: 'Pat Sample', address: '123 Example St' }, 'pat-sample', { week: 'Late October', note: 'Add the arch' }, '2026')
  assert.equal(mail.subject, 'Re-install: Pat Sample said yes for 2026')
  assert.ok(mail.text.includes('123 Example St') && mail.text.includes('Preferred week: Late October') && mail.text.includes('Note: Add the arch') && mail.text.includes('#accounts/customer/pat-sample'))
  const invite = STOCK_TEMPLATES.find((t) => t.id === 'reinstall')
  assert.ok(invite.body.includes('Yes, put my lights back up') && invite.body.includes('{website}/account/'))
  const link = STOCK_TEMPLATES.find((t) => t.id === 'account-invite')
  assert.ok(link && link.body.includes('{website}/account/') && /Google/.test(link.body) && /Get the app/.test(link.body), 'the account-link template names the link, Google sign-in and the app')
})

test('rebook weeks: only the ones still ahead in the fall, all of them before July, never none (owner 2026-10-14)', async () => {
  const { openWeeks } = await import('../functions/rebook.js')
  const d = (s) => new Date(`${s}T12:00:00`)
  assert.deepEqual(openWeeks(d('2026-08-01')), WEEKS)
  assert.deepEqual(openWeeks(d('2026-10-20')), WEEKS)
  assert.ok(!openWeeks(d('2026-10-21')).includes('Mid-October'))
  assert.deepEqual(openWeeks(d('2026-11-08')), ['Mid-November', 'Late November', 'Whenever works'])
  assert.deepEqual(openWeeks(d('2026-12-10')), ['Whenever works'])
  assert.deepEqual(openWeeks(d('2027-03-01')), WEEKS)
})
