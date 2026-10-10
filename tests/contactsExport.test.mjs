import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contactGroups, toVcard } from '../src/lib/contactsExport.js'

test('contacts: grouped, filed-away and already-customers left out', () => {
  const customers = [{ id: 'pat', fullName: 'Pat Sample', firstName: 'Pat', lastName: 'Sample', phone: '555-010-0101', email: 'pat@example.com', since: '2019' }]
  const past = [
    { id: 'a', fullName: 'Winnie Back', phone: '555-010-0177', payments: [{ amount: 1 }], firstPaid: '2016-11-01', lastPaid: '2020-11-01', requests: [] },
    { id: 'b', fullName: 'Mom', phone: '555-010-0150', status: 'Personal (family/friends)', requests: [] },
    { id: 'c', fullName: 'Pat Sample', email: 'pat@example.com', requests: [{ date: '2018-01-01' }] },
    { id: 'd', fullName: '555-010-0188', phone: '555-010-0188', requests: [] },
    { id: 'e', fullName: 'No Contact', requests: [{ date: '2018-01-01' }] },
  ]
  const g = contactGroups(customers, past)
  assert.deepEqual(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((p) => p.name)])),
    { customers: ['Pat Sample'], winback: ['Winnie Back'], voice: [''], asked: [] })
  assert.equal(g.winback[0].note, 'CLC former customer · paid 2016–2020')
})

test('vCard: name, phones, email, escaped note, CRLF', () => {
  const vcf = toVcard([{ name: 'Pat Sample', first: 'Pat', last: 'Sample', phones: ['+15550100101'], emails: ['pat@example.com'], note: 'CLC customer · 1 Main St, Pearland' }, { name: '', phones: ['+15550100188'], emails: [] }])
  assert.equal(vcf, [
    'BEGIN:VCARD', 'VERSION:3.0', 'N:Sample;Pat;;;', 'FN:Pat Sample', 'TEL;TYPE=CELL:+15550100101', 'EMAIL;TYPE=INTERNET:pat@example.com', 'NOTE:CLC customer · 1 Main St\\, Pearland', 'END:VCARD',
    'BEGIN:VCARD', 'VERSION:3.0', 'N:;;;;', 'FN:+15550100188', 'TEL;TYPE=CELL:+15550100188', 'END:VCARD', '',
  ].join('\r\n'))
})
