// The old yearly customer sheets (Drive Takeout) -> payments for the history
// and the win-back list. Made-up people only. Spec: docs/specs/old-history.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contactsOf, joinSheetPayments, money, seasonOf, sheetDate, sheetPayments, viaOf } from '../scripts/old-site/customerLists.mjs'
import { paymentEntry } from '../scripts/old-site/oldHistory.mjs'
import { cleanRow, mergePeople, pastGroup } from '../src/lib/oldEstimates.js'
import { UNDATED, paymentsFromPast, seasonFills } from '../src/lib/oldPayments.js'

// The "Accounts" layout (one row per customer), as in the 2023 and 2024 lists.
const ACCOUNTS = [
  ['Full Name', 'Last Name', 'First Name', 'Email Address', 'Scheduling Status', 'Install Rate', 'Discount', 'Total Due', 'Since', 'Original Rate', 'Invoice', 'Paid', 'Payment To', 'Payment Type', 'Payment Date', 'TD: Rate', 'TD: Invoice', 'TD: Paid', 'Payment To', 'Payment Type', 'TD: Payment Date'],
  ['Alex Sample', 'Sample', 'Alex', 'alex@example.com', 'Installed on 11/3/23', '500', '50', '450', '2019', '500', '1001.0', 'Yes', 'CLC', 'Zelle', '45233', '150', '1002', 'Yes', 'CLC', 'Check', '45306'],
  ['Blair Example', 'Example', 'Blair', 'blair@example.com; other@example.com', 'Not doing lights this year', '400', '', '', '', '', '', '', '', '', '', '', '', 'N/A', '', 'N/A', 'N/A'],
  ['Casey Test', 'Test', 'Casey', '', 'Installed on 11/8/2023', '600', '', '', '2021', '', '', '1/2 payment ($200)', '', 'Venmo', ''],
  ['Dana Demo', 'Demo', 'Dana', 'Dana@Example.com', 'Installed on 11/10/23', '300', '', '300', '', '', '', 'yes', '', 'PP', '45240'],
  ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
]

// The 2022 revenue workbook: titled blocks, a totals row, a summary, takedowns.
const REVENUE = [
  ['CLC Customer Install Info'],
  ['FIRST NAME', 'LAST NAME', 'PAID', 'PAYMENT \nTYPE', "REC'D", "TD'S", 'NOTES'],
  ['Erin', 'Sample', '362.1', 'CC', 'CLC', '', ''],
  ['Frank', 'Example', 'PP', 'PP', '', '', ''],
  ['Gale', 'Test', '500', 'Check', 'C. Adams', '', ''],
  ['', '', '862.1', '', '', '', ''],
  ['2022 CLC REVENUE BREAKDOWN'],
  ['C. Adams', '', '650', '900', '2090', '700', '4340'],
  ['CLC Client Take Down Info'],
  ['FIRST NAME', 'LAST NAME', 'OWES', 'PAID', 'PAYMENT TYPE', "REC'D"],
  ['Erin', 'Sample', '', '100', 'zelle', 'CLC'],
]

test('sheet dates: Excel day numbers and US dates; junk gives nothing', () => {
  assert.equal(sheetDate('45233'), '2023-11-03')
  assert.equal(sheetDate('45306'), '2024-01-15')
  assert.equal(sheetDate('11/3/23'), '2023-11-03')
  assert.equal(sheetDate('11/28/2024 (PP Payment)'), '2024-11-28')
  assert.equal(sheetDate('11/11/2024 (deposit) / 11/30/2024'), '2024-11-11')
  for (const junk of ['10/212023', 'N/A', '', '13/40/2023', 'Yes']) assert.equal(sheetDate(junk), '', junk)
  assert.equal(seasonOf('2024-01-15'), 2023)
  assert.equal(seasonOf('2023-11-03'), 2023)
})

test('amounts and payment methods in the sheets\' own words', () => {
  assert.equal(money('$1,234.50'), 1234.5)
  assert.equal(money('414'), 414)
  assert.equal(money('1482 (741)'), 1482)
  assert.equal(money('N/A'), 0)
  assert.equal(viaOf('PP'), 'PayPal')
  assert.equal(viaOf('CC'), 'Square')
  assert.equal(viaOf(' check '), 'Check')
  assert.equal(viaOf('CashApp'), 'CashApp')
  assert.equal(viaOf('?'), '')
})

test('Accounts layout: install and takedown payments, partial payments, nothing for the unpaid', () => {
  const pays = sheetPayments(ACCOUNTS, '2024 Customer List original.xlsx')
  // The dates say 2023, whatever the file is called.
  assert.ok(pays.every((p) => p.season === 2023))
  assert.deepEqual(pays.map((p) => `${p.name}|${p.part}|${p.amount}|${p.via}`), [
    'Alex Sample|install|450|Zelle',
    'Alex Sample|takedown|150|Check',
    'Casey Test|install|200|Venmo',
    'Dana Demo|install|300|PayPal',
  ])
  const [install, takedown, partial, paypal] = pays
  assert.equal(install.date, '2023-11-03')
  assert.equal(install.undated, false)
  assert.equal(install.invoice, '1001')
  assert.equal(install.email, 'alex@example.com')
  assert.deepEqual(install.items, ['2023 install (customer list)', 'Installed 11/3/2023', 'Customer since 2019'])
  assert.equal(takedown.date, '2024-01-15')
  assert.deepEqual(takedown.items, ['2023 takedown (customer list)', 'Customer since 2019'])
  // No payment date: the install date stands in, and the text says so.
  assert.equal(partial.date, '2023-11-08')
  assert.equal(partial.undated, true)
  assert.ok(partial.items.some((t) => UNDATED.test(t)))
  assert.equal(paypal.email, 'dana@example.com')
  // Same line, same id on every run.
  assert.equal(sheetPayments(ACCOUNTS, 'x.xlsx')[0].id, install.id)
})

test('2022 workbook: install and takedown blocks by their titles; totals and summaries are not people', () => {
  const pays = sheetPayments(REVENUE, 'Changes list.xlsx')
  assert.ok(pays.every((p) => p.season === 2022), 'season from the "2022 CLC REVENUE" heading')
  assert.deepEqual(pays.map((p) => `${p.name}|${p.part}|${p.amount}|${p.via}|${p.date}`), [
    'Erin Sample|install|362.1|Square|2022-12-01',
    'Gale Test|install|500|Check|2022-12-01',
    'Erin Sample|takedown|100|Zelle|2023-01-15',
  ])
  assert.ok(pays.every((p) => p.undated && p.items.some((t) => UNDATED.test(t))))
})

test('season from the file name only when nothing else says it; no season, no payments', () => {
  const noDates = [['Full Name', 'Paid', 'Payment Type', 'Total Due'], ['Hana Sample', 'Yes', 'Cash', '250']]
  assert.equal(sheetPayments(noDates, 'Customer list 2021.xlsx')[0].season, 2021)
  assert.deepEqual(sheetPayments(noDates, 'Customer list.xlsx'), [])
  // A list with no amounts (the payment-method summary) gives nothing.
  assert.deepEqual(sheetPayments([['Full Name', 'Paid', 'Payment Type'], ['Hana Sample', 'Yes', 'Zelle']], 'Analysis 2023.xlsx'), [])
})

test('contacts from any sheet: phone, street with town, first email; mass-email lists by Recipient', () => {
  assert.deepEqual(contactsOf([
    ['Full Name', 'Phone Number', 'Address', 'City', 'Email Address'],
    ['Dana Demo', '281-555-0100', '1 Main St', 'Pearland', 'dana@example.com, dd@example.com'],
    ['Solo', '281-555-0199', '', '', ''],
    ['Eli Nobody', '', '', '', ''],
  ]), [{ name: 'Dana Demo', phone: '281-555-0100', address: '1 Main St, Pearland', email: 'dana@example.com' }])
  assert.deepEqual(contactsOf([['First name', 'Last name', 'Recipient', 'Description'], ['Erin', 'Sample', 'Erin@Example.com', 'Install']]),
    [{ name: 'Erin Sample', phone: '', address: '', email: 'erin@example.com' }])
})

test('join: contact details by name; a PayPal/Square line the mail already shows is dropped; repeats count once', () => {
  const [alex, , , dana] = sheetPayments(ACCOUNTS, 'a.xlsx')
  const contacts = [{ name: 'DANA  demo', phone: '281-555-0100', address: '1 Main St, Pearland', email: '' }, { name: 'Alex Sample', phone: '281-555-0101', address: '', email: 'other@example.com' }]
  const mail = [{ kind: 'payment', via: 'PayPal', date: '2023-11-12T10:00:00Z', email: 'dana@example.com', name: '' }]
  const { kept, dropped } = joinSheetPayments([alex, alex, dana], contacts, mail)
  assert.equal(dropped, 1)
  assert.equal(kept.length, 1)
  assert.equal(kept[0].phone, '281-555-0101')
  assert.equal(kept[0].email, 'alex@example.com', 'the sheet\'s own email wins')
  // The same PayPal line in another season stays.
  const later = { ...dana, season: 2024, id: 'other' }
  assert.equal(joinSheetPayments([later], [], mail).kept.length, 1)
})

test('a Zelle line goes through the Past requests import as a payment (win-back), not as a request', () => {
  const row = { Date: '2023-11-03', Source: 'Zelle', Email: 'alex@example.com', Phone: '281-555-0101', Address: '', 'All fields': 'Name: Alex Sample', Kind: 'payment', Amount: '450', Invoice: '1001', Items: '2023 install (customer list) · Installed 11/3/2023' }
  const r = cleanRow(row)
  assert.equal(r.payment.via, 'Zelle')
  assert.equal(r.payment.amount, 450)
  assert.equal(r.phone, '281-555-0101')
  const [person] = mergePeople([r])
  assert.equal(pastGroup(person), 'winback')
  assert.equal(person.paid, 450)
})

test('season billing: Zelle fills the payment type; an undated sheet payment never fills a payment date', () => {
  const [install, takedown] = sheetPayments(ACCOUNTS, 'a.xlsx')
  const undatedTd = { ...takedown, via: 'Not noted', undated: true, items: [...takedown.items, 'Payment date not on the sheet'] }
  const entries = [paymentEntry(install), paymentEntry(undatedTd)].map((e) => ({ ...e.data, customerId: 'c1' }))
  const [s] = seasonFills(entries, { seasons: {} })
  assert.equal(s.season, '2023')
  assert.deepEqual(s.fills, [
    { path: 'seasons.2023.install.total', value: '$450.00' },
    { path: 'seasons.2023.install.paid', value: 'Yes' },
    { path: 'seasons.2023.install.paymentType', value: 'Zelle' },
    { path: 'seasons.2023.install.paymentDate', value: '11/3/2023' },
    { path: 'seasons.2023.takedown.rate', value: '$150.00' },
    { path: 'seasons.2023.takedown.paid', value: 'Yes' },
  ])
  assert.equal(s.parts.takedown.date, '')
  assert.equal(s.parts.takedown.via, '')
  // The same line from a Past requests card behaves the same.
  const card = { payments: [{ date: '2023-11-08', via: 'Venmo', kind: 'payment', amount: 200, items: '2023 install (customer list) · Payment date not on the sheet' }] }
  const [fromCard] = seasonFills(paymentsFromPast(card, 'c2'), { seasons: {} })
  assert.ok(!fromCard.fills.some((f) => f.path.endsWith('paymentDate')))
  assert.ok(fromCard.fills.some((f) => f.path.endsWith('paymentType') && f.value === 'Venmo'))
})
