import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  ASK_AFTER_DAYS, ASK_SCHEDULE, MAX_PER_RUN, REMIND_AFTER_DAYS, REVIEW_LINE, accountReview, askEmail, askRecord, askText, channelFor, replied, reminderEmail,
  reviewAsksOn, reviewPlan, reviewSeasonOf, reviewShort, reviewStats, reviewTextItems, reviewWords, seasonOf,
} from '../functions/reviewAsk.js'
import { ACCOUNT_URL, LOGO_URL, OPT_OUT_LINE, REVIEW_URL } from '../functions/brand.js'
import { KIND_WORD, isAlert } from '../functions/staffPush.js'
import { needsSomeone, recentIncoming } from '../functions/nudge.js'
import { ACTIONS, describe } from '../src/lib/activity.js'
import { CONTACT_METHODS, leadToCustomer } from '../src/lib/customers.js'
import { LATER_DAYS, laterValue, reviewCardOff } from '../src/account/reviewCard.js'
import { accountReviewCard } from '../src/data/content.js'
import { business } from '../src/data/content.js'
import { textMessages } from '../src/lib/messages.js'
import { STOCK_TEMPLATES } from '../src/lib/emailTemplates.js'
import { TASKS, TOUR, WHATS_NEW } from '../src/leads/guide.js'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-10-20T21:00:00Z') // 4 pm Central
const season = '2026'
const done = (extra = {}) => ({ installStatus: 'Install Completed', ...extra })
const cust = (id, fields = {}) => ({ id, fullName: `${id} Family`, email: `${id}@example.com`, phone: '281-555-0101', seasons: { [season]: done() }, ...fields })

test('the season: July–December is that year, January–June the one before; the switch is on unless false', () => {
  assert.equal(seasonOf('2026-10-20'), '2026')
  assert.equal(seasonOf('2027-01-12'), '2026')
  assert.equal(seasonOf('2027-07-01'), '2027')
  assert.ok(reviewAsksOn({}) && reviewAsksOn({ reviewAsks: true }) && !reviewAsksOn({ reviewAsks: false }))
  assert.equal(ASK_SCHEDULE, '0 16 * * *')
  assert.equal(ASK_AFTER_DAYS, 2)
  assert.equal(REMIND_AFTER_DAYS, 4)
})

test('channel: email first (bounced skipped), a text queued for people who prefer texts or have no email, nothing when unreachable', () => {
  assert.deepEqual(channelFor(cust('a')), { email: 'a@example.com', phone: '281-555-0101', channel: 'email' })
  assert.equal(channelFor(cust('a', { contactMethod: 'Text' })).channel, 'email+text')
  assert.equal(channelFor(cust('a', { email: '' })).channel, 'text')
  assert.equal(channelFor(cust('a', { email: '', textOptOut: 'Yes' })).channel, null, 'replied STOP and no email')
  assert.equal(channelFor(cust('a', { contactMethod: 'Text', textOptOut: 'Yes' })).channel, 'email', 'STOP: email only')
  assert.equal(channelFor(cust('a', { email: '', phone: '555-0101' })).channel, null, 'not a real number')
  assert.deepEqual(channelFor(cust('a', { email: 'bad@example.com', otherEmails: ['Good@Example.com'], bouncedEmails: { 'bad@example.com': { at: 1 } } })).email, 'good@example.com')
  assert.equal(channelFor(cust('a', { email: 'bad@example.com', bouncedEmails: { 'bad@example.com': { at: 1 } }, phone: '' })).channel, null)
  assert.equal(channelFor({}).channel, null)
})

test('who is due: first sight starts the clock, the ask comes 2 days later, nothing before, at most MAX_PER_RUN', () => {
  const fresh = cust('fresh')
  const early = cust('early', { seasons: { [season]: done({ reviewAsk: { seenAt: now - DAY } }) } })
  const due = cust('due', { seasons: { [season]: done({ reviewAsk: { seenAt: now - 2 * DAY } }) } })
  const texter = cust('texter', { email: '', seasons: { [season]: done({ reviewAsk: { seenAt: now - 3 * DAY } }) } })
  const notDone = cust('scheduled', { seasons: { [season]: { installStatus: 'Install Scheduled' } } })
  const lastYear = cust('old', { seasons: { 2025: done() } })
  const plan = reviewPlan([fresh, early, due, texter, notDone, lastYear], { season, now })
  assert.deepEqual(plan.seen, ['fresh'])
  assert.deepEqual(plan.ask.map((a) => [a.id, a.channel]), [['due', 'email'], ['texter', 'text']])
  assert.deepEqual(plan.remind, [])
  assert.equal(plan.skipped.waiting, 2)
  const many = Array.from({ length: MAX_PER_RUN + 5 }, (_, i) => cust(`c${i}`, { seasons: { [season]: done({ reviewAsk: { seenAt: now - 3 * DAY } }) } }))
  const big = reviewPlan(many, { season, now })
  assert.equal(big.ask.length, MAX_PER_RUN)
  assert.equal(big.skipped.later, 5)
})

test('never: opted out of optional emails, an open service call (the clock is not reset), asked by hand, reviewed, unreachable', () => {
  const seen = { seenAt: now - 5 * DAY }
  const optedOut = cust('out', { emailNotices: false, seasons: { [season]: done({ reviewAsk: seen }) } })
  const busy = cust('busy', { seasons: { [season]: done({ reviewAsk: seen }) } })
  const hand = cust('hand', { seasons: { [season]: done({ reviewAsked: '2026-10-18' }) } })
  const reviewed = cust('rev', { seasons: { [season]: done({ reviewAsk: { ...seen, askedAt: now - 9 * DAY, channel: 'email', reviewedAt: now - DAY } }) } })
  const nobody = cust('nobody', { email: '', phone: '', seasons: { [season]: done({ reviewAsk: seen }) } })
  const plan = reviewPlan([optedOut, busy, hand, reviewed, nobody], { season, now, openCalls: new Set(['busy']) })
  assert.deepEqual(plan.ask, [])
  assert.deepEqual(plan.seen, [], 'none of them is "first seen" again')
  assert.deepEqual(plan.skipped, { optedOut: 1, openCall: 1, hand: 1, reviewed: 1, waiting: 0, unreachable: 1, later: 0 })
  // The call closes: asked on the next run, once.
  assert.deepEqual(reviewPlan([busy], { season, now }).ask.map((a) => a.id), ['busy'])
})

test('the reminder: once, 4 days after an email ask, never for a text-only ask, never twice, not after They reviewed', () => {
  const asked = (days, extra = {}) => cust(`r${days}`, { seasons: { [season]: done({ reviewAsk: { seenAt: now - (days + 2) * DAY, askedAt: now - days * DAY, channel: 'email', by: 'website', ...extra } }) } })
  const plan = reviewPlan([asked(3), asked(4), asked(6, { remindedAt: now - 2 * DAY }), asked(5, { channel: 'text' }), asked(5, { channel: 'email+text' }), asked(5, { reviewedAt: now - DAY }), asked(7, { remindedAt: now - 3 * DAY, replied: true })], { season, now })
  assert.deepEqual(plan.remind.map((r) => r.id), ['r4', 'r5'])
  assert.equal(plan.remind[0].email, 'r4@example.com')
  assert.deepEqual(plan.ask, [])
  // An open service call holds the reminder too.
  assert.deepEqual(reviewPlan([asked(4)], { season, now, openCalls: new Set(['r4']) }).remind, [])
})

test('"they wrote back" = any incoming message or account chat since the ask; our own emails don\'t count', () => {
  const askedAt = now - 4 * DAY
  assert.ok(!replied({ messages: [], conversation: null, askedAt }))
  assert.ok(!replied({ messages: [{ direction: 'in', at: new Date(askedAt - DAY).toISOString() }], conversation: null, askedAt }), 'before the ask')
  assert.ok(!replied({ messages: [{ direction: 'out', at: new Date(askedAt + DAY).toISOString() }], conversation: null, askedAt }), 'our own email')
  assert.ok(replied({ messages: [{ direction: 'in', at: new Date(askedAt + DAY).toISOString() }], conversation: null, askedAt }))
  assert.ok(replied({ messages: [{ direction: 'in', syncedAt: { toMillis: () => askedAt + 3600000 } }], conversation: null, askedAt }), 'a Firestore timestamp')
  assert.ok(replied({ messages: [], conversation: { lastFrom: 'customer', lastAt: new Date(askedAt + DAY).toISOString() }, askedAt }))
  assert.ok(!replied({ messages: [], conversation: { lastFrom: 'staff', lastAt: new Date(askedAt + DAY).toISOString() }, askedAt }))
})

test('the words: the same sentence and link for everyone, first name, signed by the business, optional, nothing offered', () => {
  const m = askEmail({ name: 'Pat Sample' })
  assert.equal(m.subject, 'Thank you from Christmas Light Creations')
  for (const must of ['Hi Pat,', REVIEW_LINE, REVIEW_URL, 'service calls are free', '281-819-0163', OPT_OUT_LINE]) assert.ok(m.text.includes(must), must)
  for (const must of [LOGO_URL, 'Leave a Google review', ACCOUNT_URL, `href="${REVIEW_URL}"`]) assert.ok(m.html.includes(must), must)
  const r = reminderEmail({ name: 'Pat Sample' })
  assert.equal(r.subject, 'A quick favor: a Google review')
  assert.ok(r.text.includes('Hi Pat,') && r.text.includes('If you already left one, thank you!') && r.text.includes(REVIEW_URL) && r.text.includes(OPT_OUT_LINE))
  assert.ok(r.html.includes('Leave a Google review'))
  const t = askText('Pat Sample')
  assert.equal(t, `Hi Pat, thank you for choosing Christmas Light Creations! ${REVIEW_LINE} ${REVIEW_URL}`)
  assert.ok(t.length < 240, 'one text')
  assert.equal(askText(''), askText(undefined))
  assert.ok(askText('').startsWith('Hi there,'))
  for (const text of [m.text, r.text, t]) {
    for (const never of ['happy', 'discount', 'gift', 'in return', 'in exchange', 'win ', 'Katie', 'Scott', 'Lacie', '5 star', '5-star', 'five star']) assert.ok(!text.toLowerCase().includes(never.toLowerCase()), `no "${never}"`)
  }
  assert.ok(m.text.includes('Thank you,\nChristmas Light Creations\n281-819-0163'), 'signed by the business')
  assert.equal(REVIEW_LINE, 'If you have a minute, a Google review helps a small family business more than anything.')
})

test('one review link everywhere: the site copy, the staff text, the staff email template', () => {
  assert.equal(business.reviewLink, REVIEW_URL)
  assert.equal(textMessages.review({ firstName: 'Pat' }), askText('Pat'))
  const tpl = STOCK_TEMPLATES.find((t) => t.id === 'review')
  assert.ok(tpl.body.includes(REVIEW_LINE) && tpl.body.includes('{reviewLink}'))
  assert.ok(!tpl.body.includes('really helps'))
})

test('the record: automatic, by hand, the latest completed season', () => {
  assert.deepEqual(askRecord(undefined), { seenAt: 0, askedAt: 0, manual: false, channel: '', remindedAt: 0, replied: false, textedAt: 0, reviewedAt: 0, reviewedBy: '' })
  const hand = askRecord({ reviewAsked: '2026-10-18' })
  assert.ok(hand.manual && hand.askedAt > 0 && hand.channel === 'hand')
  const auto = askRecord({ reviewAsked: '2026-10-18', reviewAsk: { askedAt: now, channel: 'email+text', textedAt: now + 1, reviewedAt: now + 2, reviewedBy: 'k@x.com' } })
  assert.ok(!auto.manual && auto.askedAt === now && auto.channel === 'email+text' && auto.textedAt === now + 1 && auto.reviewedBy === 'k@x.com')
  assert.equal(reviewSeasonOf({ seasons: { 2024: done(), 2025: done(), 2026: { installStatus: 'Install Scheduled' } } }), '2025')
  assert.equal(reviewSeasonOf({ seasons: { 2026: { installStatus: '' } } }), null)
  assert.equal(reviewSeasonOf({}), null)
})

test('💬 items: one per queued text, shaped like a message, gone once texted or reviewed', () => {
  const queued = cust('q', { seasons: { [season]: done({ reviewAsk: { askedAt: now - DAY, channel: 'email+text', by: 'website' } }) } })
  const textOnly = cust('t', { seasons: { [season]: done({ reviewAsk: { askedAt: now - 2 * DAY, channel: 'text', by: 'website' } }) } })
  const texted = cust('x', { seasons: { [season]: done({ reviewAsk: { askedAt: now - DAY, channel: 'email+text', textedAt: now } }) } })
  const emailOnly = cust('e', { seasons: { [season]: done({ reviewAsk: { askedAt: now - DAY, channel: 'email' } }) } })
  const reviewed = cust('v', { seasons: { [season]: done({ reviewAsk: { askedAt: now - DAY, channel: 'text', reviewedAt: now } }) } })
  const hand = cust('h', { seasons: { [season]: done({ reviewAsked: '2026-10-19' }) } })
  const items = reviewTextItems([queued, textOnly, texted, emailOnly, reviewed, hand], season)
  assert.deepEqual(items.map((m) => m.id), ['review-q', 'review-t'])
  assert.equal(items[0].kind, 'review')
  assert.equal(items[0].customerId, 'q')
  assert.equal(items[0].at, new Date(now - DAY).toISOString())
  assert.ok(items[0].text.includes('★ Text review link'))
  assert.ok(isAlert(items[0]) && KIND_WORD.review === 'Review text to send')
  assert.deepEqual(recentIncoming(items, now).map((m) => m.id), ['review-q', 'review-t'], 'in the list, newest first')
  assert.ok(needsSomeone(items[0], new Set()) && !needsSomeone(items[0], new Set(['review-q'])), 'I’ve got it works on it')
  assert.deepEqual(reviewTextItems(undefined, season), [])
})

test('Home counts and the state words', () => {
  const list = [
    cust('a', { seasons: { [season]: done({ reviewAsk: { askedAt: now - DAY, channel: 'email' } }) } }),
    cust('b', { seasons: { [season]: done({ reviewAsk: { askedAt: now - DAY, channel: 'email+text' } }) } }),
    cust('c', { seasons: { [season]: done({ reviewAsk: { askedAt: now - 3 * DAY, channel: 'text' } }) } }),
    cust('d', { seasons: { [season]: done({ reviewAsk: { askedAt: now - 5 * DAY, channel: 'email', reviewedAt: now } }) } }),
    cust('e', { seasons: { [season]: done({ reviewAsked: '2026-10-19' }) } }),
    cust('f', { seasons: { [season]: done({ reviewAsk: { seenAt: now } }) } }),
    cust('g', { seasons: { [season]: { installStatus: 'Install Scheduled' } } }),
  ]
  assert.deepEqual(reviewStats(list, season), { installed: 6, asked: 4, reviewed: 1, toText: 2, waiting: 1 })
  assert.deepEqual(reviewStats([], season), { installed: 0, asked: 0, reviewed: 0, toText: 0, waiting: 0 })

  const words = (entry, c = cust('w')) => reviewWords(entry, c, now)
  assert.equal(words(done({ reviewAsk: { askedAt: now - DAY, channel: 'email' } })), 'Asked by email Oct 19 · reminder about Oct 23 if no reply')
  assert.equal(words(done({ reviewAsk: { askedAt: now - 5 * DAY, channel: 'email' } })), 'Asked by email Oct 15 · reminder due (goes at 4 pm unless a service call is open)')
  assert.equal(words(done({ reviewAsk: { askedAt: now - 5 * DAY, channel: 'email', remindedAt: now - DAY } })), 'Asked by email Oct 15 · reminded Oct 19')
  assert.equal(words(done({ reviewAsk: { askedAt: now - 5 * DAY, channel: 'email', remindedAt: now - DAY, replied: true } })), 'Asked by email Oct 15 · no reminder: they wrote back')
  assert.equal(words(done({ reviewAsk: { askedAt: now - DAY, channel: 'email+text' } })), 'Asked by email Oct 19 · reminder about Oct 23 if no reply · text still to send')
  assert.equal(words(done({ reviewAsk: { askedAt: now - DAY, channel: 'email+text', textedAt: now } })), 'Asked by email Oct 19 · reminder about Oct 23 if no reply · texted Oct 20')
  assert.equal(words(done({ reviewAsk: { askedAt: now - DAY, channel: 'text' } })), 'Text to send (they prefer texts, asked Oct 19)')
  assert.equal(words(done({ reviewAsk: { askedAt: now - DAY, channel: 'text', reviewedAt: now } })), 'Reviewed ✓ Oct 20')
  assert.equal(words(done({ reviewAsked: '2026-10-18' })), 'Asked by hand Oct 18')
  assert.equal(words(done({ reviewAsk: { seenAt: now - DAY } })), 'Not asked yet: the website asks on Oct 21 (2 days after the install)')
  assert.equal(words(done()), 'Not asked yet: the website asks 2 days after the install')
  assert.ok(words(done(), cust('w', { emailNotices: false })).startsWith('Not asked: they turned optional emails off'))
  assert.ok(words(done(), cust('w', { email: '', phone: '' })).startsWith('Not asked: no email or phone'))

  assert.equal(reviewShort(done()), '')
  assert.equal(reviewShort(done({ reviewAsk: { askedAt: now - DAY, channel: 'email' } })), 'asked Oct 19')
  assert.equal(reviewShort(done({ reviewAsk: { askedAt: now - DAY, channel: 'email+text' } })), 'asked Oct 19 · text to send')
  assert.equal(reviewShort(done({ reviewAsk: { askedAt: now - DAY, channel: 'text' } })), 'text to send')
  assert.equal(reviewShort(done({ reviewAsk: { askedAt: now - DAY, channel: 'text', textedAt: now } })), 'asked Oct 19')
  assert.equal(reviewShort(done({ reviewAsked: '2026-10-18' })), 'asked Oct 18')
  assert.equal(reviewShort(done({ reviewAsk: { reviewedAt: now } })), 'reviewed ✓')
})

test('activity words, the Settings switch, the guide, and the lead’s contact choice on the customer', async () => {
  for (const a of ['review-asked', 'review-reminded', 'reviewed']) assert.ok(ACTIONS.includes(a), a)
  const c = { type: 'customer', id: 'pat', name: 'Pat Sample' }
  assert.equal(describe({ action: 'review-asked', by: 'website', target: c, text: 'email' }).did, 'was asked for a Google review by the website')
  assert.equal(describe({ action: 'review-reminded', by: 'website', target: c }).did, 'was reminded about a Google review by the website')
  assert.equal(describe({ action: 'reviewed', by: 'katiepq@gmail.com', target: c, text: '2026' }).did, 'noted a Google review from')
  const settings = await readFile(new URL('../src/leads/SettingsPanel.jsx', import.meta.url), 'utf8')
  assert.ok(settings.includes("['reviewAsks', 'Review request after install'"), 'the switch in ⚙ Settings → Automatic emails')
  assert.ok(settings.includes('nothing offered'))
  const task = TASKS.find(([t]) => t === 'Ask for a Google review')[1]
  for (const must of ['two days', 'one reminder', 'Review text to send', 'They reviewed', 'Never offer anything']) assert.ok(task.includes(must), must)
  assert.ok(WHATS_NEW.items[0].includes('Google review'))
  assert.ok(TOUR.find((s) => s.title === 'What runs by itself').body[0].includes('review request'))
  assert.deepEqual(CONTACT_METHODS, ['', 'Phone', 'Text', 'Email'])
  assert.equal(leadToCustomer({ firstName: 'A', lastName: 'B', contactMethod: 'Text' }, '2026').contactMethod, 'Text')
  assert.equal(leadToCustomer({ firstName: 'A', lastName: 'B', contactMethod: 'Carrier pigeon' }, '2026').contactMethod, undefined)
  assert.equal(leadToCustomer({ firstName: 'A', lastName: 'B' }, '2026').contactMethod, undefined)
})

test('accountReview: every past customer sees the account-page card until staff mark They reviewed', () => {
  const season = '2026'
  // An earlier season on file (the imported customers), whatever its status.
  assert.deepEqual(accountReview({ seasons: { 2024: { installStatus: '' }, 2026: { installStatus: 'Confirmed - Needs to be Scheduled' } } }, season), { show: true })
  // This season's install done.
  assert.deepEqual(accountReview({ seasons: { 2026: { installStatus: 'Install Completed' } } }, season), { show: true })
  // Customer since an earlier year, with no seasons on file.
  assert.deepEqual(accountReview({ since: '2019', seasons: {} }, season), { show: true })
  // First season with us, install not done yet: not a past customer.
  assert.equal(accountReview({ seasons: { 2026: { installStatus: 'Install Scheduled' } } }, season), null)
  assert.equal(accountReview({ since: '2026', seasons: { 2026: {} } }, season), null)
  assert.equal(accountReview({}, season), null)
  // Staff marked They reviewed (any season): gone.
  assert.equal(accountReview({ seasons: { 2025: { installStatus: 'Install Completed', reviewAsk: { reviewedAt: '2026-10-10T15:00:00Z' } }, 2026: {} } }, season), null)
  assert.equal(accountReview(null, season), null)
})

test('account review card: same sentence as the email, nothing offered; a tap hides it for good, Not now for 30 days', () => {
  assert.ok(accountReviewCard.text.includes(REVIEW_LINE))
  assert.doesNotMatch(Object.values(accountReviewCard).join(' '), /discount|free|gift|coupon|off your|\$/i)
  const now = Date.parse('2026-10-14T18:00:00Z')
  assert.equal(reviewCardOff('', now), false)
  assert.equal(reviewCardOff('done', now), true)
  const later = laterValue(now)
  assert.equal(reviewCardOff(later, now + 86_400_000), true)
  assert.equal(reviewCardOff(later, now + (LATER_DAYS + 1) * 86_400_000), false)
  assert.equal(reviewCardOff('later:garbage', now), false)
})
