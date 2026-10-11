// Your schedule + Report a problem on /account/ (docs/specs/account-service.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NOTE_MAX, REPORT_ISSUES, SERVICE_DAYS, openMessage, openReport, openSummary, reportCall, reportEmail, reportPush, reportRequest, scheduleFor, scheduleText, shortDate,
} from '../functions/service.js'
import { SERVICE_ISSUES } from '../src/lib/customers.js'
import { countOpen, needsSomeone, recentIncoming, reportItems } from '../src/lib/staffAlerts.js'
import { describe } from '../src/lib/activity.js'

const customer = { id: 'pat-sample', fullName: 'Pat Sample', city: 'Pearland', phone: '(281) 555-0101', address: '123 Example St, Pearland, TX 77581' }

test('schedule line: day + date, week only, being scheduled, up, none, hidden', () => {
  const s = (over) => scheduleText({ season: '2026', installStatus: '', day: '', plannedDate: '', weekOf: '', timeframe: '', takedownStatus: '', ...over })
  assert.deepEqual(s({ installStatus: 'Install Scheduled', day: 'Thursday', plannedDate: 'Nov 13' }), { install: 'Thu Nov 13', takedown: 'in January', season: '2026' })
  assert.equal(s({ installStatus: 'Install Scheduled', weekOf: 'Nov 9-15' }).install, 'week of Nov 9-15')
  assert.equal(s({ installStatus: 'Install Scheduled' }).install, 'scheduled')
  assert.equal(s({ installStatus: 'Confirmed - Needs to be Scheduled', timeframe: 'first week of Nov' }).install, 'being scheduled (first week of Nov)')
  assert.equal(s({ installStatus: 'Confirmed - Needs to be Scheduled' }).install, 'being scheduled')
  assert.deepEqual(s({ installStatus: 'Install Completed', plannedDate: 'Nov 20', takedownStatus: 'Takedown Scheduled' }), { install: 'Up ✓', takedown: 'scheduled', season: '2026' })
  assert.equal(s({ installStatus: 'Install Completed', takedownStatus: 'Takedown Completed' }).takedown, 'done ✓')
  assert.equal(s({ installStatus: 'Install Completed', takedownStatus: 'No Takedown' }).takedown, 'not booked')
  assert.deepEqual(s({}), { none: true, season: '2026' })
  assert.deepEqual(s({ installStatus: 'Not Confirmed' }), { none: true, season: '2026' })
  assert.equal(s({ installStatus: 'Off Scheduler' }), null)
  assert.equal(s({ installStatus: 'Not Servicing' }), null)
  assert.equal(scheduleText(null), null)
})

test('the server hands over only the schedule fields, as short strings', () => {
  const seasons = { 2026: { installStatus: 'Install Scheduled', day: 'Thursday', plannedDate: 'Nov 13', weekOf: 'Nov 9-15', schedulingNotes: 'gate code 1234', install: { total: '$414.00' } } }
  assert.deepEqual(scheduleFor(seasons, '2026'), { season: '2026', installStatus: 'Install Scheduled', day: 'Thursday', plannedDate: 'Nov 13', weekOf: 'Nov 9-15', timeframe: '', takedownStatus: '' })
  assert.deepEqual(scheduleFor(seasons, '2027'), { season: '2027', installStatus: '', day: '', plannedDate: '', weekOf: '', timeframe: '', takedownStatus: '' })
  assert.equal(scheduleFor({ 2026: { plannedDate: 'x'.repeat(200) } }, 2026).plannedDate.length, 80)
  assert.deepEqual(scheduleText(scheduleFor(undefined, '2026')), { none: true, season: '2026' })
})

test('request check: the five choices map to staff issue words; junk is refused; the note is trimmed and capped', () => {
  for (const i of REPORT_ISSUES) {
    assert.ok(SERVICE_ISSUES.includes(i.issue), `${i.issue} is a staff issue`)
    assert.deepEqual(reportRequest({ problem: i.key }), { key: i.key, issue: i.issue, details: '' })
  }
  assert.deepEqual(reportRequest({ problem: 'section', note: '  Left side,\n\nsince last night  ' }), { key: 'section', issue: 'Section out', details: 'Left side, since last night' })
  assert.deepEqual(reportRequest({ problem: 'gfci' }).error, ['invalid-argument', 'Please pick what’s wrong.'])
  assert.deepEqual(reportRequest(undefined).error, ['invalid-argument', 'Please pick what’s wrong.'])
  assert.equal(reportRequest({ problem: 'other', note: 5 }).error[0], 'invalid-argument')
  assert.equal(reportRequest({ problem: 'other', note: 'a'.repeat(NOTE_MAX + 1) }).error[0], 'invalid-argument')
  assert.equal(reportRequest({ problem: 'other', note: 'a'.repeat(NOTE_MAX) }).details.length, NOTE_MAX)
})

test('the call written is what staff’s Log call writes, plus where it came from', () => {
  const call = reportCall({ customer, issue: 'Section out', details: 'Left side', email: 'pat@example.com', day: '2026-12-02' })
  assert.deepEqual(call, {
    customerId: 'pat-sample', customerName: 'Pat Sample', issue: 'Section out', details: 'Left side', received: '2026-12-02', status: 'Open',
    source: 'customer', reportedBy: 'pat@example.com', updatedBy: 'website',
  })
  assert.equal('details' in reportCall({ customer, issue: 'Timer', details: '', email: 'pat@example.com', day: '2026-12-02' }), false)
})

test('one open call per customer: Open or Scheduled count, Done and Cancelled don’t; the customer never sees staff notes', () => {
  const calls = [
    { id: 'a', issue: 'Timer', status: 'Done', received: '2026-11-20', notes: 'replaced' },
    { id: 'b', issue: 'Burned-out bulbs', status: 'Cancelled', received: '2026-11-25' },
  ]
  assert.equal(openReport(calls), null)
  assert.equal(openReport([]), null)
  const sched = { id: 'c', issue: 'Section out', status: 'Scheduled', received: '2026-12-01', notes: 'Thursday with Katie', details: 'Left side', source: 'customer' }
  const open = { id: 'd', issue: 'Lights down / damaged', status: 'Open', received: '2026-12-02', notes: 'storm', details: 'staff typed this' }
  assert.equal(openReport([...calls, sched, open]).id, 'd') // newest first
  assert.deepEqual(openSummary('c', sched), { id: 'c', issue: 'Section out', received: '2026-12-01', status: 'Scheduled', source: 'customer', details: 'Left side' })
  const d = openSummary('d', open)
  assert.equal(d.source, 'staff')
  assert.equal(d.details, '') // staff's details stay inside
  assert.ok(!('notes' in d))
  assert.equal(openMessage(d), 'We already have an open service call for you (Lights down / damaged, reported Dec 2) and we’re on it. Anything urgent? Call us at 281-819-0163.')
  assert.equal(shortDate('2026-01-09'), 'Jan 9')
  assert.equal(shortDate('soon'), 'soon')
  assert.equal(SERVICE_DAYS, 2)
})

test('staff alerts: the push reads like a new message and opens their account; the email names them and escapes HTML', () => {
  const now = Date.parse('2026-12-02T20:00:00Z')
  const call = reportCall({ customer, issue: 'Section out', details: 'Left side <b>dark</b>', email: 'pat@example.com', day: '2026-12-02' })
  assert.deepEqual(reportPush(call, 'pat-sample', now), {
    title: 'Problem report from Pat Sample', body: 'Section out · Left side <b>dark</b>', link: '#accounts/customer/pat-sample', tag: 'customer:pat-sample',
  })
  const mail = reportEmail(call, customer)
  assert.equal(mail.subject, 'Problem report: Pat Sample, Pearland: Section out')
  assert.equal(mail.replyTo, 'pat@example.com')
  assert.match(mail.text, /^Pat Sample reported a problem with their lights from their account\./)
  assert.match(mail.text, /Problem: Section out\nNote: Left side <b>dark<\/b>\nPhone: \(281\) 555-0101\nEmail: pat@example.com\nAddress: 123 Example St/)
  assert.match(mail.text, /leads\/#service$/)
  assert.ok(mail.html.includes('&lt;b&gt;dark&lt;/b&gt;') && !mail.html.includes('<b>dark'))
  assert.ok(mail.html.includes('href="tel:2815550101"'))
  assert.equal(reportEmail({ customerName: '', issue: 'Other' }).subject, 'Problem report: A customer: Other')
})

test('💬: customer reports become list entries that need someone while Open; staff-logged calls don’t', () => {
  const now = Date.parse('2026-12-02T20:00:00Z')
  const at = new Date(now - 45 * 60000).toISOString()
  const calls = [
    { id: 'c1', customerId: 'pat-sample', issue: 'Section out', details: 'Left side', status: 'Open', source: 'customer', reportedAt: at },
    { id: 'c2', customerId: 'x', issue: 'Timer', status: 'Open' }, // staff logged it
    { id: 'c3', customerId: 'y', issue: 'Timer', status: 'Scheduled', source: 'customer', reportedAt: at },
  ]
  const items = reportItems(calls)
  assert.deepEqual(items.map((m) => m.id), ['report-c1', 'report-c3'])
  assert.deepEqual(items[0], { id: 'report-c1', kind: 'report', direction: 'in', customerId: 'pat-sample', callId: 'c1', status: 'Open', at, syncedAt: now - 45 * 60000, text: 'Section out · Left side' })
  const list = recentIncoming(items, now)
  assert.equal(list.length, 2)
  assert.equal(needsSomeone(items[0], new Map()), true)
  assert.equal(needsSomeone(items[0], new Map([['report-c1', { by: 'k@x.co' }]])), false) // I've got it
  assert.equal(needsSomeone(items[1], new Map()), false) // Scheduled: someone's on it
  assert.equal(countOpen(list, new Map()), 1)
  assert.equal(reportItems(undefined).length, 0)
})

test('Recent activity: "Pat Sample reported a problem with their lights"', () => {
  const d = describe({ by: 'website', action: 'service-reported', target: { type: 'customer', id: 'pat-sample', name: 'Pat Sample' }, text: 'Section out' })
  assert.deepEqual(d, { actor: 'Pat Sample', did: 'reported a problem with their lights', name: '', detail: 'Section out', link: '#accounts/customer/pat-sample' })
})
