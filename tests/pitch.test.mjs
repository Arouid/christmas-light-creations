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

test('the second one through (2026-10-13): a freelance writer from Philadelphia with a Calendly link', () => {
  const msg = 'Hey! Do you have any use for a freelance writer? I have nearly a decade of experience and can help with pretty much any type of content, including blog posts, case studies, press releases, thought leadership, articles, and much more. I’m currently looking for new opportunities and would love to see if you have any writing projects I could help with. You can book a time with me to chat if interested. Hoping to connect! https://calendly.com/example/30min'
  const r = pitchReason({ message: msg, city: 'Philadelphia', zip: '19102' })
  assert.match(r, /^Looks like a sales pitch: offers freelance work, asks to book a call/)
  assert.match(pitchReason({ message: msg, zip: '' }), /sales pitch/, 'files on the words alone too')
  // The ZIP alone never files anyone: a customer who typed 77581 wrong is still a customer.
  assert.equal(pitchReason({ message: 'Light: roofline, trees', zip: '19102' }), '')
  assert.equal(pitchReason({ message: 'I have 10 years of experience with your company, same as last year please. Gate code 4321.', zip: '77581' }), '')
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
