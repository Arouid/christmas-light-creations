import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAIL_GAP, dailyReport, incidentEmail, missedLeadAlerts, shouldMail, syncStale } from '../functions/health.js'

const now = Date.parse('2026-10-12T12:30:00Z')
const MIN = 60 * 1000
const HOUR = 60 * MIN

test('request alerts that never went out are caught (with 15 minutes grace, last day only, not spam)', () => {
  const leads = [
    { firstName: 'Sent', createdAt: new Date(now - 2 * HOUR), alertSentAt: new Date(now - 2 * HOUR) },
    { firstName: 'Missed', createdAt: new Date(now - 2 * HOUR) },
    { firstName: 'Too new', createdAt: new Date(now - 5 * MIN) },
    { firstName: 'Old', createdAt: new Date(now - 30 * HOUR) },
    { firstName: 'Junk', createdAt: new Date(now - 2 * HOUR), status: 'spam' },
    { firstName: 'Firestore time', createdAt: { toMillis: () => now - 3 * HOUR } },
  ]
  assert.deepEqual(missedLeadAlerts(leads, now).map((l) => l.firstName), ['Missed', 'Firestore time'])
})

test('sync counts as stopped after 3 days with nothing, or if it never ran', () => {
  assert.equal(syncStale(new Date(now - 2 * 24 * HOUR), now), false)
  assert.equal(syncStale(new Date(now - 4 * 24 * HOUR), now), true)
  assert.equal(syncStale(null, now), true)
})

test('at most one email per kind of problem per hour', () => {
  assert.equal(shouldMail(undefined, now), true)
  assert.equal(shouldMail(now - 10 * MIN, now), false)
  assert.equal(shouldMail(now - MAIL_GAP, now), true)
})

test('daily report: email when there are problems, all-OK only on Mondays, otherwise nothing', () => {
  const stats = { leads: 4, payments: 2, lastSync: new Date(now - HOUR) }
  const bad = dailyReport({ problems: ['• Sync stopped'], openIncidents: [{ kind: 'payment', message: 'PayPal said no', at: new Date(now - HOUR) }], monday: false, stats })
  assert.match(bad.subject, /2 problems/)
  assert.match(bad.text, /Sync stopped/)
  assert.match(bad.text, /A customer payment had a problem/)
  assert.equal(dailyReport({ problems: [], monday: false, stats }), null)
  const ok = dailyReport({ problems: [], monday: true, stats })
  assert.match(ok.subject, /all OK/)
  assert.match(ok.text, /requests in the last 7 days: 4/)
  assert.match(ok.text, /payments in the last 7 days: 2/)
})

test('a problem email names the problem plainly and points to the staff app', () => {
  const e = incidentEmail({ kind: 'lead-alert', message: 'New request from Pat' })
  assert.equal(e.subject, '⚠ CLC website: New-request alert email didn’t go out')
  assert.match(e.text, /New request from Pat/)
  assert.match(e.text, /staff app/)
})
