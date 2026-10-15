import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NEXTDOOR_MAX, isNextdoor, nextdoorNotice, noticeText } from '../functions/nextdoor.js'
import { docsFor, dryRunSummary, parseItem } from '../functions/messageSync.js'
import { KIND_WORD, isAlert, previewOf, pushFor, whoOf } from '../functions/staffPush.js'

// Hand-written samples in Nextdoor's usual notice wording (no real data; no real
// notice had reached info@ yet, docs/specs/nextdoor-notices.md).
const DATE = '2026-10-15T15:04:05.000Z'
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
const rec = { ...msg, gmailId: 'n2', messageId: '<nd2@email.nextdoor.com>', from: 'Nextdoor <no-reply@ss.email.nextdoor.com>',
  subject: 'Sample N. recommended Christmas Light Creations', body: 'Sample N. recommended your business:\n“They did a great job on our roofline.”\nSee all recommendations <https://nextdoor.com/x>' }
const comment = { ...msg, gmailId: 'n3', messageId: '<nd3@email.nextdoor.com>', from: 'Nextdoor <no-reply@ss.email.nextdoor.com>',
  subject: 'Sample N. commented on your post', body: 'Do you do businesses too?\nView comment' }
const mention = { ...msg, gmailId: 'n4', messageId: '<nd4@email.nextdoor.com>', from: 'Nextdoor <no-reply@ss.email.nextdoor.com>',
  subject: 'Sample N. mentioned your business', body: 'Try Christmas Light Creations, they did ours.\nOpen the post' }
const digest = { ...msg, gmailId: 'n5', messageId: '<nd5@email.nextdoor.com>', from: 'Nextdoor <no-reply@ss.email.nextdoor.com>',
  subject: 'Today’s top posts: New message from the HOA about lights', body: 'Lots of posts' }
const other = { ...msg, gmailId: 'n6', messageId: '<nd6@email.nextdoor.com>', from: 'Nextdoor <no-reply@ss.email.nextdoor.com>',
  subject: 'Welcome to Nextdoor for business', body: 'Get started' }

test('only nextdoor.com and its subdomains count as Nextdoor', () => {
  assert.equal(isNextdoor('reply@rs.email.nextdoor.com'), true)
  assert.equal(isNextdoor('no-reply@nextdoor.com'), true)
  assert.equal(isNextdoor('someone@notnextdoor.com'), false)
  assert.equal(isNextdoor('nextdoor.com@shared1.ccsend.com'), false)
  assert.equal(nextdoorNotice({ ...msg, from: 'Sample <sample@example.com>' }), null)
})

test('a message, a recommendation, a comment and a mention are kept, with who and the words', () => {
  assert.deepEqual(nextdoorNotice(msg), { type: 'message', word: 'New message', who: 'Sample N.', text: 'Sample N. · Shadow Creek Ranch\nHi! Do you still have dates in November? Two-story house, roofline only.' })
  assert.deepEqual(nextdoorNotice(rec), { type: 'recommendation', word: 'New recommendation', who: 'Sample N.', text: 'Sample N. recommended your business:\n“They did a great job on our roofline.”' })
  assert.equal(nextdoorNotice(comment).type, 'comment')
  assert.equal(nextdoorNotice(comment).who, 'Sample N.') // from the subject when the sender is just "Nextdoor"
  assert.equal(nextdoorNotice(comment).text, 'Do you do businesses too?')
  assert.equal(nextdoorNotice(mention).type, 'mention')
  assert.equal(nextdoorNotice({ ...msg, subject: 'You have a new message' }).type, 'message')
  assert.equal(nextdoorNotice({ ...msg, from: 'Nextdoor <no-reply@nextdoor.com>', subject: 'You have a new message' }).who, '')
})

test('digests and other Nextdoor mail stay with the junk rules (dropped)', () => {
  assert.equal(nextdoorNotice(digest), null)
  assert.equal(nextdoorNotice(other), null)
  assert.equal(nextdoorNotice({ ...msg, subject: 'Neighbors near you recommended a plumber' }), null)
  assert.equal(nextdoorNotice({ ...msg, subject: '' }), null)
})

test('links (they can carry sign-in tokens) and footers never reach the text; long text is capped', () => {
  const t = noticeText(msg.body, msg.subject)
  assert.equal(/https?:|SECRET|Unsubscribe|Nextdoor, Inc/.test(t), false)
  const long = noticeText('x'.repeat(NEXTDOOR_MAX + 50))
  assert.equal(long.length, NEXTDOOR_MAX)
  assert.equal(long.endsWith('…'), true)
})

test('the sync files a notice as one Unmatched 🏘️ item and still drops other Nextdoor mail', () => {
  const event = parseItem(msg)
  assert.equal(event.kind, 'nextdoor')
  assert.equal(event.source, 'nextdoor')
  assert.equal(event.direction, 'in')
  const docs = docsFor(event, { phone: new Map(), email: new Map() })
  assert.equal(docs.length, 1)
  assert.match(docs[0].id, /^em-[0-9a-f]{20}-nextdoor$/)
  assert.deepEqual(Object.keys(docs[0].data).sort(), ['at', 'direction', 'kind', 'name', 'notice', 'source', 'subject', 'text', 'unmatched'])
  assert.equal(docs[0].data.unmatched, true)
  assert.equal(parseItem({ ...msg, gmailId: 'again' }).idBase, event.idBase) // same Message-ID, same id: a re-send is a duplicate
  assert.equal(dryRunSummary(event, docs).status, 'would-save')
  const welcome = parseItem(other)
  assert.equal(welcome.kind, 'email')
  assert.ok(['automatic', 'service'].includes(welcome.junk)) // no-reply@ is "automatic" before it's "service": dropped either way
  assert.deepEqual(docsFor(welcome, { phone: new Map(), email: new Map() }), [])
})

test('staff alerts: "Nextdoor from <neighbor>", the notice word first, a neighbor when no name', () => {
  const [{ data }] = docsFor(parseItem(msg), { phone: new Map(), email: new Map() })
  assert.equal(KIND_WORD.nextdoor, 'Nextdoor')
  assert.equal(isAlert(data), true)
  const now = Date.parse(DATE) + 60000
  const push = pushFor([data], {}, now)
  assert.equal(push.title, 'Nextdoor from Sample N.')
  assert.match(push.body, /^New message · Sample N\. · Shadow Creek Ranch Hi! Do you still/)
  assert.equal(push.link, '#leads')
  assert.equal(whoOf({ ...data, name: undefined }), 'A neighbor')
  assert.equal(previewOf({ kind: 'nextdoor', subject: 'New recommendation', text: '' }), 'New recommendation')
})
