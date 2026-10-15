import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { ELSEWHERE, REPORTS, reportById, reportFromHash } from '../src/data/reports.js'
import { cellsOf, inlineParts, linkKind, parseMarkdown, partsText, rowsById, sectionOf, withoutSections } from '../src/lib/markdown.js'
import { DO_NOT_CONTACT, WINBACK_GROUPS, pastState, winbackStats } from '../src/lib/pastStates.js'
import { STOCK_TEMPLATES } from '../src/lib/emailTemplates.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('markdown: headings, paragraphs, lists, tables, quotes, code, rules', () => {
  const md = [
    '# Title', '', 'One line', 'and its next line.', '', '## Part 2', '',
    '- first', '  carries on', '- second', '  - nested', '', '3. three', '4. four', '',
    '| # | What | Who |', '|---|---|---|', '| 79 | a \\| b | Owner |', '', '> quoted', '> more', '', '```', 'code *here*', '```', '---',
  ].join('\n')
  const b = parseMarkdown(md)
  assert.deepEqual(b.map((x) => x.type), ['h', 'p', 'h', 'list', 'list', 'table', 'quote', 'code', 'hr'])
  assert.deepEqual(b[0], { type: 'h', level: 1, text: 'Title' })
  assert.equal(b[1].text, 'One line and its next line.')
  assert.deepEqual(b[3].items, [{ text: 'first carries on', depth: 0 }, { text: 'second', depth: 0 }, { text: 'nested', depth: 1 }])
  assert.equal(b[4].ordered, true)
  assert.equal(b[4].start, 3)
  assert.deepEqual(b[5].head, ['#', 'What', 'Who'])
  assert.deepEqual(b[5].rows, [['79', 'a | b', 'Owner']])
  assert.equal(b[6].text, 'quoted\nmore')
  assert.equal(b[7].text, 'code *here*')
  assert.deepEqual(cellsOf('| a | b |'), ['a', 'b'])
  assert.deepEqual(parseMarkdown('| a | b |\n| c | d |')[0], { type: 'table', head: [], rows: [['a', 'b'], ['c', 'd']] })
})

test('markdown: inline marks become parts, never HTML', () => {
  const p = inlineParts('**Bold `code`** and *em*, ~~gone~~, [the guide](/cost/), [spec](specs/x.md) and https://claude.ai/artifact/abc.')
  assert.deepEqual(p.map((x) => x.kind), ['strong', 'text', 'em', 'text', 'del', 'text', 'link', 'text', 'link', 'text', 'link', 'text'])
  assert.deepEqual(p[0].parts.map((x) => x.kind), ['text', 'code'])
  assert.equal(p[6].href, '/cost/')
  assert.equal(p[10].href, 'https://claude.ai/artifact/abc')
  assert.equal(p.at(-1).text, '.')
  assert.equal(partsText(p), 'Bold code and em, gone, the guide, spec and https://claude.ai/artifact/abc.')
  assert.equal(partsText(inlineParts('<script>alert(1)</script> 2*3*4')), '<script>alert(1)</script> 2*3*4')
  assert.equal(partsText(inlineParts('a \\* b')), 'a * b')
  assert.equal(linkKind('https://x.com'), 'web')
  assert.equal(linkKind('tel:2818190163'), 'web')
  assert.equal(linkKind('/design/'), 'site')
  assert.equal(linkKind('../specs/reports.md'), 'file')
  assert.equal(linkKind('//evil.example'), 'file')
})

test('markdown: sections by heading, with or without them', () => {
  const b = parseMarkdown('# T\n## A\na\n### A1\na1\n## B\nb\n## C\nc')
  assert.deepEqual(sectionOf(b, 'a').map((x) => x.text), ['a', 'A1', 'a1'])
  assert.deepEqual(sectionOf(b, 'nope'), [])
  assert.deepEqual(withoutSections(b, ['B', 'A1']).map((x) => x.text), ['T', 'A', 'a', 'C', 'c'])
})

test('reports: every source file exists, is read in docs.js, and parses with a # title', () => {
  const docsJs = read('src/leads/reports/docs.js')
  assert.ok(REPORTS.length >= 4)
  assert.equal(new Set(REPORTS.map((r) => r.id)).size, REPORTS.length)
  for (const r of REPORTS) {
    assert.ok(r.title && r.blurb && (r.docs.length || r.live), `${r.id} has a title, a blurb and docs (or a live part)`)
    for (const d of r.docs) {
      assert.ok(existsSync(new URL(`../${d.path}`, import.meta.url)), `${d.path} exists`)
      assert.ok(docsJs.includes(`'${d.path}'`), `${d.path} is read in docs.js`)
      const blocks = parseMarkdown(read(d.path))
      assert.equal(blocks[0]?.type === 'h' && blocks[0].level, 1, `${d.path} starts with a # title`)
      for (const s of d.skip ?? []) assert.ok(sectionOf(blocks, s).length, `${d.path}: the skipped section “${s}” is there`)
    }
  }
  for (const [what, where] of ELSEWHERE) assert.ok(what && where)
})

test('reports: the TODO items and checklist rows they ask for are read from the real files', () => {
  const todo = rowsById(parseMarkdown(read('docs/TODO.md')))
  const checks = rowsById(parseMarkdown(read('docs/test-checklist.md')))
  assert.ok(todo.size > 20 && checks.size > 100, 'both files parse into many rows')
  // Items can be finished and leave the file (the page then says so); today these are open.
  for (const id of ['79', '70', 'N']) assert.match(todo.get(id)?.cells[1] ?? '', /\w{10}/, `TODO ${id}`)
  for (const r of REPORTS) for (const n of r.checklist ?? []) assert.match(n, /^\d+$/)
  assert.ok(checks.get('162')?.cells.length >= 4, 'checklist rows have check, expected, status')
})

test('reports: #reports/<id> opens one report, anything else the list', () => {
  assert.equal(reportFromHash('#reports/seo'), 'seo')
  assert.equal(reportFromHash('#reports/nope'), '')
  assert.equal(reportFromHash('#reports'), '')
  assert.equal(reportById('design').title, 'Design')
})

test('win-back counts follow the Old-site requests rules', () => {
  const season = '2026'
  const sent = { seasons: { 2026: { emailsSent: { comeback: '2026-10-19' } } } }
  const people = [
    { id: 'a', fullName: 'Ann Paid', email: 'ann@x.com', payments: [{ amount: 900 }] }, // former customer, ready
    { id: 'b', fullName: 'Bob Paid', email: 'bob@x.com', payments: [{ amount: 500 }], ...sent }, // emailed
    { id: 'c', fullName: 'Cy Asked', email: 'cy@x.com', year: '2023', requests: [{ message: 'hi' }], status: 'Interested' },
    { id: 'd', fullName: 'Di Asked', email: '', year: '2024', requests: [{ message: 'hi' }] }, // no email: not ready
    { id: 'e', fullName: 'Ed Far', email: 'ed@x.com', year: '2022', zip: '75001', requests: [{ message: 'hi' }] }, // outside our area
    { id: 'f', fullName: 'Flo Old', email: 'flo@x.com', year: '2018', requests: [{ message: 'hi' }], status: 'Not interested' },
    { id: 'g', fullName: 'Gus Old', email: 'gus@x.com', year: '2017', requests: [{ message: 'hi' }], status: 'Junk / spam' },
    { id: 'h', fullName: 'Hal Now', email: 'hal@x.com', year: '2025', requests: [{ message: 'hi' }] }, // a customer now
    { id: 'i', fullName: '2815550100', voice: { entries: 9 } }, // texted us
  ]
  const customers = [{ id: 'hal', fullName: 'Hal Now', email: 'hal@x.com' }]
  const { by, total } = winbackStats(people, customers, season)
  assert.deepEqual(Object.keys(by), WINBACK_GROUPS.map(([k]) => k))
  assert.deepEqual(by.comeback, { people: 2, ready: 1, emailed: 1, interested: 0, booked: 0, noThanks: 0, customers: 0 })
  assert.deepEqual(by.winback, { people: 4, ready: 0, emailed: 0, interested: 1, booked: 0, noThanks: 0, customers: 1 })
  assert.deepEqual(by['winback-older'], { people: 2, ready: 0, emailed: 0, interested: 0, booked: 0, noThanks: 1, customers: 0 })
  assert.equal(by.voice.people, 1)
  assert.equal(total.people, people.length)
  assert.equal(pastState(people[6], null, season), 'Junk / spam')
  assert.equal(pastState(people[1], null, season), 'Emailed')
  assert.ok(DO_NOT_CONTACT.includes('customer') && DO_NOT_CONTACT.includes('Junk / spam'))
  assert.deepEqual(winbackStats(undefined, undefined, season).total.people, 0)
})

test('the win-back report shows the four win-back templates that exist', () => {
  const view = read('src/leads/reports/ReportsView.jsx')
  for (const id of ['comeback', 'winback', 'winback-older', 'winback-last']) {
    assert.ok(STOCK_TEMPLATES.some((t) => t.id === id), `${id} is a stock template`)
    assert.ok(view.includes(`['${id}'`), `${id} is in the report`)
  }
})
