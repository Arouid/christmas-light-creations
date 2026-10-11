import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SECTIONS, TASKS, TOUR, groupedTasks, howSteps } from '../src/leads/guide.js'

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
  assert.ok(TOUR.length >= 5 && TOUR.length <= 9)
  for (const s of TOUR) {
    assert.ok(s.icon && s.title && s.body?.length >= 1, s.title)
    if (s.tab) assert.ok(tabs.has(s.tab), `${s.title}: tab ${s.tab}`)
  }
})
