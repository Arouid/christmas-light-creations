import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COVER_MS, coverage, coveredBy, needsSomeone, personKey, waiting } from '../functions/nudge.js'

const H = 3600000
const now = Date.parse('2026-10-14T19:00:00Z')
const iso = (ms) => new Date(ms).toISOString()
// Tracie's afternoon: five texts over 30 minutes, synced as they came.
const texts = [26, 23, 21, 11, 10].map((min, i) => ({ id: `t${i}`, kind: 'text', direction: 'in', customerId: 'tracie', phone: '+18322284621', at: iso(now - min * 60000), syncedAt: now - min * 60000 }))

test('one “I’ve got it” on any of a person’s messages covers the whole conversation', () => {
  const activity = [{ action: 'handling', by: 'lacie@x', at: now - 9 * 60000, target: { type: 'message', id: 't4' } }]
  const cover = coverage({ activity, items: texts, outgoing: [] })
  assert.equal(cover.live.get('customer:tracie')?.by, 'lacie@x')
  for (const m of texts) assert.equal(needsSomeone(m, cover), false, m.id)
  assert.deepEqual(coveredBy(texts[0], cover), { at: now - 9 * 60000, by: 'lacie@x' })
})

test('texting, calling or emailing them from the app counts, for the next 6 hours; a message after that needs someone again', () => {
  const activity = [{ action: 'text', by: 'lacie@x', at: now - 20 * 60000, target: { type: 'customer', id: 'tracie' } }]
  const later = { id: 'late', kind: 'text', direction: 'in', customerId: 'tracie', at: iso(now + 7 * H), syncedAt: now + 7 * H }
  const cover = coverage({ activity, items: [...texts, later], outgoing: [] })
  assert.equal(needsSomeone(texts[4], cover), false, 'ten minutes ago, we texted them 20 minutes ago')
  assert.equal(needsSomeone(texts[0], cover), false, 'the earlier ones too')
  assert.equal(needsSomeone(later, cover), true, 'seven hours later: a fresh conversation')
  assert.equal(COVER_MS, 6 * H)
})

test('an email sent from the app covers them; a stranger’s texts are covered by a claim on one of them', () => {
  const sent = { id: 'em-out', kind: 'email', direction: 'out', customerId: 'tracie', at: iso(now - 5 * 60000), syncedAt: now - 5 * 60000, updatedBy: 'katie@x' }
  const cover = coverage({ activity: [], items: texts, outgoing: [sent] })
  assert.equal(needsSomeone(texts[4], cover), false)
  assert.equal(coveredBy(texts[4], cover).by, 'katie@x')
  const before = { ...sent, id: 'em-before', at: iso(now - 60 * 60000), syncedAt: now - 60 * 60000 }
  assert.equal(needsSomeone(texts[4], coverage({ activity: [], items: texts, outgoing: [before] })), true, 'an email sent before their text answers nothing')
  const strangers = [0, 1].map((i) => ({ id: `s${i}`, kind: 'text', direction: 'in', phone: '+15026678929', unmatched: true, at: iso(now - 30 * 60000), syncedAt: now - 30 * 60000 }))
  assert.equal(personKey(strangers[0]), 'phone:+15026678929')
  const c2 = coverage({ activity: [{ action: 'handling', by: 'a@x', at: now, target: { type: 'message', id: 's1' } }], items: strangers, outgoing: [] })
  assert.equal(needsSomeone(strangers[0], c2), false)
  assert.equal(needsSomeone({ id: 'other', kind: 'text', direction: 'in', phone: '+12815550199', at: iso(now), syncedAt: now }, c2), true)
})

test('the still-waiting list uses the same coverage', () => {
  const old = texts.map((m) => ({ ...m, at: iso(now - 3 * H), syncedAt: now - 3 * H }))
  assert.equal(waiting({ messages: old, leads: [], calls: [], activity: [], now }).length, 5)
  const activity = [{ action: 'call', by: 'lacie@x', at: now - 2 * H, target: { type: 'customer', id: 'tracie' } }]
  assert.equal(waiting({ messages: old, leads: [], calls: [], activity, now }).length, 0)
})
