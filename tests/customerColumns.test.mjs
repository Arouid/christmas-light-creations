import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CUSTOMER_COLUMNS, DEFAULT_CUSTOMER_COLUMNS, columnValue, readColumns } from '../src/lib/customerColumns.js'

test('stored column picks: junk or empty falls back to the default, unknown keys dropped, table order kept', () => {
  assert.deepEqual(readColumns(null), DEFAULT_CUSTOMER_COLUMNS)
  assert.deepEqual(readColumns('not json'), DEFAULT_CUSTOMER_COLUMNS)
  assert.deepEqual(readColumns('[]'), DEFAULT_CUSTOMER_COLUMNS)
  assert.deepEqual(readColumns('{"a":1}'), DEFAULT_CUSTOMER_COLUMNS)
  assert.deepEqual(readColumns('["status","bogus","name"]'), ['name', 'status'])
  assert.ok(CUSTOMER_COLUMNS.length >= 15)
})

test('cell values: blank statuses get their labels, gate code comes from the neighborhood list', () => {
  const c = { fullName: 'Ann Lee', firstName: 'Ann', lastName: 'Lee', neighborhood: 'Shadow Creek', installType: 'Early Install', seasons: { 2026: { weekOf: 'Nov 3' } } }
  const gates = [{ neighborhood: 'shadow creek', code: '#4321' }]
  assert.equal(columnValue(c, 'name', '2026'), 'Lee Ann')
  assert.equal(columnValue(c, 'status', '2026'), 'Not contacted')
  assert.equal(columnValue(c, 'takedown', '2026'), 'Not scheduled')
  assert.equal(columnValue(c, 'type', '2026'), 'Early')
  assert.equal(columnValue(c, 'week', '2026'), 'Nov 3')
  assert.equal(columnValue(c, 'gate', '2026', gates), '#4321')
  assert.equal(columnValue(c, 'nothing', '2026'), '')
})
