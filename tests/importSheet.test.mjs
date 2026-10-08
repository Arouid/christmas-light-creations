// Importer test with made-up rows shaped like the real Google Sheet tabs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCustomers } from '../src/lib/importSheet.js'
import { seasonYear, customerId } from '../src/lib/customers.js'

const scheduling = [
  ['Full Name', 'Last Name', 'First Name', 'Install Scheduling Status', 'Take Down Scheduling', 'Day', 'Week Of',
    'Planned\nDate', '2026 Scheduling Notes', '2026 Install / Takedown Notes', 'Install Block', 'Location Block',
    'Phone \nNumber', 'Gate Code', 'Address', 'City', 'Email Address', '2025 Install Scheduling Status', '2025 Day', '2025 Planned\nDate'],
  ['Test Person', 'Person', 'Test', 'Install Scheduled', '', 'Thursday', 'Oct 11-17', 'Oct 15', 'wants first',
    'Left side: 2 zip ties', 'Early Install', 'Pearland - East side of 35', '555-0100', '1234',
    '1 Example St Pearland, TX 77581', 'Pearland', 'test@example.com', 'Install Completed', 'Monday', 'Nov 20'],
  ['Only Scheduling', 'Scheduling', 'Only', '', '', '', '', '', '', '', 'Regular Install', 'Galveston', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
]
const accounts = [
  ['Full Name', 'Install Rate', 'Discount', 'Total Due', 'Since', 'Invoice', 'Paid', 'Payment Type', 'Payment Date',
    'TD: Rate', 'TD: Invoice', 'TD: Paid', 'Payment Type', 'TD: Payment Date', 'Notes', 'Price Adjustments for 2027'],
  ['Test Person', '$460.00', '10%', '$414.00', '2011', 'PP Invoice Sent', 'Yes', 'PayPal', '11/26/2025',
    '150', 'PayPal Invoice Sent', 'Yes', 'Venmo', '1/12/2026', 'was $345', '+5%'],
  ['Only Accounts', '$300.00', '0', '$300.00', '2023', '', '', '', '', '', '', '', '', '', '', ''],
]

test('maps both tabs into one customer with current and previous seasons', () => {
  const { customers, currentSeason, previousSeason } = buildCustomers(scheduling, accounts)
  assert.equal(currentSeason, '2026')
  assert.equal(previousSeason, '2025')
  const c = customers.find((x) => x.id === 'test-person').data
  assert.equal(c.phone, '555-0100')
  assert.equal(c.gateCode, '1234')
  assert.equal(c.takedownNotes, 'Left side: 2 zip ties')
  assert.equal(c.installType, 'Early Install')
  assert.equal(c.priceAdjustments, '+5%')
  assert.equal(c.seasons['2026'].installStatus, 'Install Scheduled')
  assert.equal(c.seasons['2026'].plannedDate, 'Oct 15')
  assert.equal(c.seasons['2026'].install.rate, '$460.00')
  assert.equal(c.seasons['2026'].takedown.rate, '150')
  assert.equal(c.seasons['2025'].plannedDate, 'Nov 20')
  assert.equal(c.seasons['2025'].install.paymentType, 'PayPal')
  assert.equal(c.seasons['2025'].takedown.paymentType, 'Venmo', 'second "Payment Type" column is the takedown one')
})

test('blank cells are left out so re-imports never erase app edits', () => {
  const c = buildCustomers(scheduling, accounts).customers.find((x) => x.id === 'only-scheduling').data
  assert.equal('phone' in c, false)
  assert.equal('install' in (c.seasons?.['2026'] ?? {}), false)
})

test('names on only one tab are kept and reported; empty rows skipped', () => {
  const { customers, warnings } = buildCustomers(scheduling, accounts)
  assert.deepEqual(customers.map((c) => c.id).sort(), ['only-accounts', 'only-scheduling', 'test-person'])
  assert.equal(warnings.length, 2)
})

test('duplicate names get distinct ids', () => {
  const rows = [scheduling[0], scheduling[1], scheduling[1]]
  const ids = buildCustomers(rows).customers.map((c) => c.id)
  assert.deepEqual(ids, ['test-person', 'test-person-2'])
})

test('wrong file is rejected with a clear message', () => {
  assert.throws(() => buildCustomers([['Neighborhood', 'Code']]), /Full Name/)
})

test('season year: Oct–Dec is that year, Jan takedowns belong to the previous season', () => {
  assert.equal(seasonYear(new Date(2026, 9, 8)), '2026')
  assert.equal(seasonYear(new Date(2027, 0, 12)), '2026')
  assert.equal(customerId("Amanda Barnett-Guidry"), 'amanda-barnett-guidry')
})
