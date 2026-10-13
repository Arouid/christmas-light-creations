// Account chat (docs/specs/account-chat.md): the pure parts of the server
// functions sendAccountMessage / replyToCustomer, the 💬 list entries, the
// nudge, Recent activity and the assistant's thread.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  LIMITS, REPLY_SUBJECT, TEXT_MAX, THREAD_MAX, appendMessage, chatAlertEmail, chatAllowed, chatPush, chatRequest, customerView, previewText, recipientFor, replyEmail,
} from '../functions/chat.js'
import { KIND_WORD } from '../functions/staffPush.js'
import { chatItems, countOpen, needsSomeone, recentIncoming } from '../src/lib/staffAlerts.js'
import { claimed, waiting } from '../functions/nudge.js'
import { ACTIONS, describe, targetLink } from '../src/lib/activity.js'
import { channelFor, threadText } from '../functions/assistant/prompt.js'
import { chatMessages } from '../functions/assistant/draft.js'

const customer = { id: 'pat-sample', fullName: 'Pat Sample', city: 'Pearland', email: 'pat@example.com' }
const now = new Date('2026-10-13T15:00:00Z')
const MIN = 60 * 1000
const HOUR = 60 * MIN

test('request check: trimmed, blank lines kept, empty / junk / too long refused', () => {
  assert.deepEqual(chatRequest({ text: '  Can you come Friday?  \n\nThanks!  ' }), { text: 'Can you come Friday?\n\nThanks!' })
  assert.deepEqual(chatRequest({ text: 'a\r\nb' }), { text: 'a\nb' })
  assert.equal(chatRequest({ text: '   ' }).error[0], 'invalid-argument')
  assert.equal(chatRequest(undefined).error[0], 'invalid-argument')
  assert.equal(chatRequest({ text: 42 }).error[0], 'invalid-argument')
  assert.equal(chatRequest({ text: 'x'.repeat(TEXT_MAX + 1) }).error[0], 'invalid-argument')
  assert.equal(chatRequest({ text: 'x'.repeat(TEXT_MAX) }).text.length, TEXT_MAX)
})

test('appending: a new thread, a follow-up keeps the wait, a staff reply ends it, the cap drops the oldest', () => {
  const first = appendMessage(null, { from: 'customer', by: 'pat@example.com', text: 'Hi' }, customer, now)
  assert.deepEqual(first, {
    customerId: 'pat-sample', customerName: 'Pat Sample', count: 1, lastAt: now, lastFrom: 'customer', waitingSince: now,
    messages: [{ from: 'customer', by: 'pat@example.com', text: 'Hi', at: '2026-10-13T15:00:00.000Z' }],
  })
  const later = new Date(now.getTime() + 10 * MIN)
  const second = appendMessage(first, { from: 'customer', by: 'pat@example.com', text: 'Also…' }, customer, later)
  assert.equal(second.waitingSince, now, 'the wait started with the first unanswered message')
  assert.equal(second.count, 2)
  assert.equal(second.lastAt, later)
  const reply = appendMessage(second, { from: 'staff', by: 'katie@example.com', text: 'Yes!' }, customer, new Date(later.getTime() + MIN))
  assert.equal(reply.waitingSince, null)
  assert.equal(reply.lastFrom, 'staff')
  assert.equal(reply.messages.length, 3)
  const again = appendMessage(reply, { from: 'customer', by: 'pat@example.com', text: 'Great' }, customer, new Date(later.getTime() + 2 * MIN))
  assert.equal(again.waitingSince.getTime(), later.getTime() + 2 * MIN, 'a new wait starts after a reply')
  // Staff can start a thread: nothing is waiting on us.
  assert.equal(appendMessage(null, { from: 'staff', by: 'katie@example.com', text: 'We come Thursday' }, customer, now).waitingSince, null)
  // The cap: 200 kept, the oldest dropped, the count keeps growing.
  let doc = null
  for (let i = 0; i < THREAD_MAX + 5; i++) doc = appendMessage(doc, { from: 'customer', by: 'pat@example.com', text: `m${i}` }, customer, new Date(now.getTime() + i * 1000))
  assert.equal(doc.messages.length, THREAD_MAX)
  assert.equal(doc.messages[0].text, 'm5')
  assert.equal(doc.count, THREAD_MAX + 5)
  assert.equal(customerView(doc).dropped, 5)
})

test('rate limit: per person and day, with a gap; a new day resets', () => {
  const day = '2026-10-13'
  const t = now.getTime()
  let r = chatAllowed(undefined, 'pat@example.com', LIMITS.customer, t, day)
  assert.deepEqual(r.next, { day, count: { 'pat@example.com': 1 }, last: { 'pat@example.com': t } })
  r = chatAllowed(r.next, 'pat@example.com', LIMITS.customer, t + 1000, day)
  assert.equal(r.problem[0], 'resource-exhausted', 'too fast')
  r = chatAllowed({ day, count: { 'pat@example.com': 3 }, last: { 'pat@example.com': t } }, 'pat@example.com', LIMITS.customer, t + LIMITS.customer.gapMs, day)
  assert.equal(r.next.count['pat@example.com'], 4)
  // Another customer isn't held back by Pat's count; Pat's limit is Pat's alone.
  r = chatAllowed({ day, count: { 'pat@example.com': LIMITS.customer.daily }, last: {} }, 'pat@example.com', LIMITS.customer, t, day)
  assert.equal(r.problem[0], 'resource-exhausted')
  assert.ok(chatAllowed({ day, count: { 'pat@example.com': LIMITS.customer.daily }, last: {} }, 'sam@example.com', LIMITS.customer, t, day).next)
  // Yesterday's counts don't carry over.
  assert.equal(chatAllowed({ day: '2026-10-12', count: { 'pat@example.com': 99 }, last: { 'pat@example.com': t } }, 'pat@example.com', LIMITS.customer, t, day).next.count['pat@example.com'], 1)
  assert.ok(LIMITS.staff.daily > LIMITS.customer.daily)
})

test('what the customer sees: no staff emails, whether they are waiting on us', () => {
  const doc = appendMessage(appendMessage(null, { from: 'customer', by: 'pat@example.com', text: 'Hi' }, customer, now), { from: 'staff', by: 'katie@example.com', text: 'Hello!' }, customer, now)
  const v = customerView(doc)
  assert.deepEqual(v.messages, [{ from: 'customer', text: 'Hi', at: '2026-10-13T15:00:00.000Z' }, { from: 'staff', text: 'Hello!', at: '2026-10-13T15:00:00.000Z' }])
  assert.equal(v.waiting, false)
  assert.ok(!JSON.stringify(v).includes('katie@'))
  assert.deepEqual(customerView(undefined), { messages: [], waiting: false, dropped: 0 })
})

test('who gets the reply email: the address they wrote from, else the record, else nobody', () => {
  const doc = { messages: [{ from: 'customer', by: 'Pat.Other@Example.com', text: 'Hi', at: '' }, { from: 'staff', by: 'k@x.com', text: 'Yo', at: '' }] }
  assert.equal(recipientFor(doc, customer), 'pat.other@example.com')
  assert.equal(recipientFor(null, customer), 'pat@example.com')
  assert.equal(recipientFor(null, { id: 'x', fullName: 'No Mail' }), '')
})

test('staff alerts: the push is worded like a text; the alert email names them and escapes HTML; 💬 shows "Account message"', () => {
  const push = chatPush('pat-sample', 'Pat Sample', 'Can you come Friday instead? We have <guests>', now.getTime())
  assert.deepEqual(push, { title: 'Account message from Pat Sample', body: 'Can you come Friday instead? We have <guests>', link: '#accounts/customer/pat-sample', tag: 'customer:pat-sample' })
  assert.equal(KIND_WORD.chat, 'Account message')
  const mail = chatAlertEmail({ customer, text: 'Friday <b>please</b>', email: 'pat@example.com' })
  assert.equal(mail.subject, 'Account message: Pat Sample, Pearland: Friday <b>please</b>')
  assert.ok(mail.html.includes('Friday &lt;b&gt;please&lt;/b&gt;'))
  assert.ok(!mail.html.includes('<b>please'))
  assert.ok(mail.html.includes('#accounts/customer/pat-sample'))
  assert.ok(mail.text.includes('Pat Sample wrote to you from their account'))
  assert.equal(mail.replyTo, 'pat@example.com')
  assert.equal(previewText(' a  long\n\nline '.repeat(30)).length, 120)
})

test('the customer’s email on a reply: branded, the text, a button to #chat, never optional', () => {
  const m = replyEmail({ text: 'Yes, Friday works. See you then!\n\nKatie' })
  assert.equal(m.subject, REPLY_SUBJECT)
  assert.equal(REPLY_SUBJECT, 'New message from Christmas Light Creations')
  assert.ok(m.text.startsWith('Yes, Friday works. See you then!\n\nKatie\n\nReply from your account: https://christmas-light-creations.com/account/#chat'))
  assert.ok(m.html.includes('href="https://christmas-light-creations.com/account/#chat"'))
  assert.ok(m.html.includes('Open your account'))
  assert.ok(m.html.includes('Yes, Friday works. See you then!'))
  assert.ok(!m.html.includes('turn them off'), 'critical mail: no opt-out line')
  assert.ok(m.html.includes('Not spam'), 'the standard footer')
  const hostile = replyEmail({ text: '<script>alert(1)</script>' })
  assert.ok(!hostile.html.includes('<script>'))
})

const conv = (over = {}) => ({
  id: 'pat-sample', customerName: 'Pat Sample', lastAt: now, lastFrom: 'customer', waitingSince: now, count: 1,
  messages: [{ from: 'customer', by: 'pat@example.com', text: 'Can you come Friday?', at: now.toISOString() }], ...over,
})

test('💬 entries: one per thread, keyed by the first unanswered message; answered ones don’t need anyone; old ones drop out', () => {
  const [item] = chatItems([conv()])
  assert.deepEqual(item, {
    id: `chat-pat-sample-${now.getTime()}`, kind: 'chat', direction: 'in', customerId: 'pat-sample', name: 'Pat Sample', status: 'waiting',
    at: now.toISOString(), syncedAt: now.getTime(), text: 'Can you come Friday?',
  })
  // A follow-up: same id (an I've got it holds), the newest words shown.
  const later = new Date(now.getTime() + 10 * MIN)
  const [follow] = chatItems([conv({ lastAt: later, messages: [...conv().messages, { from: 'customer', by: 'pat@example.com', text: 'Or Saturday', at: later.toISOString() }] })])
  assert.equal(follow.id, item.id)
  assert.equal(follow.text, 'Or Saturday')
  assert.equal(follow.syncedAt, later.getTime())
  // Answered: listed, not needing anyone; the next customer message is a new id.
  const answered = conv({ waitingSince: null, lastFrom: 'staff', lastAt: later, messages: [...conv().messages, { from: 'staff', by: 'k@x.com', text: 'Yes', at: later.toISOString() }] })
  const [done] = chatItems([answered])
  assert.equal(done.status, 'answered')
  assert.equal(needsSomeone(done, new Set()), false)
  assert.equal(needsSomeone(item, new Set()), true)
  assert.equal(needsSomeone(item, new Set([item.id])), false)
  const t2 = new Date(later.getTime() + HOUR)
  const [again] = chatItems([conv({ waitingSince: t2, lastAt: t2, messages: [...answered.messages, { from: 'customer', by: 'pat@example.com', text: 'One more thing', at: t2.toISOString() }] })])
  assert.notEqual(again.id, item.id)
  assert.equal(again.status, 'waiting')
  // Threads staff started with no customer message, and threads older than 7 days, aren't alerts.
  assert.deepEqual(chatItems([conv({ waitingSince: null, messages: [{ from: 'staff', by: 'k@x.com', text: 'Hi', at: now.toISOString() }] })]), [])
  const old = new Date(now.getTime() - 8 * 24 * HOUR)
  const list = recentIncoming(chatItems([conv(), conv({ id: 'old-one', lastAt: old, waitingSince: old, messages: [{ from: 'customer', by: 'x', text: 'old', at: old.toISOString() }] })]), now.getTime())
  assert.deepEqual(list.map((m) => m.customerId), ['pat-sample'])
  assert.equal(countOpen(list, claimed([])), 1)
})

test('the still-waiting nudge counts an unanswered chat after 2 hours, not an answered or claimed one', () => {
  const t = now.getTime() + 3 * HOUR
  const items = waiting({ messages: [], leads: [], calls: [], conversations: [conv()], activity: [], now: t })
  assert.deepEqual(items.map((m) => m.id), [`chat-pat-sample-${now.getTime()}`])
  assert.deepEqual(waiting({ messages: [], leads: [], calls: [], conversations: [conv()], activity: [], now: now.getTime() + HOUR }), [])
  assert.deepEqual(waiting({ messages: [], leads: [], calls: [], conversations: [conv({ waitingSince: null })], activity: [], now: t }), [])
  const claim = { action: 'handling', target: { id: `chat-pat-sample-${now.getTime()}` } }
  assert.deepEqual(waiting({ messages: [], leads: [], calls: [], conversations: [conv()], activity: [claim], now: t }), [])
})

test('Recent activity: the customer wrote, staff replied; the entry links to their account', () => {
  assert.ok(ACTIONS.includes('chat-message') && ACTIONS.includes('chat-reply'))
  const c = { type: 'customer', id: 'pat-sample', name: 'Pat Sample' }
  assert.deepEqual(describe({ by: 'website', action: 'chat-message', target: c, text: 'Can you come Friday?' }),
    { actor: 'Pat Sample', did: 'sent a message from their account', name: '', detail: 'Can you come Friday?', link: '#accounts/customer/pat-sample' })
  assert.deepEqual(describe({ by: 'katiep@example.com', action: 'chat-reply', target: c, text: 'Yes!' }),
    { actor: 'Katie P.', did: 'replied in the account chat to', name: 'Pat Sample', detail: 'Yes!', link: '#accounts/customer/pat-sample' })
  assert.equal(targetLink({ type: 'message', id: 'chat-pat-sample-1760367600000' }), '#accounts/customer/pat-sample')
  assert.equal(targetLink({ type: 'message', id: 'chat-o-brien-2-1760367600000' }), '#accounts/customer/o-brien-2')
})

test('the sales assistant reads the chat as part of the thread and drafts a short reply', () => {
  const msgs = chatMessages(conv({ messages: [...conv().messages, { from: 'staff', by: 'k@x.com', text: 'Friday is fine', at: new Date(now.getTime() + MIN).toISOString() }] }))
  assert.deepEqual(msgs.map((m) => [m.kind, m.direction, m.text]), [['chat', 'in', 'Can you come Friday?'], ['chat', 'out', 'Friday is fine']])
  const text = threadText(msgs)
  assert.ok(text.includes('[2026-10-13] Customer (account chat message): Can you come Friday?'))
  assert.ok(text.includes('Us (account chat message): Friday is fine'))
  assert.equal(channelFor(msgs.slice(0, 1), customer), 'text')
  assert.deepEqual(chatMessages(undefined), [])
})
