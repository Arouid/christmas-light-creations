import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECKLIST, dayKey, doneCount, storeTicks, ticksFor, toggleTick, weekKey } from '../src/lib/checklist.js'

test('the checklist has three groups with unique ids and real places to go', () => {
  const ids = Object.values(CHECKLIST).flat().map(([id]) => id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(CHECKLIST.daily.length >= 4 && CHECKLIST.weekly.length >= 4 && CHECKLIST.season.length >= 3)
  const places = ['', 'messages', 'home', 'leads', 'accounts', 'service', 'invoices', 'season', 'route', 'past', 'notes']
  for (const [, what, where] of Object.values(CHECKLIST).flat()) { assert.ok(what.length < 120, what); assert.ok(places.includes(where), where) }
})

test('today’s ticks clear the next day, the week’s on Monday, the season’s never', () => {
  const mon = new Date(2026, 9, 12, 9) // Monday Oct 12, 2026
  const tue = new Date(2026, 9, 13, 9)
  const nextMon = new Date(2026, 9, 19, 9)
  assert.equal(dayKey(mon), '2026-10-12'); assert.equal(weekKey(tue), '2026-10-12'); assert.equal(weekKey(new Date(2026, 9, 18)), '2026-10-12', 'Sunday belongs to the week that started Monday')
  let t = ticksFor(null, mon)
  t = toggleTick(t, 'daily', 'd-messages', true)
  t = toggleTick(t, 'weekly', 'w-bill', true)
  t = toggleTick(t, 'season', 's-walk', true)
  const stored = JSON.stringify(storeTicks(t, mon))
  const sameDay = ticksFor(stored, new Date(2026, 9, 12, 20))
  assert.ok(sameDay.daily.has('d-messages') && sameDay.weekly.has('w-bill') && sameDay.season.has('s-walk'))
  const nextDay = ticksFor(stored, tue)
  assert.ok(!nextDay.daily.has('d-messages') && nextDay.weekly.has('w-bill') && nextDay.season.has('s-walk'))
  const nextWeek = ticksFor(stored, nextMon)
  assert.ok(!nextWeek.weekly.has('w-bill') && nextWeek.season.has('s-walk'))
  assert.equal(doneCount(sameDay, 'daily'), 1)
  assert.equal(doneCount(toggleTick(sameDay, 'daily', 'd-messages', false), 'daily'), 0)
  assert.deepEqual([...ticksFor('junk', mon).daily], [])
})
