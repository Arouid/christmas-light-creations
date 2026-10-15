import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DRAFT_DOCS, LOG_FIELDS, PHASES, QUESTIONS, WEEKS, WHO } from '../src/data/marketingPlan.js'
import { findSection, parseDraftDoc, photosIn, plainText, sectionMeta } from '../src/lib/marketingDocs.js'
import { isDone, logPath, missed, phaseFor, progress, tickPath, weekIndexFor, weekLabel } from '../src/lib/marketing.js'

const docs = Object.fromEntries(Object.entries(DRAFT_DOCS).map(([k, d]) => [k, parseDraftDoc(readFileSync(new URL(`../docs/marketing/${d.file}.md`, import.meta.url), 'utf8'))]))
const DAY = 86_400_000
const plusDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10)

test('the plan: weeks run back to back from Monday Oct 12, ids are unique, every task names who does it', () => {
  assert.equal(WEEKS[0].from, '2026-10-12')
  assert.equal(new Date('2026-10-12T12:00:00Z').getUTCDay(), 1, 'week 1 starts on a Monday')
  for (let i = 1; i < WEEKS.length; i++) assert.equal(WEEKS[i].from, plusDays(WEEKS[i - 1].to, 1), `${WEEKS[i].id} starts the day after ${WEEKS[i - 1].id} ends`)
  const ids = [...WEEKS.flatMap((w) => [w.id, ...w.tasks.map((t) => t.id)]), ...QUESTIONS.map((q) => q.id)]
  assert.equal(new Set(ids).size, ids.length, 'no id twice')
  for (const t of WEEKS.flatMap((w) => w.tasks)) assert.ok(WHO[t.who], `${t.id}: ${t.who}`)
  assert.ok(ids.every((id) => /^[a-z0-9-]+$/.test(id)), 'ids are safe Firestore field names')
  assert.equal(PHASES[0].from, WEEKS[0].from)
  assert.equal(PHASES.at(-1).to, WEEKS.at(-1).to)
  for (let i = 1; i < PHASES.length; i++) assert.equal(PHASES[i].from, plusDays(PHASES[i - 1].to, 1))
  assert.ok(LOG_FIELDS.every(([k]) => /^[a-zA-Z]+$/.test(k)))
})

test('every task that points to a draft finds it, and the draft has text to paste', () => {
  for (const t of WEEKS.flatMap((w) => w.tasks).filter((x) => x.draft)) {
    const doc = docs[t.draft.doc]
    assert.ok(doc, `${t.id}: doc ${t.draft.doc}`)
    const s = findSection(doc, t.draft)
    assert.ok(s, `${t.id}: section ${JSON.stringify(t.draft)}`)
    assert.ok(s.blocks.some((b) => b.kind === 'copy' || b.kind === 'row'), `${t.id}: something to copy`)
  }
  // All ten Google posts and all eight social posts are in the plan, once each.
  const used = (doc) => WEEKS.flatMap((w) => w.tasks).filter((t) => t.draft?.doc === doc).map((t) => t.draft.num)
  assert.deepEqual(used('gbp').toSorted((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.deepEqual(used('social').toSorted((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8])
})

test('the drafts reader: Google post 1 gives its title, text, terms, date and photo', () => {
  const g = docs.gbp
  const s = findSection(g, { num: 1 })
  assert.deepEqual(s.blocks.filter((b) => b.kind === 'copy').map((b) => b.label), ['Offer title', 'Text to paste', 'Terms'])
  assert.match(s.blocks[1].text, /^Installs start today, October 15th/)
  const meta = Object.fromEntries(sectionMeta(g, s))
  assert.equal(meta['Post on'], 'Thu Oct 15')
  assert.deepEqual(photosIn(Object.values(meta).join(' ')), ['shadow-creek-ranch-pearland-02.jpg'])
  // Social posts: the caption, a Nextdoor version, and the photo named in the note.
  const p = findSection(docs.social, { num: 1 })
  assert.ok(p.blocks.some((b) => b.kind === 'copy' && b.label === 'Nextdoor'))
  assert.ok(p.blocks.some((b) => b.kind === 'note' && photosIn(b.text).includes('shadow-creek-ranch-pearland-02.jpg')))
  // The email: subject and body, the {…} merge words kept for the app's templates.
  const e = findSection(docs.email, { title: 'Version A' })
  assert.equal(e.blocks[0].label, 'Subject')
  assert.match(e.blocks[1].text, /\{first\}/)
  // Ads: table rows give the headline itself, without its character count.
  const h = findSection(docs.ads, { title: 'Headlines' })
  assert.ok(h.blocks.some((b) => b.kind === 'row' && b.text === 'Christmas Light Installation'))
  assert.equal(plainText('**Bold** and `code` and [a link](x.md)'), 'Bold and code and a link')
})

test('this week, the phase, progress and what slipped', () => {
  assert.equal(weekIndexFor(WEEKS, '2026-10-15'), 0)
  assert.equal(weekIndexFor(WEEKS, '2026-10-19'), 1)
  assert.equal(weekIndexFor(WEEKS, '2026-01-01'), 0, 'before the plan: the first week')
  assert.equal(weekIndexFor(WEEKS, '2027-03-01'), WEEKS.length - 1, 'after it: the last')
  assert.equal(phaseFor(PHASES, '2026-10-20').id, 'early')
  assert.equal(phaseFor(PHASES, '2026-11-01').id, 'filling')
  assert.equal(phaseFor(PHASES, '2026-12-16').id, 'thanks')
  const done = { 'w1-gbp': { by: 'scott@x', at: 1 }, 'w1-ads': { by: 'scott@x', at: 2 } }
  assert.deepEqual(progress(WEEKS[0].tasks, done), { done: 2, total: WEEKS[0].tasks.length })
  assert.equal(isDone(done, 'w1-gbp'), true)
  const slipped = missed(WEEKS, done, '2026-10-20')
  assert.ok(slipped.every((t) => t.week.id === 'w1' && t.who !== 'claude' && !done[t.id]))
  assert.equal(slipped.length, WEEKS[0].tasks.filter((t) => t.who !== 'claude').length - 2)
  assert.deepEqual(missed(WEEKS, done, '2026-10-12'), [], 'nothing slips during the first week')
  assert.equal(weekLabel(WEEKS[0]), 'Oct 12–18')
  assert.equal(weekLabel(WEEKS.find((w) => w.id === 'w12')), 'Dec 28–Jan 3')
  assert.equal(tickPath('w1-gbp'), 'marketing.done.w1-gbp')
  assert.equal(logPath('w2', 'reviews'), 'marketing.log.w2.reviews')
})
