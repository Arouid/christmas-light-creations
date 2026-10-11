import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DAILY_LIMIT, MAX_CUSTOMERS, MAX_RANGE_DAYS, PROPOSAL_SCHEMA, customerRow, dayList, dayLoads, deadlineOf, defaultRange, dropFrom, moveTo,
  parseProposal, scheduleAllowed, schedulePrompt, scheduleRequest, scheduleSystemPrompt, unscheduled, weekOfFor, wishesFrom, writesFor,
} from '../functions/assistant/schedulePrompt.js'
import { bookedByDay, capacity } from '../functions/availability.js'
import { SECTIONS, TASKS } from '../src/leads/guide.js'

const season = 2026
const c = (id, s, extra = {}) => ({ id, fullName: id, seasons: { [season]: s }, ...extra })

test('unscheduled: confirmed this season, nothing planned, still serviced', () => {
  const list = [
    c('yes', { firstContact: 'Confirmed' }),
    c('dated', { firstContact: 'Confirmed', plannedDate: 'Oct 15' }),
    c('weeked', { firstContact: 'Confirmed', weekOf: 'Oct 11-17' }),
    c('undecided', { firstContact: 'Undecided' }),
    c('gone', { firstContact: 'Confirmed', installStatus: 'Not Servicing' }),
    c('done', { firstContact: 'Confirmed', installStatus: 'Install Completed' }),
    { id: 'lastyear', seasons: { 2025: { firstContact: 'Confirmed' } } },
  ]
  assert.deepEqual(unscheduled(list, season).map((x) => x.id), ['yes'])
})

test('requests: a sane range inside the season and a short list of ids', () => {
  const ok = scheduleRequest({ from: '2026-10-20', to: '2026-11-02', customerIds: ['a', 'b', 'a'] }, { season })
  assert.deepEqual(ok, { from: '2026-10-20', to: '2026-11-02', customerIds: ['a', 'b'] })
  const bad = [
    null, {}, { from: 'Oct 20', to: '2026-11-02', customerIds: ['a'] }, { from: '2026-11-02', to: '2026-10-20', customerIds: ['a'] },
    { from: '2026-10-20', to: '2026-12-10', customerIds: ['a'] }, // > MAX_RANGE_DAYS
    { from: '2026-10-01', to: '2026-10-20', customerIds: ['a'] }, // before the season
    { from: '2026-10-20', to: '2026-11-02', customerIds: [] }, { from: '2026-10-20', to: '2026-11-02', customerIds: [7] },
    { from: '2026-10-20', to: '2026-11-02', customerIds: Array.from({ length: MAX_CUSTOMERS + 1 }, (_, i) => `c${i}`) },
  ]
  for (const b of bad) assert.equal(scheduleRequest(b, { season }).problem?.[0], 'invalid-argument', JSON.stringify(b))
  assert.ok(MAX_RANGE_DAYS <= 42)
})

test('the daily limit counts for everyone; the gap is per person', () => {
  const day = '2026-10-20'
  let state
  for (let i = 0; i < DAILY_LIMIT; i++) {
    const r = scheduleAllowed(state, `s${i}@x.com`, 1_000_000 + i * 10_000, day)
    assert.ok(r.next, `plan ${i + 1}`)
    state = r.next
  }
  assert.equal(scheduleAllowed(state, 'new@x.com', 9_000_000, day).problem[0], 'resource-exhausted')
  assert.ok(scheduleAllowed(state, 'new@x.com', 9_000_000, '2026-10-21').next, 'a new day starts over')
  const t0 = 1_760_000_000_000
  const one = scheduleAllowed(undefined, 'a@x.com', t0, day).next
  assert.equal(scheduleAllowed(one, 'a@x.com', t0 + 1000, day).problem[0], 'resource-exhausted', 'too soon for the same person')
  assert.ok(scheduleAllowed(one, 'b@x.com', t0 + 1000, day).next, 'someone else is fine')
})

test('dayList: every day with weekday, capacity, booked and open', () => {
  const settings = { perDay: 2, workDays: [1, 2, 3, 4, 5, 6], overrides: { '2026-10-20': 5 } }
  const booked = bookedByDay({ customers: [c('x', { plannedDate: 'Oct 19' }), c('y', { plannedDate: 'Oct 19' }), c('z', { plannedDate: 'Oct 20' })], routes: [], season })
  const days = dayList({ from: '2026-10-18', to: '2026-10-20', booked, capacityOf: (d) => capacity(d, settings) })
  assert.deepEqual(days, [
    { day: '2026-10-18', weekday: 'Sunday', capacity: 0, booked: 0, open: 0 },
    { day: '2026-10-19', weekday: 'Monday', capacity: 2, booked: 2, open: 0 },
    { day: '2026-10-20', weekday: 'Tuesday', capacity: 5, booked: 1, open: 4 },
  ])
  assert.deepEqual(defaultRange('2026-10-01', season), { from: '2026-10-15', to: '2026-10-28' })
  assert.deepEqual(defaultRange('2026-12-10', season), { from: '2026-12-11', to: '2026-12-15' })
  assert.equal(deadlineOf([{ from: '10-15', to: '10-31', pct: 10 }]), '10-31')
  assert.equal(deadlineOf([{ from: '10-15', to: '10-24', pct: 15 }, { from: '10-25', to: '11-07', pct: 10 }]), '11-07')
  assert.equal(deadlineOf([]), null)
})

test('rows for the model: address, area, type, notes and incoming texts, never gate code, phone or email', () => {
  const cust = {
    fullName: 'Pat Sample', address: '123 Main St Pearland, TX 77581', city: 'Pearland', neighborhood: 'Shadow Creek', locationBlock: 'Pearland - West', installType: 'Early Install',
    phone: '(281) 555-0101', email: 'pat@example.com', gateCode: '4321',
    seasons: { 2026: { firstContact: 'Confirmed', installStatus: 'Confirmed - Needs to be Scheduled', timeframe: 'after the 20th', schedulingNotes: 'Dog in the yard, text first' } },
  }
  const msgs = [
    { direction: 'in', kind: 'text', at: '2026-10-08T10:00:00Z', text: 'Any weekday works but not Friday the 23rd' },
    { direction: 'out', kind: 'text', at: '2026-10-08T11:00:00Z', text: 'Got it, thanks' },
    { direction: 'in', kind: 'email', at: '2025-11-01T10:00:00Z', text: 'last year' },
  ]
  const row = customerRow('pat-sample', cust, season, msgs)
  assert.equal(row.installType, 'early')
  assert.equal(row.block, 'Pearland - West')
  assert.deepEqual(row.messages, ['2026-10-08 (text): Any weekday works but not Friday the 23rd'])
  const text = JSON.stringify(row)
  for (const secret of ['4321', '555-0101', 'pat@example.com']) assert.ok(!text.includes(secret), secret)
  assert.equal(wishesFrom(msgs, season).length, 1)
  const prompt = schedulePrompt({ today: '2026-10-10', season, deadline: '10-31', days: [{ day: '2026-10-20', weekday: 'Tuesday', capacity: 2, booked: 1, open: 1 }], rows: [row] })
  assert.match(prompt, /2026-10-20 Tuesday: 1 open \(capacity 2, 1 booked\)/)
  assert.match(prompt, /deadline: 2026-10-31/)
  assert.match(scheduleSystemPrompt(), /Never put more installs on a day than its open count/)
  assert.deepEqual(PROPOSAL_SCHEMA.required, ['explanation', 'assignments', 'unplaced'])
})

const days = [
  { day: '2026-10-19', weekday: 'Monday', capacity: 2, booked: 1, open: 1 },
  { day: '2026-10-20', weekday: 'Tuesday', capacity: 2, booked: 0, open: 2 },
]

test('parseProposal: checks days and room, drops strangers, accounts for everyone once', () => {
  const raw = JSON.stringify({
    explanation: 'Filled Monday then Tuesday.',
    assignments: [
      { customerId: 'a', day: '2026-10-19', reason: 'Asked for Monday' },
      { customerId: 'b', day: '2026-10-19', reason: 'Same street as a' }, // Monday has 1 open
      { customerId: 'c', day: '2026-11-30', reason: 'Late' }, // outside the range
      { customerId: 'ghost', day: '2026-10-20', reason: 'who?' },
      { customerId: 'a', day: '2026-10-20', reason: 'twice' },
    ],
    unplaced: [{ customerId: 'd', reason: 'Away until December' }],
  })
  const plan = parseProposal(raw, { days, ids: ['a', 'b', 'c', 'd', 'e'] })
  assert.deepEqual(plan.assignments, [{ customerId: 'a', day: '2026-10-19', reason: 'Asked for Monday' }])
  assert.deepEqual(plan.unplaced.map((u) => u.customerId), ['b', 'c', 'd', 'e'])
  assert.match(plan.unplaced[0].reason, /Over capacity on Oct 19/)
  assert.match(plan.unplaced[1].reason, /outside the range/)
  assert.match(plan.unplaced[3].reason, /left them out/)
  assert.equal(parseProposal('not json', { days, ids: ['a'] }).problem, 'The plan came back unreadable.')
  const long = parseProposal(JSON.stringify({ explanation: 'x'.repeat(5000), assignments: [{ customerId: 'a', day: '2026-10-20', reason: 'r'.repeat(900) }], unplaced: [] }), { days, ids: ['a'] })
  assert.equal(long.explanation.length, 1200)
  assert.equal(long.assignments[0].reason.length, 200)
})

test('adjusting: loads per day, move keeps one entry per person, drop goes to unplaced', () => {
  let plan = { explanation: '', assignments: [{ customerId: 'a', day: '2026-10-19', reason: 'r' }, { customerId: 'b', day: '2026-10-20', reason: 'r' }], unplaced: [{ customerId: 'c', reason: 'none' }] }
  assert.deepEqual(dayLoads(plan.assignments, days).map((d) => [d.day, d.total, d.over]), [['2026-10-19', 2, false], ['2026-10-20', 1, false]])
  plan = moveTo(plan, 'b', '2026-10-19')
  assert.equal(plan.assignments.filter((a) => a.customerId === 'b').length, 1)
  assert.ok(dayLoads(plan.assignments, days)[0].over, 'Monday is now over')
  plan = moveTo(plan, 'c', '2026-10-20')
  assert.equal(plan.unplaced.length, 0)
  assert.equal(plan.assignments.find((a) => a.customerId === 'c').reason, 'Moved by staff')
  plan = dropFrom(plan, 'a')
  assert.deepEqual(plan.unplaced, [{ customerId: 'a', reason: 'Dropped by staff' }])
  assert.equal(dropFrom(plan, 'a'), plan, 'dropping twice changes nothing')
})

test('writesFor: the sheet’s style for date, day, week and status', () => {
  const w = writesFor([{ customerId: 'a', day: '2026-10-15', reason: '' }], season)
  assert.deepEqual(w[0].fields, { 'seasons.2026.plannedDate': 'Oct 15', 'seasons.2026.day': 'Thursday', 'seasons.2026.weekOf': 'Oct 11-17', 'seasons.2026.installStatus': 'Install Scheduled' })
  assert.equal(Object.keys(writesFor([{ customerId: 'a', day: '2026-10-15' }], season, { setStatus: false })[0].fields).length, 3)
  assert.equal(weekOfFor('2026-12-02'), 'Nov 29-Dec 5')
  assert.equal(weekOfFor('2026-10-31'), 'Oct 25-31')
})

test('the guide tells staff how to plan with Claude', () => {
  assert.ok(TASKS.some(([title, body]) => /plan install/i.test(title) && body.includes('Plan with Claude')))
  assert.ok(SECTIONS.find((s) => s.id === 'season').items.some((i) => i.includes('Plan with Claude')))
})
