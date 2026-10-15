// The old yearly customer sheets (Drive Takeout) -> payments for the history
// and the win-back list. Made-up people only. Spec: docs/specs/old-history.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkSheetDates, contactsOf, joinSheetPayments, money, paymentSignal, seasonOf, sheetDate, sheetPayments, viaOf } from '../scripts/old-site/customerLists.mjs'
import { paymentEntry } from '../scripts/old-site/oldHistory.mjs'
import { cleanRow, mergePeople, pastGroup } from '../src/lib/oldEstimates.js'
import { UNDATED, paymentPart, paymentsFromPast, seasonFills } from '../src/lib/oldPayments.js'

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

test('2022 workbook: a calendar year of money in; installs are the 2022 season, takedowns the 2021 install paid in 2022', () => {
  const pays = sheetPayments(REVENUE, 'Changes list.xlsx')
  assert.deepEqual(pays.map((p) => `${p.name}|${p.part}|${p.season}|${p.amount}|${p.via}|${p.date}`), [
    'Erin Sample|install|2022|362.1|Square|2022-12-01',
    'Gale Test|install|2022|500|Check|2022-12-01',
    'Erin Sample|takedown|2021|100|Zelle|2022-01-15',
  ])
  assert.ok(pays.every((p) => p.paidYear === 2022 && p.undated && p.items.some((t) => UNDATED.test(t))))
  assert.deepEqual(pays[2].items, ['2021 takedown (customer list: 2022 revenue sheet)', 'Paid in 2022 (payment date not on the sheet)'])
  // Paid in 2022 → dated 2022, and the Payment date says 2022 (taxes), never a made-up day.
  assert.ok(pays.every((p) => p.date.startsWith('2022')))
  const fills = seasonFills(pays.map((p) => ({ ...paymentEntry(p).data, customerId: 'c1' })), { seasons: {} })
  assert.deepEqual(fills.map((s) => [s.season, Object.keys(s.parts).join('+'), s.fills.find((f) => f.path.endsWith('paymentDate'))?.value]), [
    ['2022', 'install', '2022'],
    ['2021', 'takedown', '2022'],
  ])
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

test('cross-reference: a mail payment of the same amount wins over a sheet line with another method; invoices date undated lines', () => {
  const [alex, , casey] = sheetPayments(ACCOUNTS, 'a.xlsx')
  // The sheet says Zelle, but a PayPal email shows the same $450 install that season: the email is the record.
  const paypal = { kind: 'payment', via: 'PayPal', date: '2023-11-02T15:00:00Z', amount: 450, name: 'Alex Sample', email: '', items: ['Christmas light install'] }
  assert.deepEqual(joinSheetPayments([alex], [], [paypal]).kept, [])
  // A takedown payment by PayPal doesn't cancel the install line.
  assert.equal(joinSheetPayments([alex], [], [{ ...paypal, date: '2024-01-10', items: ['Take down'] }]).kept.length, 1)
  // An undated line takes its invoice's date; the payment day stays unknown.
  const invoice = { kind: 'invoice', via: 'PayPal', date: '2023-10-20T12:00:00Z', amount: 200, invoice: '2023-12', name: 'Casey Test', email: '' }
  const { kept: [dated], invoiceDated } = joinSheetPayments([casey], [], [invoice, { ...invoice, date: '2023-10-25', invoice: '2023-19' }])
  assert.equal(invoiceDated, 1)
  assert.equal(dated.date, '2023-10-20', 'the first matching invoice')
  assert.equal(dated.undated, true)
  assert.deepEqual(dated.items.slice(-2), ['PayPal invoice sent 10/20/2023 (#2023-12)', 'Payment date not on the sheet'])
  // Another amount or another person: no date taken.
  assert.equal(joinSheetPayments([casey], [], [{ ...invoice, amount: 600 }]).kept[0].date, '2023-11-08')
  assert.equal(joinSheetPayments([casey], [], [{ ...invoice, name: 'Someone Else' }]).kept[0].date, '2023-11-08')
  // By invoice number when the names differ.
  const byNumber = { ...casey, invoice: '1001' }
  assert.equal(joinSheetPayments([byNumber], [], [{ ...invoice, name: 'C. Test', invoice: '1001' }]).kept[0].date, '2023-10-20')
})

test('cross-reference: a line paid in 2022 only takes a 2022 invoice date', () => {
  const takedown = sheetPayments(REVENUE, 'r.xlsx')[2] // Erin Sample, 2021 takedown paid in 2022
  const inv = { kind: 'invoice', via: 'Square', amount: 100, name: 'Erin Sample', email: '', invoice: '2021301', items: ['Takedown'] }
  assert.equal(joinSheetPayments([takedown], [], [{ ...inv, date: '2021-12-20' }]).kept[0].date, '2022-01-15', 'a December 2021 invoice is not 2022 money')
  const [dated] = joinSheetPayments([takedown], [], [{ ...inv, date: '2022-01-04' }]).kept
  assert.equal(dated.date, '2022-01-04')
  assert.ok(dated.items.includes('Square invoice sent 1/4/2022 (#2021301)'))
  // Still "Paid in 2022" for the Payment date.
  const [s] = seasonFills([{ ...paymentEntry(dated).data, customerId: 'c1' }], { seasons: {} })
  assert.deepEqual([s.season, s.fills.find((f) => f.path.endsWith('paymentDate'))?.value], ['2021', '2022'])
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

test('payment messages: we say it arrived, or they say they sent it; questions, plans and hedges don\'t count', () => {
  // Ours (outgoing).
  for (const s of ['Payment received, thank you so much.', 'I just confirmed your payment, it was received and you’re good.', 'Got your check today, thanks!', 'Thank you for your payment!', 'Your balance is paid in full.']) {
    assert.ok(paymentSignal('out', '', s), s)
  }
  for (const s of ['We will send a payment confirmation once received.', 'Did you get the invoice?', 'Please send your payment via Zelle.', 'If you have not received an email, call us.']) {
    assert.equal(paymentSignal('out', '', s), null, s)
  }
  // Theirs (incoming).
  for (const s of ['I paid the invoice with Zelle.', 'Just paid it', 'Payment sent.', 'The check is under the mat by my front door.', 'I Zelled it', 'Sent $450 on Venmo']) {
    assert.ok(paymentSignal('in', '', s), s)
  }
  for (const s of ['I will leave the check under the mat', 'I think we paid 1250 for both', 'Do you need a deposit or paid in full?', 'You sent me the invoice for $450', 'I wanted to check back in with you']) {
    assert.equal(paymentSignal('in', '', s), null, s)
  }
  // The direction matters: our "we sent the invoice" isn't a payment; their "thanks for the payment" isn't either.
  assert.equal(paymentSignal('out', '', 'I sent the payment link.'), null)
  assert.deepEqual(paymentSignal('in', 'Re: lights', 'Sent the $1,310 by Zelle.\n\nOn Mon, Dec 4, 2023 Scott wrote:\n> thank you for your payment')?.amounts, [1310])
  // Only the new part of an email counts, not the quoted one under it.
  assert.equal(paymentSignal('out', 'Re: lights', 'See you Monday.\n\nOn Mon, Dec 4, 2023 Pat wrote:\n> I paid today.'), null)
})

test('dates checked against texts and emails, and tagged with where they come from', () => {
  const book = sheetPayments(REVENUE, 'r.xlsx') // undated: Erin install 2022, Gale install 2022, Erin takedown 2021 (paid 2022)
  const [alex] = sheetPayments(ACCOUNTS, 'a.xlsx') // dated 11/3/2023
  const withContacts = [
    { ...book[0], phone: '281-555-0110' },
    { ...book[1], email: 'gale@example.com' },
    { ...book[2], phone: '281-555-0110' },
    { ...alex, phone: '' },
  ]
  const text = (at, direction, body, phone = '+12815550110') => ({ id: `t${at}`, data: { kind: 'text', direction, at, phone, text: body } })
  const messages = [
    text('2022-11-20T15:00:00Z', 'in', 'I paid the invoice with Zelle.'),
    text('2022-11-21T15:00:00Z', 'out', 'Payment received, thank you!'), // ours wins over theirs
    text('2022-01-09T15:00:00Z', 'in', 'Sent $100 for the takedown.'), // the 2021 takedown, paid January 2022
    text('2022-02-01T15:00:00Z', 'in', 'Sent $95 for the takedown.'), // another amount: not this line
    { id: 'e1', data: { kind: 'email', direction: 'out', at: '2022-12-05T10:00:00Z', subject: 'Re: lights', text: 'Got your check, thank you!' }, match: { emails: ['GALE@example.com'] } },
    { id: 'e2', data: { kind: 'email', direction: 'in', at: '2023-11-04T10:00:00Z', subject: 'Paid', text: 'Just paid it.' }, match: { emails: ['alex@example.com'] } },
    text('2021-12-01T15:00:00Z', 'in', 'Payment sent.'), // outside every window here
  ]
  const { pays, counts } = checkSheetDates(withContacts, messages)
  const [erin, gale, erinTd, alexOut] = pays
  assert.equal(erin.date, '2022-11-21')
  assert.equal(erin.undated, false)
  assert.ok(erin.items.at(-1).startsWith('Date from our text of 11/21/2022: “Payment received'))
  assert.ok(!erin.items.some((t) => UNDATED.test(t)), 'no longer "not on the sheet"')
  assert.equal(gale.date, '2022-12-05')
  assert.ok(gale.items.at(-1).startsWith('Date from our email of 12/5/2022'))
  assert.equal(erinTd.date, '2022-01-09')
  assert.equal(erinTd.season, 2021)
  assert.equal(alexOut.date, '2023-11-03', 'a sheet date stays')
  assert.ok(alexOut.items.at(-1).startsWith('Date checked: their email of 11/4/2023'))
  assert.deepEqual(counts, { 'sheet payment dated by a text or email': 3, 'sheet payment date checked by a text or email': 1, 'sheet payment date from the sheet only': 0 })
  // Nothing found: the sheet date is labelled as such; an undated line stays undated.
  const lone = checkSheetDates([{ ...alex, email: 'nobody@example.com' }, book[1]], messages).pays
  assert.equal(lone[0].items.at(-1), 'Date from the sheet (no text or email about it found)')
  assert.equal(lone[1].undated, true)
  // A contact-book number for the same full name finds the texts too.
  const viaBook = checkSheetDates([book[0], book[1]], messages, new Map([['erin sample', ['(281) 555-0110']], ['gale test', ['Gale@Example.com']]])).pays[0]
  assert.equal(viaBook.date, '2022-11-21')
  // …and an email found for the same full name (any case) finds the emails.
  const galeByName = checkSheetDates([book[1]], messages, new Map([['gale test', ['Gale@Example.com']]])).pays[0]
  assert.equal(galeByName.date, '2022-12-05')
  // Filed under that date: the Seasons fill takes the real day now.
  const [s] = seasonFills([{ ...paymentEntry(erinTd).data, customerId: 'c1' }], { seasons: {} })
  assert.deepEqual([s.season, s.fills.find((f) => f.path.endsWith('paymentDate'))?.value], ['2021', '1/9/2022'])
})

test('a sheet line\'s own label decides install or takedown, whatever a quote under it says', () => {
  assert.equal(paymentPart({ at: '2022-11-21', text: 'Paid $100.00 by Zelle\n2022 install (customer list: 2022 revenue sheet)\nDate from their text of 11/21/2022: “Sent it for the install and takedown.”' }), 'install')
  assert.equal(paymentPart({ at: '2022-11-21', text: 'Paid $100.00 by Zelle\n2021 takedown (customer list: 2022 revenue sheet)' }), 'takedown')
})
