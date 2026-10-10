import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays, dueDateFor, invoiceCents, invoiceEmail, invoiceNumber, invoiceState, invoiceSummary, itemsProblem, listTotals,
  paidInfo, payableInvoiceProblem, receiptEmail, reminderDue, seasonFillsOnPaid, seasonFillsOnSend, sendProblems,
  shownInvoice, staffPaidEmail, toCents, validToken,
} from '../functions/invoices.js'
import { bulkCandidates, customerSnapshot, newInvoice } from '../src/lib/invoices.js'

const item = (description, cents) => ({ id: description, description, cents })
const inv = (over = {}) => ({
  status: 'open', customerId: 'pat-sample', customer: { name: 'Pat Sample', email: 'pat@example.com', address: '1 Main St' },
  season: '2026', kind: 'install', items: [item('Re-install', 45000)], terms: 'receipt', dueDate: '2026-11-01', number: 'CLC-2026-0007',
  sent: { invoice: { at: Date.parse('2026-11-01T15:00:00Z') } }, ...over,
})
const H = 60 * 60 * 1000

test('totals in cents, negative discount lines allowed, total must be above $0', () => {
  assert.equal(invoiceCents(inv({ items: [item('A', 45000), item('Early install discount', -4500)] })), 40500)
  assert.equal(itemsProblem([item('A', 45000), item('Discount', -4500)]), null)
  assert.match(itemsProblem([item('Discount', -100)]), /more than \$0/)
  assert.match(itemsProblem([]), /at least one/)
  assert.match(itemsProblem([item('', 100)]), /description/)
  assert.match(itemsProblem([{ description: 'x', cents: 10.5 }]), /amount/)
  assert.match(itemsProblem([item('A', 0)]), /amount/)
  assert.match(itemsProblem(Array.from({ length: 31 }, (_, i) => item(`L${i}`, 100))), /At most 30/)
  assert.match(itemsProblem([item('Typo', 6_000_000)]), /too big/)
  assert.equal(toCents('$1,250.5'), 125050)
  assert.equal(toCents('-20'), -2000)
  assert.equal(toCents('abc'), null)
})

test('numbers: CLC-year-0001, four digits, restart is the counter’s job', () => {
  assert.equal(invoiceNumber('2026', 1), 'CLC-2026-0001')
  assert.equal(invoiceNumber('2027', 142), 'CLC-2027-0142')
  assert.equal(invoiceNumber('2027', 12345), 'CLC-2027-12345')
})

test('due date on send: on receipt by default, 7/14 days, or a picked date', () => {
  assert.equal(dueDateFor({ terms: 'receipt' }, '2026-11-01'), '2026-11-01')
  assert.equal(dueDateFor({}, '2026-11-01'), '2026-11-01')
  assert.equal(dueDateFor({ terms: 'net7' }, '2026-12-28'), '2027-01-04')
  assert.equal(dueDateFor({ terms: 'net14' }, '2026-11-01'), '2026-11-15')
  assert.equal(dueDateFor({ terms: 'date', dueDate: '2026-12-01' }, '2026-11-01'), '2026-12-01')
  assert.equal(addDays('2026-02-27', 2), '2026-03-01')
})

test('state: overdue only when open and past the due date', () => {
  assert.equal(invoiceState(inv(), '2026-11-01'), 'open')
  assert.equal(invoiceState(inv(), '2026-11-02'), 'overdue')
  assert.equal(invoiceState(inv({ status: 'paid' }), '2027-01-01'), 'paid')
  assert.equal(invoiceState(inv({ status: 'void' }), '2027-01-01'), 'void')
  assert.equal(invoiceState(inv({ status: 'draft', dueDate: '' }), '2027-01-01'), 'draft')
})

test('payable: only sent, unpaid, not voided, something due', () => {
  assert.equal(payableInvoiceProblem(inv()), null)
  assert.equal(payableInvoiceProblem(null)[0], 'not-found')
  assert.match(payableInvoiceProblem(inv({ status: 'draft' }))[1], /isn’t ready/)
  assert.match(payableInvoiceProblem(inv({ status: 'void' }))[1], /cancelled/)
  assert.equal(payableInvoiceProblem(inv({ status: 'paid' }))[0], 'already-exists')
  assert.equal(payableInvoiceProblem(inv({ payment: { status: 'paid' } }))[0], 'already-exists')
  assert.equal(payableInvoiceProblem(inv({ items: [item('Credit', -100)] }))[0], 'failed-precondition')
  assert.equal(validToken('abcDEF23456789xyzABCDEFG'), true)
  assert.equal(validToken('short'), false)
  assert.equal(validToken('abcdefghijklmnop/q'), false)
})

test('send needs a customer, season, kind, a good due date and good lines', () => {
  assert.deepEqual(sendProblems(inv()), [])
  const p = sendProblems({ ...inv(), customerId: '', season: '', kind: 'x', terms: 'date', dueDate: '', items: [] })
  assert.equal(p.length, 5)
})

test('paid info: online (PayPal/Venmo/card) or marked paid by staff', () => {
  const online = paidInfo(inv({ status: 'paid', payment: { status: 'paid', cents: 45000, captureId: 'CAP1', source: 'venmo', env: 'live', paidAt: Date.parse('2026-11-03T02:00:00Z') } }))
  assert.deepEqual(online, { id: 'CAP1', online: true, method: 'Venmo', date: '2026-11-02', cents: 45000, sandbox: false })
  const off = paidInfo(inv({ status: 'paid', offline: { method: 'Check', date: '2026-11-05', note: '#1043', by: 'boss@example.com', at: 1700000000000 } }))
  assert.equal(off.id, 'off1700000000000')
  assert.equal(off.method, 'Check')
  assert.equal(off.cents, 45000)
  assert.equal(paidInfo(inv()), null)
  // Undo (offline removed, back to open) → not paid.
  assert.equal(paidInfo(inv({ status: 'open', offline: undefined })), null)
})

test('season billing: install fills Total due, takedown fills Rate; only empty boxes; Paid No → Yes', () => {
  const paid = { online: true, method: 'Card', date: '2026-11-02', cents: 40500 }
  const fills = seasonFillsOnPaid(inv(), { seasons: { 2026: { install: { paid: 'No', rate: '$450.00' } } } }, paid)
  assert.deepEqual(fills, [
    { path: 'seasons.2026.install.total', value: '$405.00' },
    { path: 'seasons.2026.install.paid', value: 'Yes' },
    { path: 'seasons.2026.install.paymentType', value: 'PayPal' },
    { path: 'seasons.2026.install.paymentDate', value: '11/2/2026' },
  ])
  // Staff already filled everything: nothing changes.
  const full = { seasons: { 2026: { install: { total: '$400.00', paid: 'Yes', paymentType: 'Zelle', paymentDate: '11/1/2026' } } } }
  assert.deepEqual(seasonFillsOnPaid(inv(), full, paid), [])
  const td = seasonFillsOnPaid(inv({ kind: 'takedown', season: '2026', items: [item('Takedown', 15000)] }), {}, { online: false, method: 'Cash', date: '2027-01-12', cents: 15000 })
  assert.deepEqual(td.map((f) => f.path), ['seasons.2026.takedown.rate', 'seasons.2026.takedown.paid', 'seasons.2026.takedown.paymentType', 'seasons.2026.takedown.paymentDate'])
  assert.equal(td[2].value, 'Cash')
  assert.equal(seasonFillsOnPaid(inv({ kind: 'addon' }), {}, paid).length, 0)
  assert.equal(seasonFillsOnPaid(inv({ kind: 'service' }), {}, paid).length, 0)
  assert.equal(seasonFillsOnPaid(inv(), {}, null).length, 0)
})

test('on send: Invoice box says CLC Invoice Sent when empty or Not Yet Invoiced', () => {
  assert.deepEqual(seasonFillsOnSend(inv(), {}), [{ path: 'seasons.2026.install.invoice', value: 'CLC Invoice Sent' }])
  assert.equal(seasonFillsOnSend(inv(), { seasons: { 2026: { install: { invoice: 'Not Yet Invoiced' } } } }).length, 1)
  assert.equal(seasonFillsOnSend(inv(), { seasons: { 2026: { install: { invoice: 'PP Invoice Sent' } } } }).length, 0)
  assert.equal(seasonFillsOnSend(inv({ kind: 'other' }), {}).length, 0)
})

test('reminders: 7 and 14 days past due, once each, stop when paid/voided/off', () => {
  const now = Date.parse('2026-11-08T15:00:00Z')
  assert.equal(reminderDue(inv(), '2026-11-07', now), null)
  assert.equal(reminderDue(inv(), '2026-11-08', now), 7)
  assert.equal(reminderDue(inv({ sent: { invoice: { at: 1 }, reminder_7: { at: 2 } } }), '2026-11-10', now), null)
  assert.equal(reminderDue(inv({ sent: { invoice: { at: 1 }, reminder_7: { at: 2 } } }), '2026-11-15', now), 14)
  assert.equal(reminderDue(inv({ sent: { invoice: { at: 1 }, reminder_7: { at: 2 }, reminder_14: { at: 3 } } }), '2026-12-30', now), null)
  // Missed days catch up with the latest one only.
  assert.equal(reminderDue(inv(), '2026-11-20', now), 14)
  assert.equal(reminderDue(inv({ sent: { invoice: { at: 1 }, reminder_14: { at: 3 } } }), '2026-11-20', now), null)
  assert.equal(reminderDue(inv({ status: 'paid' }), '2026-11-20', now), null)
  assert.equal(reminderDue(inv({ status: 'void' }), '2026-11-20', now), null)
  assert.equal(reminderDue(inv({ remindersOff: true }), '2026-11-20', now), null)
  assert.equal(reminderDue(inv({ customer: { name: 'Pat', email: '' } }), '2026-11-20', now), null)
  // Never sent (no email at send time): no reminder either.
  assert.equal(reminderDue(inv({ sent: {} }), '2026-11-20', now), null)
  // Emailed again a few hours ago: wait.
  assert.equal(reminderDue(inv({ sent: { invoice: { at: 1 }, again_5: { at: now - 3 * H } } }), '2026-11-08', now), null)
  assert.equal(reminderDue(inv({ sent: { invoice: { at: 1 }, again_5: { at: now - 21 * H } } }), '2026-11-08', now), 7)
})

test('staff list totals: open includes overdue; paid counts what was paid', () => {
  const list = [
    inv({ dueDate: '2026-11-20' }), inv({ dueDate: '2026-11-01' }),
    inv({ status: 'paid', payment: { status: 'paid', cents: 30000 } }), inv({ status: 'draft' }), inv({ status: 'void' }),
  ]
  const t = listTotals(list, '2026-11-10')
  assert.deepEqual(t.open, { n: 2, cents: 90000 })
  assert.deepEqual(t.overdue, { n: 1, cents: 45000 })
  assert.deepEqual(t.paid, { n: 1, cents: 30000 })
  assert.equal(t.draft.n, 1)
  assert.equal(t.void.n, 1)
})

test('account: only sent or paid invoices, with state and how paid', () => {
  assert.equal(shownInvoice(inv({ status: 'draft' })), false)
  assert.equal(shownInvoice(inv({ status: 'void' })), false)
  assert.equal(shownInvoice(inv()), true)
  const s = invoiceSummary('tok', inv({ status: 'paid', payment: { status: 'paid', cents: 45000, source: 'paypal', env: 'sandbox', paidAt: Date.parse('2026-11-03T18:00:00Z') } }), '2026-11-10')
  assert.equal(s.state, 'paid')
  assert.deepEqual(s.paid, { method: 'PayPal', date: '2026-11-03', cents: 45000, sandbox: true })
  assert.equal(invoiceSummary('tok', inv(), '2026-11-10').state, 'overdue')
})

test('emails: number, total, Pay link; HTML escapes customer text', () => {
  const e = invoiceEmail({ inv: inv({ note: 'Thanks <b>Pat</b>!', dueDate: '2026-11-15' }), link: 'https://x/invoice/?t=abc', today: '2026-11-01' })
  assert.match(e.subject, /Invoice CLC-2026-0007 .*\$450\.00 due November 15, 2026/)
  assert.match(e.text, /https:\/\/x\/invoice\/\?t=abc/)
  assert.match(e.html, /Pay \$450\.00/)
  assert.match(e.html, /&lt;b&gt;Pat&lt;\/b&gt;/)
  assert.doesNotMatch(e.html, /<b>Pat<\/b>/)
  const r = invoiceEmail({ inv: inv(), link: 'L', today: '2026-11-08', type: 'reminder', day: 7 })
  assert.match(r.subject, /^Reminder: invoice CLC-2026-0007/)
  assert.match(r.text, /7 days ago/)
  const paid = { online: false, method: 'Check', date: '2026-11-05', cents: 45000 }
  assert.match(receiptEmail({ inv: inv(), link: 'L', paid }).text, /payment of \$450\.00 by Check on November 5, 2026/)
  assert.match(staffPaidEmail({ inv: inv({ offline: { by: 'boss@example.com' } }), link: 'L', paid }).text, /recorded by boss@example\.com/)
})

test('new invoice from a customer: first email only, draft, on receipt', () => {
  const c = { id: 'pat', fullName: 'Pat Sample', email: 'pat@example.com; old@example.com', phone: '555', address: '1 Main St' }
  assert.deepEqual(customerSnapshot(c), { name: 'Pat Sample', email: 'pat@example.com', phone: '555', address: '1 Main St' })
  const d = newInvoice(c, { season: '2026', kind: 'takedown' })
  assert.equal(d.status, 'draft')
  assert.equal(d.terms, 'receipt')
  assert.equal(d.customerId, 'pat')
  assert.equal(d.items.length, 1)
})

test('bulk re-install drafts: season total with discount, else yearly price; skips with reasons', () => {
  const customers = [
    { id: 'a', fullName: 'Ann A', email: 'a@x.com', since: '2021', seasons: { 2026: { install: { rate: '$450.00', discount: '10%', discountReason: 'Early install', total: '$405.00' } } } },
    { id: 'b', fullName: 'Bob B', email: '', since: '2022', originalRate: '$900', addOns: [{ season: '2024', what: 'Arch', price: 300 }, { season: '2026', what: 'Tree wrap', price: 240 }] },
    { id: 'c', fullName: 'Cat C', since: '2026', seasons: { 2026: { install: { rate: '$800' } } } },
    { id: 'd', fullName: 'Dan D', since: '2020', seasons: { 2026: { install: { rate: '$500', paid: 'Yes' } } } },
    { id: 'e', fullName: 'Eve E', since: '2020', seasons: { 2026: { install: { rate: '$500', invoice: 'PP Invoice Sent' } } } },
    { id: 'f', fullName: 'Fay F', since: '2020', seasons: { 2026: { installStatus: 'Not Servicing', install: { rate: '$500' } } } },
    { id: 'g', fullName: 'Gus G', since: '2020' },
    { id: 'h', fullName: 'Hal H', since: '2020', seasons: { 2026: { install: { rate: '$300' } } } },
  ]
  const invoices = [{ customerId: 'h', season: '2026', kind: 'install', status: 'open', number: 'CLC-2026-0001' }]
  const rows = Object.fromEntries(bulkCandidates({ customers, season: '2026', kind: 'install', invoices }).map((r) => [r.customer.id, r]))
  assert.equal(rows.a.pick, true)
  assert.deepEqual(rows.a.items.map((i) => i.cents), [45000, -4500])
  assert.match(rows.a.items[1].description, /Early install/)
  assert.equal(rows.b.pick, true)
  assert.deepEqual(rows.b.items.map((i) => i.cents), [60000, 24000]) // 450 + 150 yearly, + tree wrap in full
  assert.match(rows.b.flag, /no email/i)
  assert.match(rows.c.reason, /new this season/i)
  assert.match(rows.d.reason, /paid/i)
  assert.match(rows.e.reason, /PP Invoice Sent/)
  assert.match(rows.f.reason, /Not Servicing/)
  assert.match(rows.g.reason, /no price/i)
  assert.match(rows.h.reason, /CLC-2026-0001/)
  for (const id of 'cdefgh') assert.equal(rows[id].pick, false, id)
})

test('bulk takedown drafts: season takedown rate; free or no-takedown skipped', () => {
  const customers = [
    { id: 'a', fullName: 'Ann A', seasons: { 2026: { takedown: { rate: '$150' } } } },
    { id: 'b', fullName: 'Bob B', seasons: { 2026: { takedown: { rate: '$0' } } } },
    { id: 'c', fullName: 'Cat C', seasons: { 2026: { takedownStatus: 'No Takedown', takedown: { rate: '$150' } } } },
  ]
  const rows = Object.fromEntries(bulkCandidates({ customers, season: '2026', kind: 'takedown', invoices: [] }).map((r) => [r.customer.id, r]))
  assert.equal(rows.a.pick, true)
  assert.equal(rows.a.cents, 15000)
  assert.match(rows.b.reason, /free/i)
  assert.match(rows.c.reason, /No Takedown/)
})
