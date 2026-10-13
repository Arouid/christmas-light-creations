import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TEXT_MAX, TITLE_MAX, firstLine, noteRecord, searchNotes, splitNotes } from '../src/lib/notes.js'

test('a note needs words, keeps its limits, and belongs to the writer (lowercase email)', () => {
  assert.equal(noteRecord({ title: '', text: '  ' }, 'Katie@Example.com').problem, 'Write something first.')
  const r = noteRecord({ title: '  Gate codes  to check ', text: 'Smith: ask\r\nJones: 1234  ', shared: 1 }, 'Katie@Example.com').record
  assert.deepEqual(r, { title: 'Gate codes to check', text: 'Smith: ask\nJones: 1234', by: 'katie@example.com', shared: true })
  assert.equal(noteRecord({ text: 'Call Pat back tomorrow\nabout the arch' }, 'k@x.y').record.title, 'Call Pat back tomorrow', 'no title: the first line')
  assert.equal(noteRecord({ title: 'x'.repeat(TITLE_MAX + 1), text: 'a' }, 'k@x.y').problem, `Title: ${TITLE_MAX} characters at most.`)
  assert.ok(noteRecord({ title: 'a', text: 'x'.repeat(TEXT_MAX + 1) }, 'k@x.y').problem.startsWith('Note:'))
  assert.equal(firstLine('\n\n  hello world  \nmore'), 'hello world')
  assert.equal(firstLine(''), 'Untitled')
})

test('mine and shared merge without duplicates; other people’s shared notes are grouped by writer, newest first', () => {
  const t = (n) => ({ toMillis: () => n })
  const mine = [{ id: 'a', by: 'katie@x.y', title: 'A', updatedAt: t(1) }, { id: 'b', by: 'katie@x.y', title: 'B', shared: true, updatedAt: t(3) }]
  const shared = [
    { id: 'b', by: 'katie@x.y', title: 'B', shared: true, updatedAt: t(3) },
    { id: 'c', by: 'lacie@x.y', title: 'C', shared: true, updatedAt: t(2) },
    { id: 'd', by: 'lacie@x.y', title: 'D', shared: true, updatedAt: t(5) },
    { id: 'e', by: 'scott@x.y', title: 'E', shared: true, createdAt: t(4) },
  ]
  const s = splitNotes(mine, shared, 'Katie@X.Y')
  assert.deepEqual(s.mine.map((n) => n.id), ['b', 'a'])
  assert.deepEqual(s.fromOthers.map(([who, notes]) => [who, notes.map((n) => n.id)]), [['lacie@x.y', ['d', 'c']], ['scott@x.y', ['e']]])
  assert.deepEqual(splitNotes([], [], 'k@x.y'), { mine: [], fromOthers: [] })
})

test('search matches every word across title and text', () => {
  const notes = [{ id: 1, title: 'Gate codes', text: 'Smith 1234' }, { id: 2, title: 'Boxes', text: 'Jones never sets them out' }]
  assert.deepEqual(searchNotes(notes, 'gate smith').map((n) => n.id), [1])
  assert.deepEqual(searchNotes(notes, 'jones').map((n) => n.id), [2])
  assert.deepEqual(searchNotes(notes, '  ').map((n) => n.id), [1, 2])
  assert.deepEqual(searchNotes(notes, 'nothing here'), [])
})
