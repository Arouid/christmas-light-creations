import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contactLinks, matchedBy, paymentPart, paymentsFromPast, seasonFills, seasonOfDate, uniquePayments } from '../src/lib/oldPayments.js'
import { matchMessages } from '../src/lib/messageImport.js'

test('payment dates map to seasons; January–April is takedown unless the payment says otherwise', () => {
  assert.equal(seasonOfDate('2024-11-28T15:00:00Z'), '2024')
  assert.equal(seasonOfDate('2025-01-10'), '2024')
  assert.equal(paymentPart({ at: '2024-11-28' }), 'install')
  assert.equal(paymentPart({ at: '2025-01-10' }), 'takedown')
  assert.equal(paymentPart({ at: '2025-01-05', text: 'Install balance' }), 'install')
  assert.equal(paymentPart({ at: '2024-12-01', text: 'Take-down 2024' }), 'takedown')
})

test('old payments fill only empty season boxes, summed per season and part', () => {
  const pays = [
    { kind: 'payment', at: '2023-10-20', amount: 200, source: 'paypal' },
    { kind: 'payment', at: '2023-11-30', amount: 214, source: 'paypal' },
    { kind: 'payment', at: '2024-01-12', amount: 150, source: 'square' },
    { kind: 'invoice', at: '2023-10-01', amount: 414, source: 'paypal' }, // invoices aren't payments
    { kind: 'payment', at: '2025-11-26', amount: 460, source: 'paypal' },
  ]
  const customer = { seasons: { 2025: { install: { total: '$414.00', paid: 'Yes', paymentType: 'PayPal', paymentDate: '11/26/2025' } } } }
  const s = seasonFills(pays, customer)
  assert.deepEqual(s.map((x) => x.season), ['2023']) // 2025 already filled in by staff
  assert.deepEqual(s[0].parts.install, { amount: 414, count: 2, via: 'PayPal', date: '11/30/2023' })
  assert.deepEqual(s[0].fills, [
    { path: 'seasons.2023.install.total', value: '$414.00' },
    { path: 'seasons.2023.install.paid', value: 'Yes' },
    { path: 'seasons.2023.install.paymentType', value: 'PayPal' },
    { path: 'seasons.2023.install.paymentDate', value: '11/30/2023' },
    { path: 'seasons.2023.takedown.rate', value: '$150.00' },
    { path: 'seasons.2023.takedown.paid', value: 'Yes' },
    { path: 'seasons.2023.takedown.paymentType', value: 'Square' },
    { path: 'seasons.2023.takedown.paymentDate', value: '1/12/2024' },
  ])
  // Something staff typed is never replaced.
  const typed = { seasons: { 2023: { install: { total: '$500', paymentType: 'Check' } } } }
  assert.deepEqual(seasonFills(pays, typed).find((x) => x.season === '2023').fills.filter((f) => f.path.includes('install')).map((f) => f.path),
    ['seasons.2023.install.paid', 'seasons.2023.install.paymentDate'])
})

test('Past requests card payments join message payments without counting one twice', () => {
  const card = { payments: [{ date: '2023-11-30', via: 'PayPal', kind: 'payment', amount: 214, items: 'Install' }, { date: '2023-10-01', via: 'PayPal', kind: 'invoice', amount: 414 }] }
  const fromCard = paymentsFromPast(card, 'c1')
  assert.deepEqual(fromCard, [{ kind: 'payment', at: '2023-11-30', amount: 214, source: 'PayPal', text: 'Install', customerId: 'c1' }])
  const msg = { kind: 'payment', at: '2023-11-30T16:02:11Z', amount: 214, source: 'paypal', customerId: 'c1' }
  assert.equal(uniquePayments([msg, ...fromCard]).length, 1)
})

test('old phones/emails not on the customer are offered for linking; matches by email/phone vs name', () => {
  const c = { fullName: 'Pat Sample', phone: '(281) 555-0101', email: 'pat@example.com', otherPhones: ['832-555-0199'] }
  const cards = [
    { fullName: 'Pat Sample', phone: '281-555-0101', email: 'PAT@example.com' },
    { fullName: 'Pat Sample', phone: '+1 713 555 0123', email: 'pat.old@example.com', otherEmails: ['pat@example.com'] },
    { fullName: 'Pat Sample', phone: '832.555.0199' },
  ]
  assert.deepEqual(contactLinks(cards, c), { phones: ['713-555-0123'], emails: ['pat.old@example.com'] })
  assert.deepEqual(cards.map((r) => matchedBy(r, c)), ['email', 'email', 'phone'])
  assert.equal(matchedBy({ fullName: 'Pat Sample', phone: '409-555-0000' }, c), 'name')
})

test('re-importing history matches texts by a linked other phone or email', () => {
  const customers = [{ id: 'pat', fullName: 'Pat Sample', phone: '281-555-0101', otherPhones: ['713-555-0123'], otherEmails: ['pat.old@example.com'] }]
  const list = [
    { id: 'v1', data: { kind: 'text', phone: '+17135550123', at: '2020-12-01' } },
    { id: 'p1', data: { kind: 'payment', at: '2019-11-01' }, match: { emails: ['pat.old@example.com'] } },
  ]
  const out = matchMessages(list, customers)
  assert.deepEqual(out.records.map((r) => [r.id, r.data.customerId]), [['v1', 'pat'], ['p1', 'pat']])
})

test('bringing over old texts: only entries the linked phones/emails newly match', async () => {
  const { newFromLinks, needsOldTexts } = await import('../src/lib/oldPayments.js')
  const customers = [
    { id: 'pat', fullName: 'Pat Sample', phone: '281-555-0101', otherPhones: ['713-555-0123'] },
    { id: 'lee', fullName: 'Lee Other', phone: '409-555-0000' },
  ]
  const list = [
    { id: 'v1', data: { kind: 'text', phone: '+17135550123', at: '2020-12-01' } }, // via the linked phone: new
    { id: 'v2', data: { kind: 'text', phone: '+12815550101', at: '2021-12-01' } }, // main phone: already imported before
    { id: 'v3', data: { kind: 'call', phone: '+14095550000', at: '2021-12-02' } }, // another customer
    { id: 'v4', data: { kind: 'text', phone: '+18325559999', at: '2021-12-03' } }, // nobody
  ]
  const out = newFromLinks(list, customers)
  assert.deepEqual(out.records.map((r) => [r.id, r.data.customerId]), [['v1', 'pat']])
  assert.deepEqual(out.byKind, { text: 1 })
  assert.equal(out.customers, 1)
  assert.equal(newFromLinks(list, customers, ['lee']).records.length, 0)
  assert.equal(needsOldTexts(customers[0]), true)
  assert.equal(needsOldTexts({ ...customers[0], oldTextsAt: '2026-10-09' }), false)
  assert.equal(needsOldTexts(customers[1]), false)
})
