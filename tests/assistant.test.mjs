import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  DAILY_LIMIT, MAX_THREAD, NEXT_ACTIONS, OUTPUT_SCHEMA, channelFor, costOf, draftAllowed, draftRequest, fallbackDraft, parseDraft, recordText, systemPrompt, threadText, userPrompt,
} from '../functions/assistant/prompt.js'
import { salesKnowledge } from '../src/assistant/lib/knowledge.js'
import { presenceRows } from '../src/lib/presence.js'
import { ACTIONS } from '../src/lib/activity.js'
import { activityTarget, draftTarget, emailTarget } from '../src/assistant/lib/targets.js'

const knowledge = salesKnowledge()

// Sample people (no real data).
const customer = {
  fullName: 'Pat Sample', firstName: 'Pat', address: '123 Main St', city: 'Pearland', email: 'pat@example.com', phone: '(281) 555-0101', since: '2023', gateCode: '4321', notes: 'Dog in the back yard',
  originalRate: 1800,
  seasons: {
    2025: { installStatus: 'Install Completed', install: { rate: '$900', discount: '10%', total: '$810', paid: 'Yes' }, takedown: { rate: '$150' } },
    2026: { installStatus: 'Confirmed - Needs to be Scheduled', firstContact: 'Confirmed', schedulingNotes: 'Wants before Thanksgiving' },
  },
}
const thread = [
  { id: 'a', kind: 'email', direction: 'out', at: '2026-09-30T15:00:00Z', subject: 'Your 2026 Christmas lights', text: 'Hi Pat, we are booking 2026 installs now.' },
  { id: 'b', kind: 'text', direction: 'in', at: '2026-10-09T20:10:00Z', text: 'Yes! Put me on the schedule. When can you come?' },
]

test('the knowledge file the server ships matches the site copy (run node scripts/build-assistant-knowledge.mjs)', async () => {
  const shipped = JSON.parse(await readFile(new URL('../functions/assistant/knowledge.json', import.meta.url), 'utf8'))
  assert.deepEqual(shipped, knowledge)
})

test('the system prompt carries the business facts and every hard rule, and nothing that changes per call', () => {
  const p = systemPrompt(knowledge)
  for (const must of ['Christmas Light Creations', '281-819-0163', 'Pearland', 'Galveston', '10% off', '12-inch', 'measure', 'Never quote an exact price', 'Never promise a specific install', 'Never offer a discount', 'escalate', 'Do you work on tile roofs?', 'Thank you,']) {
    assert.ok(p.includes(must), must)
  }
  assert.ok(!/Today:|\b2026-\d\d-\d\d\b/.test(p), 'no dates that would break caching')
  assert.ok(p.length > 4000 && p.length < 40_000, `prompt size ${p.length}`)
  assert.deepEqual(OUTPUT_SCHEMA.required, ['summary', 'nextAction', 'channel', 'subject', 'reply', 'escalate', 'reason'])
  assert.deepEqual(OUTPUT_SCHEMA.properties.nextAction.enum, Object.keys(NEXT_ACTIONS))
})

test('the record text has what the model may use and not what it must not', () => {
  const t = recordText(customer, 'customers', 2026)
  assert.ok(t.includes('Pat Sample') && t.includes('123 Main St, Pearland'))
  assert.ok(t.includes('Season 2025') && t.includes('install price $900') && t.includes('Season 2026 (this season)'))
  assert.ok(t.includes('Original (first-year) price on file: $1800'))
  assert.ok(t.includes('Staff notes (internal'))
  assert.ok(!t.includes('4321'), 'gate code never goes to the model')
  const lead = recordText({ firstName: 'Sam', lastName: 'New', address: '9 Oak', city: 'Alvin', message: 'How much for roofline?', status: 'new', source: 'Google search' }, 'leads', 2026)
  assert.ok(lead.includes('Website estimate request') && lead.includes('Sam New') && lead.includes('How much for roofline?') && lead.includes('Google search'))
  assert.ok(recordText(null, 'messages').includes('Unknown person'))
})

test('the thread is oldest first, says who and how, and is capped', () => {
  const t = threadText(thread)
  const lines = t.split('\n')
  assert.ok(lines[0].startsWith('[2026-09-30] Us (email, subject: Your 2026 Christmas lights): Hi Pat'))
  assert.ok(lines[1].startsWith('[2026-10-09] Customer (text): Yes! Put me on the schedule'))
  assert.equal(threadText([]), '(no messages on file)')
  const many = Array.from({ length: 50 }, (_, i) => ({ kind: 'text', direction: 'in', at: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}T0${i % 10}:00:00Z`, text: `m${i}` }))
  assert.equal(threadText(many).split('\n').length, MAX_THREAD)
  const long = threadText([{ kind: 'email', direction: 'in', at: '2026-10-01T00:00:00Z', text: 'x'.repeat(5000) }])
  assert.ok(long.length < 1700 && long.endsWith('…'))
})

test('the reply channel follows the customer’s last message', () => {
  assert.equal(channelFor(thread, customer), 'text')
  assert.equal(channelFor([thread[0], { kind: 'email', direction: 'in', at: '2026-10-10T00:00:00Z', text: 'hi' }], customer), 'email')
  assert.equal(channelFor([{ kind: 'request', direction: 'in', at: '2026-10-10T00:00:00Z', text: 'hi' }], { email: 'a@b.co' }), 'email')
  assert.equal(channelFor([{ kind: 'request', direction: 'in', at: '2026-10-10T00:00:00Z', text: 'hi' }], { email: '' }), 'text')
  assert.equal(channelFor([], customer), 'email')
  assert.equal(channelFor([], { phone: '281' }), 'text')
})

test('the user prompt puts today, the record and the thread together', () => {
  const p = userPrompt({ today: '2026-10-10', season: 2026, coll: 'customers', record: customer, messages: thread, channel: 'text' })
  assert.ok(p.startsWith('Today: 2026-10-10. Season: 2026.'))
  assert.ok(p.includes('## Their record') && p.includes('## The conversation') && p.endsWith('Draft our next reply as a text. Follow the hard rules.'))
})

test('requests name exactly one person', () => {
  assert.deepEqual(draftRequest({ customerId: 'pat-sample' }).target, { field: 'customerId', coll: 'customers', id: 'pat-sample' })
  assert.deepEqual(draftRequest({ leadId: 'L1' }).target, { field: 'leadId', coll: 'leads', id: 'L1' })
  assert.deepEqual(draftRequest({ messageId: 'em-1-unmatched' }).target, { field: 'messageId', coll: 'messages', id: 'em-1-unmatched' })
  for (const bad of [null, {}, { customerId: 'a', leadId: 'b' }, { customerId: 'a/b' }, { customerId: '__x' }, { customerId: 7 }, { customerId: '' }]) {
    assert.equal(draftRequest(bad).problem?.[0], 'invalid-argument', JSON.stringify(bad))
  }
})

test('what the model answers is checked and tidied', () => {
  const good = parseDraft(JSON.stringify({ summary: 'Wants lights again', nextAction: 'schedule', channel: 'email', subject: 'Line one\nline two', reply: 'Hi Pat,\n\nGreat!  \n\nThank you', escalate: false, reason: '' }))
  assert.equal(good.problem, undefined)
  assert.equal(good.subject, 'Line one line two')
  assert.equal(good.nextActionLabel, NEXT_ACTIONS.schedule)
  assert.equal(good.escalate, false)
  assert.equal(good.reply, 'Hi Pat,\n\nGreat!\n\nThank you')
  // Unknown action or channel -> the safe choice; escalate action forces the flag.
  const odd = parseDraft({ summary: '', nextAction: 'refund', channel: 'fax', subject: 's', reply: 'r', escalate: false, reason: 'x'.repeat(500) })
  assert.equal(odd.nextAction, 'escalate')
  assert.equal(odd.escalate, true)
  assert.equal(odd.channel, 'email')
  assert.equal(odd.summary, 'Customer message')
  assert.equal(odd.reason.length, 300)
  assert.equal(parseDraft({ ...good, channel: 'text', subject: 'kept?' }).subject, '', 'texts have no subject')
  assert.ok(parseDraft('not json').problem)
  assert.ok(parseDraft({ summary: 'x', reply: '' }).problem)
  assert.ok(parseDraft(null).problem)
})

test('the daily limit counts for everyone; the gap is per person', () => {
  const day = '2026-10-10'
  let state
  for (let i = 0; i < DAILY_LIMIT; i++) {
    const r = draftAllowed(state, `s${i}@x.com`, 1_000_000 + i * 10_000, day)
    assert.equal(r.problem, undefined, `draft ${i}`)
    state = r.next
  }
  assert.equal(draftAllowed(state, 'new@x.com', 9_000_000, day).problem[0], 'resource-exhausted')
  assert.equal(draftAllowed(state, 'new@x.com', 9_000_000, '2026-10-11').next.count, 1, 'a new day starts over')
  const first = draftAllowed(undefined, 'a@x.com', 5_000_000, day).next
  assert.equal(draftAllowed(first, 'a@x.com', 5_000_500, day).problem[0], 'resource-exhausted')
  assert.equal(draftAllowed(first, 'b@x.com', 5_000_500, day).problem, undefined)
})

test('cost and fallback', () => {
  assert.equal(costOf({ input_tokens: 1_000_000, output_tokens: 0 }), 4)
  assert.equal(costOf({ input_tokens: 4000, output_tokens: 600 }), 0.028)
  assert.equal(costOf({}), 0)
  const fb = fallbackDraft('email', 'Pat', knowledge.business)
  assert.ok(fb.escalate && fb.nextAction === 'escalate' && fb.reply.startsWith('Hi Pat,') && fb.reply.includes('281-819-0163') && fb.subject)
  assert.equal(fallbackDraft('text', '', knowledge.business).subject, '')
})

test('Claude shows on Who’s on after it drafted, never as "on now"', () => {
  const now = Date.parse('2026-10-10T12:00:00Z')
  const rows = presenceRows([{ id: 'scott@example.com' }], [{ id: 'claude', lastSeen: now - 60_000, device: 'drafted a reply for katie' }], {}, now)
  const bot = rows.find((r) => r.email === 'claude')
  assert.equal(bot.name, 'Claude (assistant)')
  assert.equal(bot.state, 'away')
  assert.equal(bot.device, 'drafted a reply for katie')
  assert.equal(presenceRows([{ id: 'scott@example.com' }], [], {}, now).length, 1, 'no row until it has worked')
  assert.ok(ACTIONS.includes('ai-draft'))
})

test('targets: a list entry names whose thread, the activity entry and the email filing match', () => {
  assert.deepEqual(draftTarget({ id: 'm1', customerId: 'c1', leadId: 'l1' }), { customerId: 'c1' })
  assert.deepEqual(draftTarget({ id: 'request-l1', leadId: 'l1' }), { leadId: 'l1' })
  assert.deepEqual(draftTarget({ id: 'm9', unmatched: true }), { messageId: 'm9' })
  assert.deepEqual(activityTarget({ messageId: 'm9' }), { type: 'message', id: 'm9' })
  assert.deepEqual(emailTarget({ leadId: 'l1' }), { leadId: 'l1' })
  assert.equal(emailTarget({ messageId: 'm9' }), undefined)
})
