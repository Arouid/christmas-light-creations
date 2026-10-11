import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DAILY_LIMIT } from '../functions/staffEmail.js'
import {
  MAX_LIST, PER_RUN, STUCK_MS, atNight, cancelIds, cancelOutcome, centralParts, centralToMs, claimOutcome, dayRoomProblem, dueOnes,
  editRequest, groupScheduled, markPath, quickPicks, scheduledEmailRequest, scheduledDoc, sendAtProblem, stuckOnes, whenText,
} from '../functions/scheduledEmail.js'

// Sample people (no real data).
const customer = { fullName: 'Pat Sample', email: 'Pat.Sample@Example.com, pat2@example.com', otherEmails: ['old.pat@example.org'] }
const email = { to: 'pat.sample@example.com', subject: 'Your 2026 Christmas lights', text: 'Hi Pat,\n\nBooking now.', customerId: 'pat-sample', template: 'reinstall' }
const NOW = Date.parse('2026-10-10T20:00:00Z') // Sat Oct 10, 3:00 pm Central
const MIN = 60_000
const H = 60 * MIN

test('Central time: 8 am is 13:00 UTC in summer and 14:00 UTC in winter', () => {
  assert.equal(new Date(centralToMs('2026-10-14', '08:00')).toISOString(), '2026-10-14T13:00:00.000Z')
  assert.equal(new Date(centralToMs('2026-12-01', '08:00')).toISOString(), '2026-12-01T14:00:00.000Z')
  // The days of the changes (Mar 8 and Nov 1, 2026): 8 am is still 8 am.
  assert.equal(new Date(centralToMs('2026-03-08', '08:00')).toISOString(), '2026-03-08T13:00:00.000Z')
  assert.equal(new Date(centralToMs('2026-11-01', '08:00')).toISOString(), '2026-11-01T14:00:00.000Z')
  // 2:30 am doesn't exist on spring-forward day: an hour later (3:30 am CDT).
  const missing = centralToMs('2026-03-08', '02:30')
  assert.equal(new Date(missing).toISOString(), '2026-03-08T08:30:00.000Z')
  assert.equal(centralParts(missing).time, '03:30')
  // 1:30 am happens twice on fall-back day: the first one (CDT).
  assert.equal(new Date(centralToMs('2026-11-01', '01:30')).toISOString(), '2026-11-01T06:30:00.000Z')
  // Round trip, and nonsense.
  for (const [day, time] of [['2026-01-31', '23:59'], ['2026-07-04', '00:00'], ['2027-02-28', '13:05']]) {
    assert.deepEqual([centralParts(centralToMs(day, time)).day, centralParts(centralToMs(day, time)).time], [day, time])
  }
  assert.ok(Number.isNaN(centralToMs('', '08:00')))
  assert.ok(Number.isNaN(centralToMs('2026-10-14', 'soon')))
})

test('quick picks: tomorrow 8 am and 1 pm, and next Monday 8 am unless tomorrow is Monday', () => {
  const at = (iso) => new Date(iso).toISOString()
  // Saturday afternoon: tomorrow is Sunday; Monday is the 12th.
  const sat = quickPicks(NOW)
  assert.deepEqual(sat.map((p) => p.label), ['Tomorrow 8:00 am', 'Tomorrow 1:00 pm', 'Monday 8:00 am'])
  assert.deepEqual(sat.map((p) => at(p.at)), ['2026-10-11T13:00:00.000Z', '2026-10-11T18:00:00.000Z', '2026-10-12T13:00:00.000Z'])
  // Sunday evening: tomorrow is Monday, so no separate Monday pick.
  const sun = quickPicks(Date.parse('2026-10-12T02:00:00Z')) // Sun Oct 11, 9 pm Central
  assert.deepEqual(sun.map((p) => p.label), ['Tomorrow 8:00 am', 'Tomorrow 1:00 pm'])
  assert.equal(at(sun[0].at), '2026-10-12T13:00:00.000Z')
  // Monday 11:30 pm Central (already Tuesday in UTC): tomorrow is Tuesday, Monday is a week away.
  const mon = quickPicks(Date.parse('2026-10-13T04:30:00Z'))
  assert.deepEqual(mon.map((p) => at(p.at)), ['2026-10-13T13:00:00.000Z', '2026-10-13T18:00:00.000Z', '2026-10-19T13:00:00.000Z'])
  // Friday: Monday is three days on; across the November change it's in CST.
  const fri = quickPicks(Date.parse('2026-10-30T17:00:00Z'))
  assert.equal(at(fri[2].at), '2026-11-02T14:00:00.000Z')
})

test('when text and night note', () => {
  assert.equal(whenText(centralToMs('2026-10-10', '17:00'), NOW), 'Today 5:00 pm')
  assert.equal(whenText(centralToMs('2026-10-11', '08:00'), NOW), 'Tomorrow 8:00 am')
  assert.equal(whenText(centralToMs('2026-10-14', '13:30'), NOW), 'Wed, Oct 14, 1:30 pm')
  assert.equal(whenText(centralToMs('2027-01-04', '08:00'), NOW), 'Mon, Jan 4, 2027, 8:00 am')
  assert.equal(atNight(centralToMs('2026-10-14', '06:59')), true)
  assert.equal(atNight(centralToMs('2026-10-14', '07:00')), false)
  assert.equal(atNight(centralToMs('2026-10-14', '20:59')), false)
  assert.equal(atNight(centralToMs('2026-10-14', '21:00')), true)
})

test('the time must be at least a minute ahead and within 60 days', () => {
  assert.equal(sendAtProblem(NaN, NOW), 'Pick a date and time.')
  assert.match(sendAtProblem(NOW - H, NOW), /passed/)
  assert.match(sendAtProblem(NOW + 30_000, NOW), /passed/)
  assert.equal(sendAtProblem(NOW + 2 * MIN, NOW), null)
  assert.equal(sendAtProblem(NOW + 60 * 24 * H, NOW), null)
  assert.match(sendAtProblem(NOW + 60 * 24 * H + MIN, NOW), /60 days/)
})

test('schedule request: same checks as Send, plus time, list size and what to note', () => {
  const sendAt = NOW + 18 * H
  const ok = scheduledEmailRequest({ sendAt, emails: [email] }, NOW)
  assert.equal(ok.problem, undefined)
  assert.equal(ok.sendAt, sendAt)
  assert.equal(ok.batch, '')
  assert.deepEqual(ok.emails[0].target, { field: 'customerId', coll: 'customers', id: 'pat-sample' })

  const refused = (data) => scheduledEmailRequest({ sendAt, emails: [email], ...data }, NOW).problem
  assert.equal(scheduledEmailRequest(null, NOW).problem[0], 'invalid-argument')
  assert.match(refused({ sendAt: NOW - MIN })[1], /passed/)
  assert.match(refused({ emails: [] })[1], /Nothing/)
  assert.match(refused({ emails: Array(MAX_LIST + 1).fill(email) })[1], /At most 100/)
  assert.match(refused({ batch: 'a/b' })[1], /list id/)
  // One bad email in a list: refused, saying which.
  const list = refused({ emails: [email, { ...email, to: 'nope' }, email] })
  assert.deepEqual(list, ['invalid-argument', 'Email 2: That email address doesn’t look right'])
  assert.deepEqual(refused({ emails: [{ ...email, subject: 'a\nb' }] }), ['invalid-argument', 'The subject must be one line'])

  // Mark when sent: season + emailsSent (needs a template) or reviewAsked, customers / past requests only.
  const mark = (m, over = {}) => scheduledEmailRequest({ sendAt, emails: [{ ...email, ...over, mark: m }] }, NOW)
  assert.deepEqual(mark({ season: '2026', field: 'emailsSent' }).emails[0].mark, { season: '2026', field: 'emailsSent' })
  assert.deepEqual(mark({ season: 2026, field: 'reviewAsked' }).emails[0].mark, { season: '2026', field: 'reviewAsked' })
  assert.deepEqual(mark({ season: '2026', field: 'emailsSent' }, { customerId: undefined, pastRequestId: 'p1' }).emails[0].mark, { season: '2026', field: 'emailsSent' })
  assert.ok(mark({ season: '2026', field: 'emailsSent' }, { customerId: undefined, leadId: 'l1' }).problem) // leads: rules limit their fields
  assert.ok(mark({ season: '26', field: 'emailsSent' }).problem)
  assert.ok(mark({ season: '2026', field: 'notes' }).problem)
  assert.ok(mark({ season: '2026', field: 'emailsSent' }, { template: 'a.b' }).problem)
  assert.equal(markPath({ season: '2026', field: 'emailsSent' }, 'reinstall'), 'seasons.2026.emailsSent.reinstall')
  assert.equal(markPath({ season: '2026', field: 'reviewAsked' }, 'review'), 'seasons.2026.reviewAsked')
})

test('room per day: waiting ones on that Central day plus the new ones stay within the daily limit', () => {
  const tue8 = centralToMs('2026-10-13', '08:00')
  const waiting = [
    ...Array(DAILY_LIMIT - 5).fill({ status: 'scheduled', sendAt: tue8 }),
    { status: 'scheduled', sendAt: centralToMs('2026-10-13', '23:30') }, // same Central day, next day in UTC
    { status: 'failed', sendAt: tue8 }, // not waiting
    { status: 'scheduled', sendAt: centralToMs('2026-10-14', '00:30') }, // next day
  ]
  assert.equal(dayRoomProblem(waiting, tue8, 4), null)
  const full = dayRoomProblem(waiting, tue8, 5)
  assert.equal(full[0], 'resource-exhausted')
  assert.match(full[1], /Tue, Oct 13 already has 296 emails scheduled .*4 more fit/)
  assert.equal(dayRoomProblem(waiting, centralToMs('2026-10-14', '08:00'), 299), null)
})

test('the scheduled doc: who, where it shows, list and mark', () => {
  const req = scheduledEmailRequest({ sendAt: NOW + H, emails: [{ ...email, customerId: undefined, leadId: 'lead1' }] }, NOW).emails[0]
  const d = scheduledDoc({ req, record: { firstName: 'Pat', lastName: 'Lead', customerId: 'pat-sample' }, sendAt: NOW + H, staff: 'boss@example.com', batch: 'b1' })
  assert.equal(d.status, 'scheduled')
  assert.equal(d.open, true)
  assert.deepEqual(d.target, { field: 'leadId', id: 'lead1' })
  assert.equal(d.customerId, 'pat-sample') // a lead made a customer shows on the customer
  assert.equal(d.name, 'Pat Lead')
  assert.equal(d.by, 'boss@example.com')
  assert.equal(d.batch, 'b1')
  assert.equal('mark' in d, false)
})

const waitingDoc = (over = {}) => ({ ...scheduledDoc({ req: scheduledEmailRequest({ sendAt: NOW + H, emails: [email] }, NOW).emails[0], record: customer, sendAt: NOW + H, staff: 'boss@example.com' }), ...over })

test('claim: only a waiting email whose time has come goes, and it counts in the daily limit', () => {
  const due = waitingDoc({ sendAt: NOW - MIN })
  const gate = { day: '2026-10-10', count: 7, last: { 'katie@example.com': 1 } }
  const go = claimOutcome({ doc: due, record: customer, gate, now: NOW, day: '2026-10-10' })
  assert.equal(go.outcome, 'go')
  assert.equal(go.req.to, 'pat.sample@example.com')
  assert.deepEqual(go.gate, { day: '2026-10-10', count: 8, last: { 'katie@example.com': 1 } })
  // A new Central day starts at 1.
  assert.deepEqual(claimOutcome({ doc: due, record: customer, gate, now: NOW, day: '2026-10-11' }).gate, { day: '2026-10-11', count: 1, last: {} })

  for (const doc of [null, waitingDoc(), { ...due, status: 'cancelled' }, { ...due, status: 'sending' }, { ...due, status: 'sent' }, { ...due, status: 'failed' }]) {
    assert.equal(claimOutcome({ doc, record: customer, gate, now: NOW, day: '2026-10-10' }).outcome, 'skip')
  }
  const fail = (over) => claimOutcome({ doc: due, record: customer, gate, now: NOW, day: '2026-10-10', ...over })
  assert.match(fail({ record: null }).error, /record is gone/)
  assert.match(fail({ record: { ...customer, email: 'pat2@example.com', otherEmails: [] } }).error, /isn’t on their record/)
  assert.match(fail({ gate: { day: '2026-10-10', count: DAILY_LIMIT } }).error, /daily limit/)
  assert.equal(fail({ gate: { day: '2026-10-09', count: DAILY_LIMIT } }).outcome, 'go')
  assert.equal(fail({ doc: { ...due, subject: '' } }).outcome, 'fail')
  // Another address on the record ("Also:" emails count).
  assert.equal(fail({ doc: { ...due, to: 'old.pat@example.org' } }).outcome, 'go')
})

test('due, stuck and grouping', () => {
  const docs = [
    { id: 'c', status: 'scheduled', sendAt: NOW - MIN },
    { id: 'a', status: 'scheduled', sendAt: NOW - H },
    { id: 'b', status: 'scheduled', sendAt: NOW + MIN },
    { id: 'd', status: 'failed', sendAt: NOW - H },
    { id: 'e', status: 'sending', sendAt: NOW - H, claimedAt: NOW - STUCK_MS - 1 },
    { id: 'f', status: 'sending', sendAt: NOW - H, claimedAt: NOW - STUCK_MS + 1000 },
    { id: 'g', status: 'sending', sendAt: NOW - H },
  ]
  assert.deepEqual(dueOnes(docs, NOW).map((d) => d.id), ['a', 'c'])
  assert.equal(dueOnes(Array.from({ length: PER_RUN + 5 }, (_, i) => ({ id: `x${i}`, status: 'scheduled', sendAt: NOW - i })), NOW).length, PER_RUN)
  assert.deepEqual(stuckOnes(docs, NOW).map((d) => d.id), ['e', 'g'])
  // Firestore Timestamps work too.
  assert.deepEqual(dueOnes([{ id: 't', status: 'scheduled', sendAt: { toMillis: () => NOW - 1 } }], NOW).map((d) => d.id), ['t'])

  const groups = groupScheduled([
    { id: '1', batch: 'L', name: 'Zed', sendAt: NOW + 2 * H, status: 'scheduled' },
    { id: '2', name: 'Solo', sendAt: NOW + 3 * H, status: 'failed' },
    { id: '3', batch: 'L', name: 'Amy', sendAt: NOW + 2 * H, status: 'scheduled' },
    { id: '4', name: 'First', sendAt: NOW + H, status: 'scheduled' },
  ])
  assert.deepEqual(groups.map((g) => g.items.map((x) => x.name)), [['First'], ['Amy', 'Zed'], ['Solo']])
  assert.equal(groups[2].failed, 1)
})

test('edit and cancel: only before it goes', () => {
  const doc = waitingDoc()
  const edit = editRequest(doc, { sendAt: NOW + 2 * H, subject: ' New subject ', text: 'New text\r\n' }, NOW)
  assert.deepEqual(edit.update, { sendAt: NOW + 2 * H, subject: 'New subject', text: 'New text', status: 'scheduled', open: true })
  // A failed one can be given a new time (it waits again).
  assert.equal(editRequest({ ...doc, status: 'failed' }, { sendAt: NOW + 2 * H, subject: 'S', text: 'T' }, NOW).update.status, 'scheduled')
  assert.match(editRequest({ ...doc, status: 'sending' }, { sendAt: NOW + 2 * H, subject: 'S', text: 'T' }, NOW).problem[1], /Too late/)
  assert.match(editRequest({ ...doc, status: 'sent' }, { sendAt: NOW + 2 * H, subject: 'S', text: 'T' }, NOW).problem[1], /already went out/)
  assert.equal(editRequest(null, {}, NOW).problem[0], 'not-found')
  assert.match(editRequest(doc, { sendAt: NOW - H, subject: 'S', text: 'T' }, NOW).problem[1], /passed/)
  assert.equal(editRequest(doc, { sendAt: NOW + H, subject: '', text: 'T' }, NOW).problem[0], 'invalid-argument')

  assert.equal(cancelOutcome(doc), 'cancel')
  assert.equal(cancelOutcome({ ...doc, status: 'failed' }), 'cancel')
  assert.equal(cancelOutcome({ ...doc, status: 'sending' }), 'too-late')
  assert.equal(cancelOutcome({ ...doc, status: 'sent' }), 'too-late')
  assert.equal(cancelOutcome({ ...doc, status: 'cancelled' }), 'gone')
  assert.equal(cancelOutcome(undefined), 'gone')
  assert.deepEqual(cancelIds({ ids: ['a', 'a', 'b'] }), { ids: ['a', 'b'] })
  for (const ids of [[], ['a/b'], [7], Array(MAX_LIST + 1).fill(0).map((_, i) => `x${i}`)]) assert.ok(cancelIds({ ids }).problem)
})
