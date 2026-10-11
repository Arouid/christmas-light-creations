import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deviceLabel, presenceRows } from '../src/lib/presence.js'

test('presence rows: on now first, then last seen, then never; names from the staff map', () => {
  const now = Date.parse('2026-10-10T20:00:00Z')
  const staff = [{ id: 'katie@example.com' }, { id: 'lacie@example.com' }, { id: 'scott@example.com' }]
  const seen = [
    { id: 'scott@example.com', lastSeen: new Date(now - 3 * 60 * 1000), device: 'Windows' },
    { id: 'lacie@example.com', lastSeen: new Date(now - 2 * 60 * 60 * 1000), device: 'iPhone app' },
  ]
  const rows = presenceRows(staff, seen, { 'scott@example.com': 'Scott' }, now)
  assert.deepEqual(rows.map((r) => [r.name, r.state, r.device]), [['Scott', 'on', 'Windows'], ['Lacie M.', 'away', 'iPhone app'], ['Claude (assistant)', 'never', 'drafted a reply'], ['Katie', 'never', '']])
})

test('device labels', () => {
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1', true), 'iPhone app')
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1'), 'iPhone · Safari')
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36'), 'Windows · Chrome')
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36 Edg/130.0'), 'Windows · Edge')
  assert.equal(deviceLabel('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) Chrome/130.0 Safari/537.36'), 'Chromebook · Chrome')
  assert.equal(deviceLabel('Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36', false, 'Chrome OS'), 'Chromebook · Chrome')
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36'), 'Android · Chrome')
  assert.ok(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36 Edg/130.0').length <= 40)
})

test('two staff entries with the same name show their emails', () => {
  const rows = presenceRows([{ id: 'lacie@example.com' }, { id: 'lacie.m@example.com' }, { id: 'katie@example.com' }], [], { 'lacie@example.com': 'Lacie', 'lacie.m@example.com': 'Lacie' })
  assert.deepEqual(rows.map((r) => [r.name, r.dupe]), [['Claude (assistant)', false], ['Katie', false], ['Lacie', true], ['Lacie', true]])
})
