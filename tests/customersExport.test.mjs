import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOM, EXPORT_COLUMNS, csvField, customersCsv, exportFileName } from '../src/lib/customersExport.js'
import { matchesView } from '../src/lib/views.js'

const pat = {
  id: 'pat-sample', fullName: 'Pat Sample', firstName: 'Pat', lastName: 'Sample', phone: '555-010-0101', email: 'pat@example.com',
  address: '1 Main St, Pearland, TX 77581', city: 'Pearland', locationBlock: 'Pearland - East side of 35', neighborhood: 'Shadow Creek',
  hoa: 'Shadow Creek HOA', lightsDownBy: 'Jan 15', installType: 'Early Install', lightColor: 'Warm white', since: '2016', originalRate: '$680.00',
  installed: [{ what: 'Roofline C9', amount: '180 ft', color: 'warm white' }, { what: 'wrapped oaks', amount: '2' }],
  takedownNotes: 'Left side: 2 zip ties.\nRight side: 3.', notes: 'Says "ring twice", then wait',
  seasons: {
    2026: {
      installStatus: 'Install Scheduled', weekOf: 'Nov 3-9', day: 'Thursday', plannedDate: 'Nov 6', schedulingNotes: 'after 2 pm',
      install: { rate: '$460.00', discount: '10%', total: '$414.00', paid: 'Yes', paymentType: 'PayPal', paymentDate: '11/7/2026' },
      takedownStatus: 'Takedown Scheduled', takedown: { rate: '150', paid: 'No' },
    },
  },
}
const newbie = { id: 'ann-lee', fullName: 'Ann Lee', firstName: 'Ann', lastName: 'Lee', phone: '555-010-0102', neighborhood: 'Shadow Creek', installType: 'Regular Install' }
const gates = [{ neighborhood: 'shadow creek', code: '#4321' }]

// Parse the CSV back (every field is quoted, so this is enough for the tests).
function parse(csv) {
  assert.ok(csv.startsWith(BOM), 'starts with the UTF-8 BOM')
  const body = csv.slice(1)
  assert.ok(body.endsWith('\r\n'), 'ends with CRLF')
  const rows = []
  let row = []; let cell = ''; let inQuotes = false; let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (inQuotes) {
      if (ch === '"' && body[i + 1] === '"') { cell += '"'; i += 2; continue }
      if (ch === '"') { inQuotes = false; i++; continue }
      cell += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === ',') { row.push(cell); cell = ''; i++; continue }
    if (ch === '\r' && body[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i += 2; continue }
    assert.fail(`unquoted text at ${i}: ${JSON.stringify(body.slice(i, i + 20))}`)
  }
  assert.equal(cell, '', 'nothing after the last CRLF')
  const [header, ...records] = rows
  return records.map((r) => Object.fromEntries(header.map((h, k) => [h, r[k]])))
}

test('csv: BOM, CRLF, every field quoted, commas, quotes and line breaks survive the round trip', () => {
  const csv = customersCsv([pat, newbie], { season: '2026', gates })
  const lines = csv.slice(1).split('\r\n')
  assert.equal(lines.length, 2 + 1 + 1, 'header + 2 rows + trailing CRLF (notes with a line break stay in one quoted field)')
  assert.ok(lines[0].startsWith('"Name","First name","Last name","Phone","Email","Address",'), lines[0])
  for (const line of lines.slice(0, 3)) assert.match(line, /^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/, 'quoted fields only')
  assert.ok(csv.includes('"1 Main St, Pearland, TX 77581"'), 'comma inside a field')
  assert.ok(csv.includes('"Says ""ring twice"", then wait"'), 'quotes doubled')
  assert.ok(csv.includes('"Left side: 2 zip ties.\nRight side: 3."'), 'line break kept inside the quotes')
  const [p, a] = parse(csv)
  assert.equal(p.Name, 'Pat Sample')
  assert.equal(p['Last name'], 'Sample')
  assert.equal(p.Address, '1 Main St, Pearland, TX 77581')
  assert.equal(p['Other notes'], 'Says "ring twice", then wait')
  assert.equal(p['Install / takedown notes'], 'Left side: 2 zip ties.\nRight side: 3.')
  assert.equal(a.Name, 'Ann Lee')
})

test('csv: contact, property and account columns, this season’s schedule and billing, What’s up on one line', () => {
  const [p] = parse(customersCsv([pat], { season: '2026', gates }))
  assert.equal(p.Area, 'Pearland - East side of 35')
  assert.equal(p['Gate code'], '#4321', 'from the neighborhood list when the customer has none')
  assert.equal(p.HOA, 'Shadow Creek HOA')
  assert.equal(p['Lights down by'], 'Jan 15')
  assert.equal(p['Install type'], 'Early')
  assert.equal(p['Light color'], 'Warm white')
  assert.equal(p.Since, '2016')
  assert.equal(p['Original rate'], '$680.00')
  assert.equal(p['2026 install status'], 'Install Scheduled')
  assert.equal(p['2026 week of'], 'Nov 3-9')
  assert.equal(p['2026 day'], 'Thursday')
  assert.equal(p['2026 planned date'], 'Nov 6')
  assert.equal(p['2026 scheduling notes'], 'after 2 pm')
  assert.equal(p['2026 install rate'], '$460.00')
  assert.equal(p['2026 install discount'], '10%')
  assert.equal(p['2026 install total'], '$414.00')
  assert.equal(p['2026 install paid'], 'Yes')
  assert.equal(p['2026 install paid by'], 'PayPal')
  assert.equal(p['2026 install payment date'], '11/7/2026')
  assert.equal(p['2026 takedown status'], 'Takedown Scheduled')
  assert.equal(p['2026 takedown rate'], '150')
  assert.equal(p['2026 takedown paid'], 'No')
  assert.equal(p['What’s up'], 'Roofline C9 warm white 180 ft · 2 wrapped oaks')
})

test('csv: a customer with no record for the season gets the on-screen blank labels and empty cells, never "undefined"', () => {
  const csv = customersCsv([newbie], { season: '2026', gates })
  assert.ok(!csv.includes('undefined') && !csv.includes('null'))
  const [a] = parse(csv)
  assert.equal(a['2026 install status'], 'Not contacted')
  assert.equal(a['2026 takedown status'], 'Not scheduled')
  for (const k of ['2026 planned date', '2026 install rate', '2026 install paid', '2026 takedown rate', 'Email', 'HOA', 'What’s up', 'Other notes']) assert.equal(a[k], '', k)
  assert.equal(a['Install type'], 'Regular')
})

test('csv: exactly the rows given (the tab’s current filter), in that order; no rows = header only', () => {
  const all = [pat, newbie, { ...newbie, id: 'bo', fullName: 'Bo Tran', seasons: { 2026: { installStatus: 'Install Scheduled' } } }]
  const view = { mode: 'install', statuses: ['Install Scheduled'] }
  const shown = all.filter((c) => matchesView(c, view, '2026'))
  assert.deepEqual(parse(customersCsv(shown, { season: '2026' })).map((r) => r.Name), ['Pat Sample', 'Bo Tran'])
  const empty = customersCsv([], { season: '2026' })
  assert.equal(empty.slice(1).split('\r\n').length, 2, 'header and the trailing CRLF only')
})

test('csv: the columns option picks and orders; unknown keys are dropped; header has the season year', () => {
  const csv = customersCsv([pat], { season: '2025', columns: ['phone', 'bogus', 'name', 'status'] })
  assert.equal(csv.slice(1).split('\r\n')[0], '"Phone","Name","2025 install status"')
  assert.equal(parse(csv)[0]['2025 install status'], 'Not contacted', 'another season: blank')
  assert.ok(EXPORT_COLUMNS.length >= 30)
  assert.equal(new Set(EXPORT_COLUMNS.map(([k]) => k)).size, EXPORT_COLUMNS.length, 'keys unique')
  for (const [key, label, get] of EXPORT_COLUMNS) assert.ok(label && typeof get === 'function', key)
})

test('csvField: quotes always, doubles inner quotes, empties for null/undefined, numbers as text', () => {
  assert.equal(csvField('plain'), '"plain"')
  assert.equal(csvField('a "b" c'), '"a ""b"" c"')
  assert.equal(csvField(null), '""')
  assert.equal(csvField(undefined), '""')
  assert.equal(csvField(150), '"150"')
})

test('file names: customers (with a filter name), season by year and mode, dated', () => {
  assert.equal(exportFileName({ kind: 'customers', date: '2026-10-12' }), 'clc-customers-2026-10-12.csv')
  assert.equal(exportFileName({ kind: 'customers', tag: 'Needs scheduling!', date: '2026-10-12' }), 'clc-customers-needs-scheduling-2026-10-12.csv')
  assert.equal(exportFileName({ kind: 'season', season: '2026', mode: 'install', date: '2026-10-12' }), 'clc-season-2026-installs-2026-10-12.csv')
  assert.equal(exportFileName({ kind: 'season', season: '2026', mode: 'takedown', date: '2026-10-12' }), 'clc-season-2026-takedowns-2026-10-12.csv')
  assert.match(exportFileName(), /^clc-customers-\d{4}-\d{2}-\d{2}\.csv$/, 'defaults to today')
})
