import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NOTICE_MAX, PLATFORMS, listingNotice, noticeText, platformOf } from '../functions/listingNotices.js'
import { docsFor, dryRunSummary, parseItem } from '../functions/messageSync.js'
import { KIND_WORD, isAlert, previewOf, pushFor, whoOf } from '../functions/staffPush.js'

// Hand-written samples in Nextdoor's and Yelp's usual notice wording (no real
// data; no real notice had reached info@ yet, docs/specs/listing-notices.md).
const DATE = '2026-10-15T15:04:05.000Z'
const dir = { phone: new Map(), email: new Map() }
const msg = {
  gmailId: 'n1', messageId: '<nd1@email.nextdoor.com>', date: DATE,
  from: '"Sample N. via Nextdoor" <reply@rs.email.nextdoor.com>', to: 'info@christmas-light-creations.com',
  subject: 'Sample N. sent you a message',
  body: `Sample N. · Shadow Creek Ranch
Hi! Do you still have dates in November? Two-story house, roofline only.
<https://nextdoor.com/inbox/abc?token=SECRET>
Reply on Nextdoor
You're receiving this email because you have a business page on Nextdoor.
Unsubscribe <https://nextdoor.com/unsub?u=SECRET>
Nextdoor, Inc. 420 Taylor Street, San Francisco, CA 94102`,
}
const nd = (subject, body = 'Words', extra = {}) => ({ ...msg, from: 'Nextdoor <no-reply@ss.email.nextdoor.com>', subject, body, ...extra })
const quote = {
  gmailId: 'y1', messageId: '<y1@yelp.com>', date: DATE, from: 'Yelp for Business <no-reply@yelp.com>', to: 'info@christmas-light-creations.com',
  subject: 'New Request a Quote from Sample Y.',
  body: 'Sample Y. is looking for: Christmas light installation\nTwo-story house in League City, roofline and garage. When can you come out?\nhttps://biz.yelp.com/r2r/abc?token=SECRET\nRespond to this request\nYelp Inc., 350 Mission Street',
}
const yelp = (subject, body = 'Words') => ({ ...quote, gmailId: subject, messageId: `<${subject}@yelp.com>`, subject, body })

test('only nextdoor.com, yelp.com and their subdomains count', () => {
  assert.equal(platformOf('reply@rs.email.nextdoor.com'), 'nextdoor')
  assert.equal(platformOf('no-reply@yelp.com'), 'yelp')
  assert.equal(platformOf('biz@messaging.yelp.com'), 'yelp')
  assert.equal(platformOf('someone@notnextdoor.com'), '')
  assert.equal(platformOf('yelp.com@shared1.ccsend.com'), '')
  assert.equal(listingNotice({ ...msg, from: 'Sample <sample@example.com>' }), null)
})

test('Nextdoor: a message, a recommendation, a comment and a mention are kept, with who and the words', () => {
  assert.deepEqual(listingNotice(msg), { platform: 'nextdoor', type: 'message', word: 'New message', who: 'Sample N.', text: 'Sample N. · Shadow Creek Ranch\nHi! Do you still have dates in November? Two-story house, roofline only.' })
  const rec = listingNotice(nd('Sample N. recommended Christmas Light Creations', 'Sample N. recommended your business:\n“They did a great job on our roofline.”\nSee all recommendations <https://nextdoor.com/x>'))
  assert.deepEqual(rec, { platform: 'nextdoor', type: 'recommendation', word: 'New recommendation', who: 'Sample N.', text: 'Sample N. recommended your business:\n“They did a great job on our roofline.”' })
  const comment = listingNotice(nd('Sample N. commented on your post', 'Do you do businesses too?\nView comment'))
  assert.equal(comment.type, 'comment')
  assert.equal(comment.who, 'Sample N.') // from the subject when the sender is just "Nextdoor"
  assert.equal(comment.text, 'Do you do businesses too?')
  assert.equal(listingNotice(nd('Sample N. mentioned your business')).type, 'mention')
  assert.equal(listingNotice(nd('You have a new message')).type, 'message')
  assert.equal(listingNotice(nd('You have a new message')).who, '')
})

test('Yelp: a quote request and a message are kept, with who and the words', () => {
  assert.deepEqual(listingNotice(quote), { platform: 'yelp', type: 'quote', word: 'Quote request', who: 'Sample Y.', text: 'Sample Y. is looking for: Christmas light installation\nTwo-story house in League City, roofline and garage. When can you come out?' })
  assert.equal(listingNotice(yelp('Sample Y. requested a quote')).type, 'quote')
  assert.equal(listingNotice(yelp('You have a new lead from Sample Y.')).who, 'Sample Y.')
  const m = listingNotice(yelp('New message from Sample Y.', 'Are you still booking this season?\nReply on Yelp'))
  assert.deepEqual(m, { platform: 'yelp', type: 'message', word: 'New message', who: 'Sample Y.', text: 'Are you still booking this season?' })
  assert.equal(listingNotice(yelp('Sample Y. sent you a message')).type, 'message')
})

test('digests, stats, tips, upsells, reviews and other site mail stay with the junk rules (dropped)', () => {
  for (const s of ['Today’s top posts: New message from the HOA about lights', 'Welcome to Nextdoor for business', 'Neighbors near you recommended a plumber', '']) assert.equal(listingNotice(nd(s)), null, s)
  for (const s of ['Your weekly stats: 40 page views', 'You missed 3 leads this month', 'Tips to get more quote requests', 'Upgrade to Yelp Ads and get new leads', 'Sample Y. wrote a review of your business', 'Confirm your email address']) assert.equal(listingNotice(yelp(s)), null, s)
})

test('links (they can carry sign-in tokens) and footers never reach the text; long text is capped', () => {
  for (const item of [msg, quote]) {
    const t = noticeText(item.body, item.subject)
    assert.equal(/https?:|SECRET|Unsubscribe|Nextdoor, Inc|Yelp Inc|Respond/.test(t), false)
  }
  const long = noticeText('x'.repeat(NOTICE_MAX + 50))
  assert.equal(long.length, NOTICE_MAX)
  assert.equal(long.endsWith('…'), true)
})

test('the sync files a notice as one Unmatched item of its site and still drops other site mail', () => {
  for (const [item, site] of [[msg, 'nextdoor'], [quote, 'yelp']]) {
    const event = parseItem(item)
    assert.equal(event.kind, site)
    assert.equal(event.source, site)
    const docs = docsFor(event, dir)
    assert.equal(docs.length, 1)
    assert.match(docs[0].id, new RegExp(`^em-[0-9a-f]{20}-${site}$`))
    assert.deepEqual(Object.keys(docs[0].data).sort(), ['at', 'direction', 'kind', 'name', 'notice', 'source', 'subject', 'text', 'unmatched'])
    assert.equal(dryRunSummary(event, docs).status, 'would-save')
    assert.equal(parseItem({ ...item, gmailId: 'again' }).idBase, event.idBase) // same Message-ID, same id: a re-send is a duplicate
  }
  for (const item of [nd('Welcome to Nextdoor for business'), yelp('Your weekly stats')]) {
    const e = parseItem(item)
    assert.equal(e.kind, 'email')
    assert.ok(['automatic', 'service'].includes(e.junk)) // no-reply@ is "automatic" before it's "service": dropped either way
    assert.deepEqual(docsFor(e, dir), [])
  }
})

test('staff alerts: "<Site> from <name>", the notice word first, someone when no name', () => {
  const now = Date.parse(DATE) + 60000
  const [{ data: n }] = docsFor(parseItem(msg), dir)
  const [{ data: y }] = docsFor(parseItem(quote), dir)
  assert.equal(KIND_WORD.nextdoor, 'Nextdoor')
  assert.equal(KIND_WORD.yelp, 'Yelp')
  assert.equal(isAlert(n) && isAlert(y), true)
  assert.equal(pushFor([n], {}, now).title, 'Nextdoor from Sample N.')
  assert.match(pushFor([n], {}, now).body, /^New message · Sample N\. · Shadow Creek Ranch Hi! Do you still/)
  assert.equal(pushFor([y], {}, now).title, 'Yelp from Sample Y.')
  assert.match(pushFor([y], {}, now).body, /^Quote request · Sample Y\. is looking for/)
  assert.equal(pushFor([n], {}, now).link, '#leads')
  assert.equal(whoOf({ ...n, name: undefined }), 'A neighbor')
  assert.equal(whoOf({ ...y, name: undefined }), 'A Yelp customer')
  assert.equal(previewOf({ kind: 'nextdoor', subject: 'New recommendation', text: '' }), 'New recommendation')
  assert.equal(PLATFORMS.yelp.url, 'https://biz.yelp.com/')
})
