import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SECTIONS, TASKS, TOUR, WHATS_NEW, groupedTasks, howSteps } from '../src/leads/guide.js'

test('every "How do I" task lands in exactly one group', () => {
  const titles = groupedTasks().flatMap(([, tasks]) => tasks.map(([t]) => t))
  assert.deepEqual([...titles].sort(), TASKS.map(([t]) => t).sort())
  assert.equal(new Set(titles).size, titles.length)
  assert.ok(!groupedTasks().some(([name]) => name === 'Other'), 'no leftover tasks')
})

test('arrow chains become numbered steps; plain answers stay as one paragraph', () => {
  assert.deepEqual(howSteps('**Season** → filter → **＋ Route these N**'), ['**Season**', 'filter', '**＋ Route these N**'])
  assert.equal(howSteps('Tap **Text**: the message is copied → paste it.'), null)
  assert.equal(howSteps('No arrows here.'), null)
})

test('tour steps are complete and point at real tabs', () => {
  const tabs = new Set(SECTIONS.map((s) => s.tab).filter(Boolean))
  assert.ok(TOUR.length >= 5 && TOUR.length <= 14, 'short enough to finish')
  assert.ok(TOUR.some((s) => s.title === 'What runs by itself'), 'the automatic things get their own stop (owner 2026-10-12)')
  for (const must of ['Got your request', '2+ hours', 'weather', 'Pay-in-3', 'Report a problem', 'lifetime warranty']) assert.ok(TOUR.some((s) => s.body.join(' ').includes(must)), must)
  for (const s of TOUR) {
    assert.ok(s.icon && s.title && s.body?.length >= 1, s.title)
    if (s.tab) assert.ok(tabs.has(s.tab), `${s.title}: tab ${s.tab}`)
  }
})

test('what’s new: dated, short, and about the latest batch (owner 2026-10-12)', () => {
  assert.match(WHATS_NEW.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(WHATS_NEW.items.length >= 5 && WHATS_NEW.items.length <= 20)
  for (const line of WHATS_NEW.items) assert.ok(line.length <= 330, line.slice(0, 40))
  for (const must of ['Got your request', 'Still-waiting', 'Weather', 'Lifetime warranty', 'Trees']) assert.ok(WHATS_NEW.items.some((l) => l.includes(must)), must)
})
