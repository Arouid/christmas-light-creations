import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ANSWER_SCHEMA, DAILY_LIMIT, MAX_HISTORY, MAX_ROWS, MAX_TOOL_CALLS, RECORD_TYPES, TOOLS, TOOL_NAMES, askAllowed, askMessages, askRequest, askSystemPrompt,
  customerRow, fallbackAnswer, invoiceRow, leadRow, messageRow, parseAnswer, routeRow, toolArgs,
} from '../functions/assistant/askPrompt.js'
import { makeTools } from '../functions/assistant/ask.js'
import { invoiceCents, invoiceState, paidInfo } from '../functions/invoices.js'
import { salesKnowledge } from '../src/assistant/lib/knowledge.js'
import { answerBlocks, historyFor, recordLabel, recordLink } from '../src/assistant/lib/records.js'
import { SECTIONS, TASKS } from '../src/leads/guide.js'
import { callError, serverSaid } from '../src/assistant/lib/errors.js'

const customer = {
  fullName: 'Pat Sample', address: '123 Main St', city: 'Pearland', phone: '(281) 555-0101', email: 'pat@example.com', since: '2023', gateCode: '4321', notes: 'Dog in the yard',
  seasons: { 2025: { installStatus: 'Install Completed', install: { rate: '$900', paid: 'Yes' } }, 2026: { installStatus: 'Install Scheduled', plannedDate: 'Oct 15', day: 'Thursday' } },
}

test('requests: a question of sensible length and a short clean history', () => {
  assert.deepEqual(askRequest({ question: ' Who owes us? ' }), { question: 'Who owes us?', history: [] })
  for (const bad of [null, {}, { question: '' }, { question: 7 }, { question: 'x'.repeat(1001) }, { question: 'q', history: 'no' }, { question: 'q', history: [{ role: 'system', text: 'x' }] }, { question: 'q', history: [{ role: 'user' }] }]) {
    assert.equal(askRequest(bad).problem?.[0], 'invalid-argument', JSON.stringify(bad))
  }
  const long = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `t${i}` }))
  const r = askRequest({ question: 'q', history: long })
  assert.equal(r.history.length, MAX_HISTORY)
  assert.equal(r.history[0].text, 't6', 'keeps the last turns')
  assert.equal(askRequest({ question: 'q', history: [{ role: 'user', text: 'x'.repeat(5000) }] }).history[0].text.length, 2000)
})

test('the daily limit counts for everyone; the gap is per person', () => {
  const day = '2026-10-10'
  let state
  for (let i = 0; i < DAILY_LIMIT; i++) {
    const r = askAllowed(state, `s${i}@x.com`, 1_000_000 + i * 10_000, day)
    assert.equal(r.problem, undefined, `question ${i}`)
    state = r.next
  }
  assert.equal(askAllowed(state, 'new@x.com', 9_000_000, day).problem[0], 'resource-exhausted')
  assert.equal(askAllowed(state, 'new@x.com', 9_000_000, '2026-10-11').next.count, 1)
  const first = askAllowed(undefined, 'a@x.com', 5_000_000, day).next
  assert.equal(askAllowed(first, 'a@x.com', 5_000_500, day).problem[0], 'resource-exhausted')
  assert.equal(askAllowed(first, 'b@x.com', 5_000_500, day).problem, undefined)
})

test('tool arguments are checked before any lookup', () => {
  assert.deepEqual(toolArgs('find_customers', { query: ' Main St ' }).args, { query: 'Main St' })
  assert.ok(toolArgs('find_customers', {}).problem)
  assert.deepEqual(toolArgs('get_customer', { id: 'pat-sample' }).args, { id: 'pat-sample' })
  for (const bad of [{ id: '' }, { id: 'a/b' }, { id: '__x' }, { id: 5 }, null]) assert.ok(toolArgs('get_customer', bad).problem, JSON.stringify(bad))
  assert.deepEqual(toolArgs('list_leads', {}).args, { status: '', days: 30 })
  assert.deepEqual(toolArgs('list_leads', { status: 'new', days: 7 }).args, { status: 'new', days: 7 })
  assert.ok(toolArgs('list_leads', { status: 'hot' }).problem && toolArgs('list_leads', { days: 0 }).problem && toolArgs('list_leads', { days: 2.5 }).problem)
  assert.deepEqual(toolArgs('list_invoices', { state: 'overdue' }).args, { state: 'overdue', customerId: '' })
  assert.ok(toolArgs('list_invoices', { state: 'late' }).problem && toolArgs('list_invoices', {}).problem && toolArgs('list_invoices', { state: 'open', customerId: 'a/b' }).problem)
  assert.deepEqual(toolArgs('routes_for_day', { day: 'today' }).args, { day: 'today' })
  assert.deepEqual(toolArgs('routes_for_day', { day: '2026-11-20' }).args, { day: '2026-11-20' })
  assert.ok(toolArgs('routes_for_day', { day: 'Thursday' }).problem && toolArgs('routes_for_day', {}).problem)
  assert.deepEqual(toolArgs('get_messages', { customerId: 'c1' }).args, { customerId: 'c1', limit: 15 })
  assert.deepEqual(toolArgs('get_messages', { leadId: 'L1', limit: 5 }).args, { leadId: 'L1', limit: 5 })
  assert.ok(toolArgs('get_messages', {}).problem && toolArgs('get_messages', { customerId: 'c1', limit: 99 }).problem)
  assert.deepEqual(toolArgs('system_status', { anything: 1 }).args, {})
  assert.ok(toolArgs('delete_customer', { id: 'x' }).problem.includes('Unknown tool'))
  assert.ok(toolArgs('find_customers', { query: 'x'.repeat(500) }).args.query.length <= 120)
})

test('the tool list is read-only, closed and complete', () => {
  assert.deepEqual(TOOL_NAMES, ['find_customers', 'get_customer', 'list_leads', 'list_invoices', 'routes_for_day', 'get_messages', 'system_status'])
  for (const t of TOOLS) {
    assert.equal(t.input_schema.additionalProperties, false, t.name)
    assert.ok(!/write|update|delete|send|set/.test(t.name), t.name)
    assert.ok(t.description.length > 40, t.name)
  }
  assert.ok(MAX_TOOL_CALLS === 8 && MAX_ROWS === 25 && DAILY_LIMIT === 100)
  // The implementation has exactly these tools and nothing more.
  const impl = makeTools({ db: null, today: '2026-10-10', season: 2026, helpers: {} })
  assert.deepEqual(Object.keys(impl).sort(), [...TOOL_NAMES].sort())
})

test('rows sent to the model carry no gate code or payment reference', () => {
  const short = customerRow('pat-sample', customer, 2026)
  assert.deepEqual(short, { id: 'pat-sample', name: 'Pat Sample', address: '123 Main St', city: 'Pearland', phone: '(281) 555-0101', email: 'pat@example.com', since: '2023', installStatus: 'Install Scheduled', planned: 'Thursday Oct 15' })
  const full = customerRow('pat-sample', customer, 2026, true)
  assert.equal(full.seasons.length, 2)
  assert.equal(full.seasons[0].installPrice, '$900')
  assert.equal(full.notes, 'Dog in the yard')
  assert.ok(!JSON.stringify(full).includes('4321'), 'gate code never goes to the model')
  const inv = { number: 'CLC-2026-0007', status: 'paid', customerId: 'pat-sample', customer: { name: 'Pat Sample' }, kind: 'install', season: '2026', dueDate: '2026-10-01', items: [{ cents: 41400 }],
    payment: { status: 'paid', captureId: 'SECRET-CAPTURE-ID', orderId: 'ORDER-9', source: 'venmo', paidAt: '2026-10-02T15:00:00Z', cents: 41400 } }
  const row = invoiceRow('tok', inv, invoiceState(inv, '2026-10-10'), invoiceCents(inv), paidInfo(inv))
  assert.deepEqual(row, { id: 'tok', number: 'CLC-2026-0007', state: 'paid', customer: 'Pat Sample', customerId: 'pat-sample', kind: 'install', season: '2026', total: '$414.00', dueDate: '2026-10-01', paidOn: '2026-10-02', paidHow: 'Venmo' })
  assert.ok(!JSON.stringify(row).includes('SECRET') && !JSON.stringify(row).includes('ORDER-9'))
  assert.equal(invoiceState({ status: 'open', dueDate: '2026-10-01' }, '2026-10-10'), 'overdue')
  const lead = leadRow('L1', { firstName: 'Sam', lastName: 'New', city: 'Alvin', status: 'new', createdAt: '2026-10-09T12:00:00Z', message: 'x'.repeat(300), designId: 'd1' })
  assert.equal(lead.name, 'Sam New'); assert.equal(lead.created, '2026-10-09'); assert.equal(lead.request.length, 200); assert.equal(lead.sentDesign, true)
  const route = routeRow('r1', { day: '2026-11-20', startTime: '08:00', stops: [{ name: 'A', address: '1 St', kind: 'install', status: 'todo', driveMin: 15, minutes: 135 }, { name: 'B', address: '2 St', kind: 'takedown', status: 'skipped', driveMin: 10, minutes: 25 }] })
  assert.equal(route.stops[0].eta, '8:15 AM'); assert.equal(route.stops[1].eta, '10:40 AM'); assert.equal(route.status, 'draft')
  assert.deepEqual(messageRow({ at: '2026-01-09T10:00:00Z', direction: 'in', kind: 'email', subject: 'Takedown?', text: 'When is it?' }), { date: '2026-01-09', direction: 'them', kind: 'email', subject: 'Takedown?', text: 'When is it?' })
})

test('the system prompt is fixed (cacheable) and carries the hard rules', () => {
  const p = askSystemPrompt(salesKnowledge())
  for (const must of ['Christmas Light Creations', 'read-only', 'Never invent', 'find_customers first', 'gate codes', 'draftFor', 'may be incomplete']) assert.ok(p.includes(must), must)
  assert.ok(!/Today:|\b2026-\d\d-\d\d\b/.test(p), 'no dates that would break caching')
  assert.deepEqual(ANSWER_SCHEMA.required, ['answer', 'records', 'draftFor'])
  assert.deepEqual(ANSWER_SCHEMA.properties.records.items.properties.type.enum, RECORD_TYPES)
})

test('messages: today first, history in order, roles alternating, user first', () => {
  const m = askMessages({ today: '2026-10-10', season: 2026, history: [], question: 'Who owes us?' })
  assert.deepEqual(m, [{ role: 'user', content: 'Today: 2026-10-10 (Central). Season: 2026.\n\nWho owes us?' }])
  const h = askMessages({ today: '2026-10-10', season: 2026, history: [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }], question: 'c' })
  assert.deepEqual(h.map((x) => x.role), ['user', 'assistant', 'user'])
  assert.ok(h[0].content.startsWith('Today:') && h[2].content === 'c')
  const odd = askMessages({ today: '2026-10-10', season: 2026, history: [{ role: 'assistant', text: 'b' }], question: 'c' })
  assert.equal(odd[0].role, 'user')
})

test('the answer is checked and tidied', () => {
  const good = parseAnswer(JSON.stringify({ answer: 'Two overdue.  \n- CLC-1\n- CLC-2', records: [{ type: 'invoice', id: 'tok1', label: 'CLC-1' }, { type: 'invoice', id: 'tok1', label: 'dup' }, { type: 'bank', id: 'x', label: 'no' }, { type: 'customer', id: 'a/b', label: 'bad id' }], draftFor: { customerId: 'pat-sample' } }))
  assert.equal(good.answer, 'Two overdue.\n- CLC-1\n- CLC-2')
  assert.deepEqual(good.records, [{ type: 'invoice', id: 'tok1', label: 'CLC-1' }])
  assert.deepEqual(good.draftFor, { customerId: 'pat-sample' })
  assert.equal(parseAnswer({ answer: 'x', records: [], draftFor: { leadId: 'L1' } }).draftFor.leadId, 'L1')
  assert.equal(parseAnswer({ answer: 'x', records: [], draftFor: { customerId: 'a/b' } }).draftFor, null)
  assert.equal(parseAnswer({ answer: 'x', records: 'nope', draftFor: 'nope' }).records.length, 0)
  assert.ok(parseAnswer('not json').problem && parseAnswer({ answer: '' }).problem && parseAnswer(null).problem)
  assert.equal(parseAnswer({ answer: 'y'.repeat(9000), records: [] }).answer.length, 4000)
  assert.ok(fallbackAnswer('it kept looking').answer.includes('it kept looking') && fallbackAnswer().records.length === 0)
})

test('browser: links, labels, history and answer blocks', () => {
  assert.equal(recordLink({ type: 'customer', id: 'pat sample' }), '#accounts/customer/pat%20sample')
  assert.equal(recordLink({ type: 'lead', id: 'L1' }), '#accounts/lead/L1')
  assert.equal(recordLink({ type: 'invoice', id: 'tok' }), '#invoices')
  assert.equal(recordLink({ type: 'route', id: 'r1' }), '#route-r1')
  assert.equal(recordLink({ type: 'bank', id: 'x' }), '')
  assert.equal(recordLabel({ type: 'invoice', id: 'tok', label: 'CLC-2026-0007' }), '🧾 CLC-2026-0007')
  const turns = [{ role: 'user', text: 'a' }, { role: 'error', text: 'oops' }, { role: 'assistant', answer: 'b', records: [] }, { role: 'user', text: 'c' }]
  assert.deepEqual(historyFor(turns), [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'user', text: 'c' }])
  assert.equal(historyFor(Array.from({ length: 20 }, () => ({ role: 'user', text: 'x' }))).length, 6)
  assert.deepEqual(answerBlocks('Two overdue:\n- CLC-1, $414\n- CLC-2, $150\n\nText them.'), [{ type: 'p', text: 'Two overdue:' }, { type: 'list', items: ['CLC-1, $414', 'CLC-2, $150'] }, { type: 'p', text: 'Text them.' }])
  assert.deepEqual(answerBlocks(''), [])
})

test('a failed call shows the server’s sentence, never a code word', () => {
  for (const code of ['internal', 'internal [0]', 'not-found', 'deadline-exceeded', 'INTERNAL', '', undefined, 'unavailable [503]']) assert.equal(serverSaid(code), '', String(code))
  for (const said of ['Staff only.', 'Ask a question', 'Please sign in again.', 'Ask Claude is turned off (⚙ Settings → Ask Claude).', 'That’s 100 questions today, the daily limit. Try again tomorrow, or look it up in the app.']) assert.equal(serverSaid(said), said)
  assert.equal(callError(new Error('internal [0]'), 'Couldn’t reach the assistant.').message, 'Couldn’t reach the assistant.')
  assert.equal(callError(new Error('Staff only.'), 'x').message, 'Staff only.')
  assert.equal(callError(undefined, 'x').message, 'x')
})

test('the guide tells staff about Ask Claude and the switch', () => {
  assert.ok(TASKS.some(([t, how]) => t.includes('Ask Claude') && how.includes('🤖') && how.includes('read-only')))
  assert.ok(SECTIONS.find((s) => s.id === 'settings').items.some((i) => i.includes('Ask Claude')))
})
