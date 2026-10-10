import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TEST_PUSH, devicesOf, deviceGone, fcmMessage, messageLink, previewOf, pushFor, whoOf } from '../functions/staffPush.js'
import { countNew, deviceName, pushState, recentIncoming, toMs } from '../src/lib/staffAlerts.js'

const now = Date.parse('2026-10-09T18:00:00Z')
const MIN = 60 * 1000
const HOUR = 60 * MIN
const iso = (ms) => new Date(ms).toISOString()
const names = { 'customer:sample-customer': 'Sample Customer', 'lead:demo-2': 'Pat Lead' }

const text = { kind: 'text', direction: 'in', at: iso(now - 5 * MIN), text: 'Thursday works, gate code is the same.', phone: '+12815550101', customerId: 'sample-customer' }
const email = { kind: 'email', direction: 'in', at: iso(now - 4 * MIN), subject: 'Re: Your install', text: 'Perfect, thanks!', email: 'pat@example.com', leadId: 'demo-2' }
const unknown = { kind: 'voicemail', direction: 'in', at: iso(now - 3 * MIN), text: 'Please call me back.', phone: '+12815550166', unmatched: true }

test('one message: kind and who in the title, a short preview, a link to their account', () => {
  assert.deepEqual(pushFor([text], names, now), {
    title: 'Text from Sample Customer', body: 'Thursday works, gate code is the same.', link: '#accounts/customer/sample-customer', tag: 'customer:sample-customer',
  })
  assert.deepEqual(pushFor([email], names, now), {
    title: 'Email from Pat Lead', body: 'Re: Your install · Perfect, thanks!', link: '#accounts/lead/demo-2', tag: 'lead:demo-2',
  })
  // Unknown number: shown as the number, opens the Unmatched list.
  assert.deepEqual(pushFor([unknown], names, now), {
    title: 'Voicemail from (281) 555-0166', body: 'Please call me back.', link: '#leads', tag: 'from:+12815550166',
  })
  assert.equal(pushFor([{ ...text, kind: 'missed', text: '' }], names, now).body, 'No voicemail left')
})

test('long text is cut to 120 characters, spaces folded', () => {
  const body = pushFor([{ ...text, text: `Hello\n\n${'a'.repeat(300)}` }], names, now).body
  assert.equal(body.length, 120)
  assert.ok(body.startsWith('Hello a') && body.endsWith('…'))
})

test('several messages: one notification; same person → their account, different people → the list', () => {
  const two = pushFor([text, { ...text, at: iso(now - MIN), text: 'Also the tree please' }], names, now)
  assert.deepEqual(two, { title: '2 messages from Sample Customer', body: 'Also the tree please', link: '#accounts/customer/sample-customer', tag: 'customer:sample-customer' })
  const later = (m, min, phone) => ({ ...m, phone, at: iso(now - min * MIN) })
  const mixed = pushFor([text, email, unknown, later(unknown, 2, '+12815550177'), later(unknown, 1, '+12815550188')], names, now)
  assert.equal(mixed.title, '5 new customer messages')
  assert.equal(mixed.body, '(281) 555-0188, (281) 555-0177, (281) 555-0166, +2 more')
  assert.equal(mixed.link, '#messages')
})

test('no alert for our own messages, dismissed ones, old catch-up mail or nothing', () => {
  assert.equal(pushFor([], names, now), null)
  assert.equal(pushFor([{ ...text, direction: 'out' }], names, now), null)
  assert.equal(pushFor([{ ...unknown, dismissed: true }], names, now), null)
  assert.equal(pushFor([{ ...text, at: iso(now - 3 * 24 * HOUR) }], names, now), null)
  assert.equal(pushFor([{ ...text, kind: 'call' }], names, now), null)
  assert.equal(pushFor([{ ...text, at: 'not a date' }], names, now), null)
})

test('who and link fall back sensibly', () => {
  assert.equal(whoOf({ name: 'Mom' }), 'Mom')
  assert.equal(whoOf({ email: 'x@example.com' }), 'x@example.com')
  assert.equal(whoOf({}), 'Unknown number')
  assert.equal(whoOf({ customerId: 'gone', phone: '2815550101' }, names), '(281) 555-0101')
  assert.equal(messageLink({ customerId: 'a b/c' }), '#accounts/customer/a%20b%2Fc')
  assert.equal(messageLink({ customerId: 'c1', leadId: 'l1' }), '#accounts/customer/c1')
  assert.equal(previewOf({ kind: 'text', text: '' }), '')
})

test('devices: every staff member, each device once', () => {
  const prefs = [
    { email: 'a@x.com', pushDevices: { fid1: { name: 'iPhone' }, fid2: { name: 'Chrome on Windows' } } },
    { email: 'b@x.com', pushDevices: { fid2: { name: 'same device twice' }, fid3: {} } },
    { email: 'c@x.com' },
    { email: 'd@x.com', pushDevices: {} },
  ]
  assert.deepEqual(devicesOf(prefs), [{ email: 'a@x.com', fid: 'fid1' }, { email: 'a@x.com', fid: 'fid2' }, { email: 'b@x.com', fid: 'fid3' }])
  assert.deepEqual(devicesOf(undefined), [])
})

test('FCM message is data-only strings for our service worker, urgent, kept a day', () => {
  assert.deepEqual(fcmMessage('fid1', TEST_PUSH), {
    message: {
      fid: 'fid1',
      data: { title: 'CLC Staff: test notification', body: 'Notifications work on this device ✓', link: '#messages', tag: 'test' },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    },
  })
})

test('only FCM’s own "gone" codes drop a device', () => {
  const err = (errorCode, status = 'NOT_FOUND') => ({ error: { status, details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode }] } })
  assert.equal(deviceGone(err('UNREGISTERED')), true)
  assert.equal(deviceGone(err('SENDER_ID_MISMATCH', 'PERMISSION_DENIED')), true)
  assert.equal(deviceGone(err('INVALID_ARGUMENT', 'INVALID_ARGUMENT')), false)
  assert.equal(deviceGone(err('INTERNAL', 'INTERNAL')), false)
  assert.equal(deviceGone({ error: { status: 'NOT_FOUND' } }), false) // a wrong URL, not a gone device
  assert.equal(deviceGone(null), false)
})

test('the list: incoming, last 7 days, not dismissed, newest first; count since you last looked', () => {
  const synced = (m, minAgo) => ({ ...m, syncedAt: { toMillis: () => now - minAgo * MIN } })
  const items = [
    synced(text, 4), synced(email, 3), synced(unknown, 2),
    synced({ ...text, direction: 'out' }, 1),
    synced({ ...unknown, dismissed: true }, 1),
    synced({ ...text, at: iso(now - 8 * 24 * HOUR) }, 8 * 24 * 60),
    { ...text, syncedAt: undefined }, // old import: no sync time
  ]
  const list = recentIncoming(items, now)
  assert.deepEqual(list.map((m) => m.kind), ['voicemail', 'email', 'text'])
  assert.equal(countNew(list, null), 3)
  assert.equal(countNew(list, now - 3.5 * MIN), 2)
  assert.equal(countNew(list, { toMillis: () => now }), 0)
  assert.equal(countNew(list, iso(now - 2.5 * MIN)), 1)
})

test('times in every shape', () => {
  assert.equal(toMs(null), 0)
  assert.equal(toMs(5), 5)
  assert.equal(toMs(new Date(7)), 7)
  assert.equal(toMs('1970-01-01T00:00:00.009Z'), 9)
  assert.equal(toMs({ toMillis: () => 11 }), 11)
  assert.equal(toMs('nope'), 0)
})

test('phone notifications: what stops them on this device', () => {
  const ok = { vapidKey: 'B…', supported: true, permission: 'default', on: false }
  assert.equal(pushState(ok), 'off')
  assert.equal(pushState({ ...ok, permission: 'granted', on: true }), 'on')
  assert.equal(pushState({ ...ok, permission: 'denied' }), 'blocked')
  assert.equal(pushState({ ...ok, supported: false, ios: true, standalone: false }), 'ios-install')
  assert.equal(pushState({ ...ok, supported: false, ios: true, standalone: true }), 'unsupported')
  assert.equal(pushState({ ...ok, supported: false }), 'unsupported')
  assert.equal(pushState({ ...ok, vapidKey: '' }), 'no-key')
  assert.equal(pushState({ ...ok, prefsError: 'not-staff' }), 'rules')
})

test('device names', () => {
  assert.equal(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'), 'iPhone')
  assert.equal(deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'iPad')
  assert.equal(deviceName('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36'), 'Android phone')
  assert.equal(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'), 'Chrome on Windows')
  assert.equal(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0'), 'Edge on Windows')
  assert.equal(deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'), 'Safari on Mac')
  assert.equal(deviceName(''), 'Browser')
})
