import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GRACE_MS, openBounces, outgoingLight } from '../src/lib/outgoingMail.js'

const now = Date.parse('2026-10-18T20:00:00Z') // after CONFIRM_SINCE
const H = 60 * 60 * 1000
const sentAt = (hoursAgo, extra = {}) => ({ at: new Date(now - hoursAgo * H).toISOString(), ...extra })

test('green when nothing went out, or everything was seen in Gmail', () => {
  assert.equal(outgoingLight({ now }).color, 'green')
  const r = outgoingLight({ sent: [sentAt(2, { gmailSeenAt: 1 }), sentAt(30, { gmailSeenAt: 1 })], lastSync: now - H, now })
  assert.equal(r.color, 'green')
  assert.equal(r.note, '2 emails this week, all in Gmail’s Sent')
})

test('amber while a fresh send waits for the next sync', () => {
  const r = outgoingLight({ sent: [sentAt(0.1)], lastSync: now - 2 * H, now })
  assert.equal(r.color, 'amber')
  assert.equal(r.waiting, 1)
})

test('red when the sync ran after a send and never saw it', () => {
  const r = outgoingLight({ sent: [sentAt(3)], lastSync: now - H, now })
  assert.equal(r.color, 'red')
  assert.equal(r.missing, 1)
  // Within the grace period after the send, the same case is still amber.
  assert.equal(outgoingLight({ sent: [sentAt(1)], lastSync: now - H + GRACE_MS / 2, now }).color, 'amber')
})

test('red when a scheduled email failed; old sends drop out after a week', () => {
  assert.equal(outgoingLight({ scheduled: [{ status: 'failed', open: true }], now }).color, 'red')
  assert.equal(outgoingLight({ scheduled: [{ status: 'failed', open: false }], now }).color, 'green')
  assert.equal(outgoingLight({ sent: [sentAt(24 * 9)], lastSync: now, now }).note, 'nothing sent this week')
})

test('emails from before the sync started stamping are left out', () => {
  const before = { at: '2026-10-10T18:00:00Z' }
  assert.equal(outgoingLight({ sent: [before], lastSync: Date.parse('2026-10-11T12:00:00Z'), now: Date.parse('2026-10-11T13:00:00Z') }).note, 'nothing sent this week')
})

test('bounces: red while a bounce from the last week still has its address on the record', () => {
  const customers = [{ id: 'pat', email: 'pat.sampel@example.com' }, { id: 'fixed', email: 'jordan@example.com' }]
  const leads = [{ id: 'lead1', email: 'casey@example.org' }]
  const bounce = (hoursAgo, extra) => ({ bounced: true, bouncedAt: new Date(now - hoursAgo * H).toISOString(), kind: 'email', direction: 'out', ...extra })
  const open = bounce(2, { customerId: 'pat', email: 'pat.sampel@example.com' })
  const fixed = bounce(2, { customerId: 'fixed', email: 'jordan@exmaple.com' }) // the record now has the right address
  const old = bounce(8 * 24, { customerId: 'pat', email: 'pat.sampel@example.com' })
  const lead = bounce(5, { leadId: 'lead1', email: 'casey@example.org' })
  const past = bounce(5, { pastRequestId: 'old-x', email: 'old@example.net' }) // record not loaded on Home: counts for the week
  const list = openBounces([open, fixed, old, lead, past, { ...open, bounced: false }], { customers, leads }, now)
  assert.deepEqual(list, [open, lead, past])
  const r = outgoingLight({ bounced: list, now })
  assert.deepEqual(r, { color: 'red', note: '3 emails bounced (fix the address)', bounced: 3 })
  assert.equal(outgoingLight({ bounced: openBounces([fixed, old], { customers, leads }, now), now }).color, 'green')
  // Both kinds of trouble are said, the email that didn't go first.
  assert.deepEqual(outgoingLight({ bounced: [open], scheduled: [{ status: 'failed', open: true }], now }),
    { color: 'red', note: '1 email didn’t go (see Scheduled emails) · 1 email bounced (fix the address)', failed: 1, bounced: 1 })
})
