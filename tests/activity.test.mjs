import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIONS, collected, counters, describe, firstInWindow, handlers, phoneDirectory, recentEntries, routesToday,
  seasonProgress, staffName, syncLight, targetLink, whoByPhone,
} from '../src/lib/activity.js'

const now = Date.parse('2026-10-10T15:00:00Z')
const MIN = 60 * 1000
const DAY = 24 * 60 * MIN
const ts = (ms) => ({ toMillis: () => ms })

const customers = [
  { id: 'sample-customer', fullName: 'Sample Customer', phone: '281-555-0101 / (832) 555-0102' },
  { id: 'example-family', fullName: 'Example Family', phone: '(281) 555-0142' },
]
const leads = [
  { id: 'L1', firstName: 'Pat', lastName: 'New', phone: '281.555.0177' },
  { id: 'L2', firstName: 'Was', lastName: 'Lead', phone: '281 555 0142', customerId: 'example-family' },
]

test('phone → person: customers first, several numbers per box, leads, unknown, our own number', () => {
  const dir = phoneDirectory(customers, leads)
  assert.deepEqual(whoByPhone(dir, 'tel:+18325550102'), { type: 'customer', id: 'sample-customer', name: 'Sample Customer' })
  assert.deepEqual(whoByPhone(dir, '2815550142'), { type: 'customer', id: 'example-family', name: 'Example Family' })
  assert.deepEqual(whoByPhone(dir, '+1 (281) 555-0177'), { type: 'lead', id: 'L1', name: 'Pat New' })
  assert.deepEqual(whoByPhone(dir, '2815550166'), { type: 'phone', id: '2815550166', name: '(281) 555-0166' })
  assert.equal(whoByPhone(dir, 'tel:281-819-0163'), null)
  assert.equal(whoByPhone(dir, '555-0101'), null)
})

test('staff names: the staff list’s name, else the first part of the email', () => {
  assert.equal(staffName('katie.smith@gmail.com'), 'Katie')
  assert.equal(staffName('Boss@Example.com', { 'boss@example.com': 'Scott' }), 'Scott')
  assert.equal(staffName('website'), 'Website')
  assert.equal(staffName(''), 'Someone')
})

test('entries read as sentences and link to the person', () => {
  const at = ts(now)
  const c = { type: 'customer', id: 'sample-customer', name: 'Sample Customer' }
  assert.deepEqual(describe({ action: 'email', by: 'katie@x.com', at, target: c, text: 'Your 2026 install' }),
    { actor: 'Katie', did: 'emailed', name: 'Sample Customer', detail: 'Your 2026 install', link: '#accounts/customer/sample-customer' })
  assert.deepEqual(describe({ action: 'lead-status', by: 'scott@x.com', at, target: { type: 'lead', id: 'L1', name: 'Pat New' }, text: 'Called' }),
    { actor: 'Scott', did: 'marked', name: 'Pat New', detail: '→ Called', link: '#accounts/lead/L1' })
  assert.deepEqual(describe({ action: 'proposal-signed', by: 'website', at, target: c, text: '' }),
    { actor: 'Sample Customer', did: 'signed their proposal', name: '', detail: '', link: '#accounts/customer/sample-customer' })
  assert.equal(describe({ action: 'call', by: 'a@x.com', target: { type: 'phone', id: '2815550166' } }).name, '(281) 555-0166')
  assert.equal(describe({ action: 'call', by: 'a@x.com', target: { type: 'phone', id: '2815550166' } }).link, '')
  for (const a of ACTIONS) assert.ok(describe({ action: a, by: 'a@x.com', target: c }).did, a)
})

test('message links: an estimate request opens the lead; a message opens its person; else the list', () => {
  const messages = [{ id: 'gv-1', customerId: 'sample-customer' }, { id: 'gv-2', unmatched: true }]
  assert.equal(targetLink({ type: 'message', id: 'request-L1' }), '#accounts/lead/L1')
  assert.equal(targetLink({ type: 'message', id: 'gv-1' }, messages), '#accounts/customer/sample-customer')
  assert.equal(targetLink({ type: 'message', id: 'gv-2' }, messages), '#leads')
  assert.equal(targetLink({ type: 'message', id: 'gone' }, messages), '#messages')
  assert.equal(targetLink({ type: 'past', id: 'old-x' }), '#accounts/past/old-x')
})

test('I’ve got it: the newest one wins, earlier people are remembered', () => {
  const h = handlers([
    { action: 'handling', by: 'katie@x.com', at: ts(now - 10 * MIN), target: { type: 'message', id: 'gv-1' } },
    { action: 'handling', by: 'scott@x.com', at: ts(now - 2 * MIN), target: { type: 'message', id: 'gv-1' } },
    { action: 'handling', by: 'scott@x.com', at: ts(now - 20 * MIN), target: { type: 'message', id: 'gv-1' } },
    { action: 'email', by: 'katie@x.com', at: ts(now), target: { type: 'message', id: 'gv-2' } },
    { action: 'handling', by: 'katie@x.com', at: ts(now - MIN), target: { type: 'message', id: 'request-L1' } },
  ])
  assert.deepEqual(h.get('gv-1'), { by: 'scott@x.com', at: now - 2 * MIN, before: ['katie@x.com'] })
  assert.equal(h.has('gv-2'), false)
  assert.equal(h.get('request-L1').by, 'katie@x.com')
})

test('repeats within 2 minutes are logged once; the list keeps 7 days, newest first', () => {
  const seen = new Map()
  assert.equal(firstInWindow(seen, 'call|2815550166', now), true)
  assert.equal(firstInWindow(seen, 'call|2815550166', now + MIN), false)
  assert.equal(firstInWindow(seen, 'text|2815550166', now + MIN), true)
  assert.equal(firstInWindow(seen, 'call|2815550166', now + 3 * MIN), true)
  const list = recentEntries([{ id: 'old', at: ts(now - 8 * DAY) }, { id: 'a', at: ts(now - MIN) }, { id: 'b', at: ts(now - 2 * MIN) }, { id: 'pending', at: null }], now)
  assert.deepEqual(list.map((e) => e.id), ['pending', 'a', 'b'])
})

test('season progress: install steps, takedowns after install, out-of-service not counted', () => {
  const cs = [
    { seasons: { 2026: { installStatus: '' } } },
    { seasons: { 2026: { installStatus: 'Not Confirmed' } } },
    { seasons: { 2026: { installStatus: 'Confirmed - Needs to be Scheduled' } } },
    { seasons: { 2026: { installStatus: 'Install Scheduled' } } },
    { seasons: { 2026: { installStatus: 'Install Completed', takedownStatus: 'Takedown Scheduled' } } },
    { seasons: { 2026: { installStatus: 'Install Completed' } } },
    { seasons: { 2026: { installStatus: 'Install Completed', takedownStatus: 'Takedown Completed' } } },
    { seasons: { 2026: { installStatus: 'Not Servicing' } } },
    { seasons: { 2025: { installStatus: 'Install Completed' } } },
    {},
  ]
  assert.deepEqual(seasonProgress(cs, '2026'), {
    install: { notConfirmed: 2, confirmed: 1, scheduled: 1, installed: 3 },
    takedown: { waiting: 1, scheduled: 1, done: 1, none: 0 }, total: 7,
  })
})

test('money collected: season billing marked Paid = Yes, any $ style', () => {
  const cs = [
    { seasons: { 2026: { install: { total: '$1,234.50', paid: 'Yes' }, takedown: { rate: '150', paid: 'yes ' } } } },
    { seasons: { 2026: { install: { total: '$414', paid: 'No' }, takedown: { rate: '$100', paid: 'No Takedown Cost' } } } },
    { seasons: { 2026: { install: { total: '', paid: 'Yes' } }, 2025: { install: { total: '$500', paid: 'Yes' } } } },
  ]
  assert.equal(collected(cs, '2026'), 1384.5)
  assert.equal(collected(cs, '2025'), 500)
  assert.equal(collected([], '2026'), 0)
})

test('counters: new requests, unpaid and overdue invoices, open service calls', () => {
  const inv = (status, cents, dueDate) => ({ status, dueDate, items: [{ cents }] })
  const c = counters({
    leads: [{ status: 'new' }, { status: 'called' }, {}, { status: 'spam' }],
    invoices: [inv('open', 10000, '2026-10-20'), inv('open', 5000, '2026-10-01'), inv('paid', 9999, '2026-10-01'), inv('draft', 1, '')],
    calls: [{ status: 'Open' }, { status: 'Scheduled' }, { status: 'Done' }],
    today: '2026-10-10',
  })
  assert.deepEqual(c, { openRequests: 2, unpaidCents: 15000, unpaid: 2, overdue: 1, openCalls: 2 })
})

test('today’s routes with done/left, and the next route day', () => {
  const r = routesToday([
    { id: 'r1', day: '2026-10-10', name: 'Crew 2', status: 'sent', stops: [{ status: 'done' }, { status: 'done' }, { status: 'skipped' }, { status: 'todo' }] },
    { id: 'r2', day: '2026-10-10', stops: [] },
    { id: 'r3', day: '2026-10-14' }, { id: 'r4', day: '2026-10-12' }, { id: 'r5', day: '2026-10-01' },
  ], '2026-10-10')
  assert.deepEqual(r.routes, [
    { id: 'r1', name: 'Crew 2', status: 'sent', total: 4, done: 2, skipped: 1 },
    { id: 'r2', name: 'Route', status: 'draft', total: 0, done: 0, skipped: 0 },
  ])
  assert.equal(r.next, '2026-10-12')
  assert.equal(routesToday([], '2026-10-10').next, null)
})

test('sync light: green within 3 days, amber after or never', () => {
  assert.equal(syncLight(now - DAY, now), 'green')
  assert.equal(syncLight(now - 4 * DAY, now), 'amber')
  assert.equal(syncLight(0, now), 'amber')
})
