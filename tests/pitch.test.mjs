import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REASON_MAX, pitchFilterOn, pitchReason } from '../functions/pitch.js'

// The 2026-10-13 pitch, names changed.
const JANPRO = 'Hi,\n\nI work in Webster, and help many local companies. I was hoping I could come by and offer a complimentary cleaning bid?\n\nThank you in advance for your response.\n\nAll the best,\n\nRick Example\nVP, General Manager\nJan-Pro of Houston\nrick@example.com\n\nRespond with stop to optout'

test('a cold pitch through the form is filed with a one-line reason', () => {
  const r = pitchReason({ message: JANPRO })
  assert.match(r, /^Looks like a sales pitch: an opt-out line, sells a service to businesses/)
  assert.ok(r.length <= REASON_MAX)
  // Aimed at light installers: the word "light" doesn't protect it.
  assert.match(pitchReason({ message: 'We help christmas light installers get more leads with SEO and a free website audit. Reply STOP to opt out.' }), /sales pitch/)
  // No opt-out line, but four tells and nothing a customer would say.
  assert.match(pitchReason({ message: 'Our marketing agency offers a free consultation. We help small businesses grow.\nJo, Account Executive' }), /sales pitch: sells a service to businesses, offers a free bid/)
})

test('real requests are never filed: the chips, a free-estimate ask, a manager wanting lights, one tell alone', () => {
  for (const message of [
    'Light: roofline, trees\nWarm white please',
    'I’d like a free estimate for my roofline and two trees. Gate code 1234.',
    'Hi, I’m the General Manager at Park Ten Offices. We’d like lights on our building this year, please send a free quote.',
    'Please unsubscribe me from your emails',
    'We run a cleaning company and want lights on our office. Call me.',
    'No details given: please advise',
    '',
  ]) assert.equal(pitchReason({ message }), '', message)
  assert.equal(pitchReason({}), '')
})

test('the switch: on unless settings say pitchFilter false', () => {
  assert.ok(pitchFilterOn({}) && pitchFilterOn(undefined) && pitchFilterOn({ pitchFilter: true }))
  assert.equal(pitchFilterOn({ pitchFilter: false }), false)
})
