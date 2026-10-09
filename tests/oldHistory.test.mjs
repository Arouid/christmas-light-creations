import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formRequest, paymentEntry, paymentOf, personEmail, requestEntry } from '../scripts/old-site/oldHistory.mjs'
import { readEmail } from '../scripts/old-site/mbox.mjs'
import { matchMessages } from '../src/lib/messageImport.js'
import { cleanRow, mergePeople } from '../src/lib/oldEstimates.js'

// Hand-written samples in the shapes of the old mail (no real data).
const mail = (head, body) => readEmail(`${Object.entries(head).map(([k, v]) => `${k}: ${v}`).join('\n')}\nContent-Type: text/plain; charset=UTF-8\n\n${body}`)
const DATE = 'Thu, 22 Oct 2020 18:22:58 -0700'

test('PayPal "just paid": amount, customer, address, items, invoice', () => {
  const e = mail({ From: 'service@paypal.com', Subject: 'Pat Sample just paid for your invoice 2020-122', Date: DATE, 'Message-ID': '<p1@paypal.com>' },
    `You received a $425.00 USD payment\n\nCustomer\nPat Sample\npat@example.com\nNote from customer\nNone\n\nShipping address - confirmed\nPat Sample\n123 Example St\nPearland, TX 77581\nUnited States\n\nDescription Unit price Qty Amount\nReinstall Christmas Lights 2020 $500.00 1 $500.00\n\nSubtotal $500.00\nDiscount -$75.00\nTotal $425.00 USD\nAmount Paid $425.00 USD\nAmount due $0.00 USD\n\nInvoice ID 2020-122`)
  const p = paymentOf(e)
  assert.equal(p.kind, 'payment')
  assert.equal(p.amount, 425)
  assert.equal(p.invoice, '2020-122')
  assert.equal(p.name, 'Pat Sample')
  assert.equal(p.email, 'pat@example.com')
  assert.equal(p.address, '123 Example St, Pearland, TX 77581')
  assert.deepEqual(p.items, ['Reinstall Christmas Lights 2020 $500.00'])
  const entry = paymentEntry(p)
  assert.equal(entry.data.text.split('\n')[0], 'Paid $425.00 by PayPal · invoice 2020-122')
  assert.deepEqual(entry.match, { emails: ['pat@example.com'], phones: [], names: ['pat sample'] })
})

test('old PayPal notification: "NAME (email)" and partial payments', () => {
  const p = paymentOf(mail({ From: 'service@paypal.com', Subject: 'Notification of payment received', Date: DATE, 'Message-ID': '<p2@paypal.com>' },
    'This email confirms that you have received a payment for $1,158.00 USD from SAM EXAMPLE (sam@example.com).\n\nInvoice ID: INV2-AAAA\nBuyer: SAM EXAMPLE'))
  assert.equal(p.amount, 1158)
  assert.equal(p.name, 'SAM EXAMPLE')
  assert.equal(p.email, 'sam@example.com')
  assert.equal(p.invoice, 'INV2-AAAA')
  const partial = paymentOf(mail({ From: 'service@paypal.com', Subject: 'You received a partial payment for invoice 2022-159', Date: DATE, 'Message-ID': '<p3@paypal.com>' },
    'You received a $265.00 USD payment for your invoice\n\nCustomer\n\nPat Sample\n\npat@example.com\n3618 Example Ct.\nPearland,\nUS 77584\n\n1.0 x New Install 2022\n$750.00 USD\n\n$750.00 USD\n\nFront Roofline plus Garage\n\nInvoice total\n$1,050.00 USD\n\nAmount due\n$785.00 USD'))
  assert.equal(partial.amount, 265)
  assert.equal(partial.total, 1050)
  assert.equal(partial.due, 785)
  assert.deepEqual(partial.items, ['New Install 2022 $750.00 (Front Roofline plus Garage)'])
  assert.match(paymentEntry(partial).data.text, /^Paid \$265\.00 by PayPal · invoice 2022-159 · invoice total \$1,050\.00 · still due \$785\.00/)
})

test('invoices sent (PayPal, Square) and Square paid', () => {
  const inv = paymentOf(mail({ From: 'service@paypal.com', Subject: 'We sent your invoice (2022-165) for $389.00 USD', Date: DATE, 'Message-ID': '<i1@paypal.com>' },
    'We sent your invoice to sam@example.com for $389.00 USD'))
  assert.deepEqual([inv.kind, inv.amount, inv.invoice, inv.name, inv.email], ['invoice', 389, '2022-165', '', 'sam@example.com'])
  assert.equal(paymentEntry(inv).data.direction, 'out')
  const sq = paymentOf(mail({ From: 'Square <invoicing@messaging.squareup.com>', Subject: 'You sent an invoice reminder (#2022198)', Date: DATE }, 'Hello Christmas Light Creations,\n\nYou have resent an invoice of $175.00 to Pat Sample.'))
  assert.deepEqual([sq.kind, sq.via, sq.amount, sq.invoice, sq.name], ['invoice', 'Square', 175, '2022198', 'Pat Sample'])
  const paid = paymentOf(mail({ From: 'Square <invoicing@messaging.squareup.com>', Subject: 'An invoice was paid by Pat Sample! (#2022194)', Date: DATE, 'Message-ID': '<s1@square>' }, 'Hello Christmas Light Creations,\n\nPat Sample has paid invoice #2022194 for $175.00.'))
  assert.deepEqual([paid.kind, paid.amount, paid.name], ['payment', 175, 'Pat Sample'])
  assert.equal(paymentOf(mail({ From: 'service@paypal.com', Subject: 'Receipt for your debit card purchase', Date: DATE }, 'x')), null)
})

test('estimate form emails, all three layouts', () => {
  const a = formRequest(mail({ From: 'Pat <s.minor@christmas-light-creations.com>', Subject: 'New estimate from Get An Estimate', Date: DATE },
    ' New estimate from Get An Estimate\n*Name*\n  Pat Sample\n*Phone*\n  (555) 010-0101\n*Email*\n  pat@example.com\n*Message*\n  Lights this year.\n'))
  assert.deepEqual([a.name, a.phone, a.email, a.message], ['Pat Sample', '+15550100101', 'pat@example.com', 'Lights this year.'])
  const b = formRequest(mail({ From: 's.minor@christmas-light-creations.com', Subject: 'New Estimate - A000547', Date: DATE },
    'Ref: *A000547*\nName : *Sam Example*\n\nPhone : *5550100102*\n\nEmail : *sam@example.com <sam@example.com>*\n\nMessage : *Christmas lights quote*'))
  assert.deepEqual([b.name, b.phone, b.email, b.message], ['Sam Example', '+15550100102', 'sam@example.com', 'Christmas lights quote'])
  const c = formRequest(mail({ From: 'info@christmas-light-creations.com', Subject: 'Contact Form submission from Christmas light Creations', Date: DATE },
    "Sender's name: Lee Sample\nE-mail: lee@example.com\nPhone: 555-010-0103\n\nMessage: Two story house"))
  assert.deepEqual([c.name, c.email, c.phone], ['Lee Sample', 'lee@example.com', '+15550100103'])
  assert.equal(formRequest(mail({ From: 'x@y.com', Subject: 'Re: New Estimate - A000547', Date: DATE }, 'Name : *X*')), null)
  // Same person, same day: the email and the website's own record are one entry.
  assert.equal(requestEntry({ ...b, date: '2020-10-23T10:00:00.000Z' }).id, requestEntry({ ...b, date: '2020-10-23T23:00:00.000Z' }).id)
})

test('emails with people: direction, counterparts, newsletters skipped', () => {
  const out = personEmail(mail({ From: 'Lacie <info@christmas-light-creations.com>', To: 'Pat <PAT@example.com>, estimates@christmas-light-creations.com', Subject: 'Your quote', Date: DATE, 'Message-ID': '<m1@x>' },
    'Here is your quote.\n\nOn Mon, Pat wrote:\n> hi'))
  assert.equal(out.data.direction, 'out')
  assert.equal(out.data.text, 'Here is your quote.')
  assert.deepEqual(out.match.emails, ['pat@example.com'])
  assert.match(out.idBase, /^em-[0-9a-f]{20}$/)
  const inn = personEmail(mail({ From: 'pat@example.com', To: 'changeadams3@gmail.com', Subject: 'Lights', Date: DATE, 'Message-ID': '<m2@x>' }, 'Thanks!'))
  assert.equal(inn.data.direction, 'in')
  assert.equal(personEmail(mail({ From: 'deals@shop.com', To: 'info@christmas-light-creations.com', Subject: 'Sale', Date: DATE, 'Message-ID': '<m3@x>', 'List-Unsubscribe': '<x>' }, 'Sale')), null)
  assert.equal(personEmail(mail({ From: 'noreply@shop.com', To: 'info@christmas-light-creations.com', Subject: 'Hi', Date: DATE, 'Message-ID': '<m4@x>' }, 'x')), null)
})

test('import matching: phone, then email, then full name; emails one entry per customer', () => {
  const customers = [{ id: 'pat', fullName: 'Pat Sample', email: 'pat@example.com', phone: '555-010-0101' }, { id: 'sam', firstName: 'Sam', lastName: 'Example' }]
  const list = [
    { id: 'p1', data: { kind: 'payment', direction: 'in', at: '2020-01-01' }, match: { emails: [], phones: [], names: ['SAM  EXAMPLE'] } },
    { id: 'p2', data: { kind: 'payment', direction: 'in', at: '2020-01-01' }, match: { emails: ['pat@example.com'], phones: [], names: [] } },
    { id: 'p3', data: { kind: 'payment', direction: 'in', at: '2020-01-01' }, match: { emails: ['nobody@example.com'], phones: [], names: ['no one'] } },
    { idBase: 'em-1', data: { kind: 'email', direction: 'out', at: '2020-01-01' }, match: { emails: ['pat@example.com', 'other@example.com'] } },
  ]
  const r = matchMessages(list, customers)
  assert.deepEqual(r.records.map((x) => [x.id, x.data.customerId]), [['p1', 'sam'], ['p2', 'pat'], ['em-1-pat', 'pat']])
  assert.equal(r.records[2].data.email, 'pat@example.com')
  assert.equal('match' in r.records[0].data, false)
  assert.deepEqual(r.byKind, { payment: 2, email: 1 })
})

test('past requests: payments make a win-back, merged with the same person\'s request', () => {
  const rows = [
    { Date: '2019-10-01 10:00:00', Source: 'Contact Form 7', Email: 'pat@example.com', Phone: '555-010-0101', Message: 'Lights for our house please', 'All fields': 'your-name: Pat Sample' },
    { Date: '2019-11-01 10:00:00', Source: 'PayPal', Kind: 'payment', Amount: '425', Invoice: '2019-122', Email: 'pat@example.com', 'All fields': 'Name: Pat Sample' },
    { Date: '2020-11-01 10:00:00', Source: 'Square', Kind: 'payment', Amount: '200', Invoice: '2020-1', 'All fields': 'Name: PAT SAMPLE' },
    { Date: '2021-01-01 10:00:00', Source: 'PayPal', Kind: 'invoice', Amount: '150', 'All fields': 'Name: sam@example.com' },
    { Date: '2015-12-01 10:00:00', Source: 'Voice', Kind: 'voice', Amount: '12', Phone: '555-010-0109', Message: '12 texts/calls with the business line, 2015', 'All fields': '' },
  ]
  const people = mergePeople(rows.map(cleanRow).filter(Boolean))
  const pat = people.find((p) => p.email === 'pat@example.com')
  assert.equal(pat.payments.length, 2)
  assert.equal(pat.paid, 625)
  assert.deepEqual([pat.firstPaid, pat.lastPaid, pat.requests.length], ['2019-11-01', '2020-11-01', 1])
  const sam = people.find((p) => p.email === 'sam@example.com')
  assert.deepEqual([sam.paid, sam.payments[0].kind, sam.id], [0, 'invoice', 'old-sam-example-com'])
  const voice = people.find((p) => p.phone === '555-010-0109')
  assert.equal(voice.voice.entries, 12)
  assert.equal(voice.lastAsked, '2015-12-01')
  assert.equal(new Set(people.map((p) => p.id)).size, people.length)
})
