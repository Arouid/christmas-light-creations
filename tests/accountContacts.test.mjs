// The phones and emails on the account greeting card: the one they signed in
// with is marked (it glows when there are two or more). Owner 2026-10-14.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountContacts, firstName } from '../src/account/contacts.js'

test('the greeting’s first name: capitals from an import become a name, anything else stays as typed', () => {
  assert.equal(firstName('SCOTT MEDEL'), 'Scott')
  assert.equal(firstName('MARY-JANE O’NEIL'), 'Mary-Jane')
  assert.equal(firstName('Pat Sample'), 'Pat')
  assert.equal(firstName('DeShawn Lee'), 'DeShawn')
  assert.equal(firstName('  '), '')
  assert.equal(firstName(undefined), '')
})

const customer = { phones: ['+12816502684'], emails: ['ggggg1@gmail.com', 'Exatrum@Gmail.com'] }

test('the email they signed in with is the marked one, whatever its case', () => {
  const list = accountContacts(customer, { email: 'exatrum@gmail.com', phone: '' })
  assert.deepEqual(list.map((c) => c.text), ['(281) 650-2684', 'ggggg1@gmail.com', 'Exatrum@Gmail.com'])
  assert.deepEqual(list.map((c) => c.me), [false, false, true])
})

test('a phone sign-in marks that phone, however the number is written', () => {
  const list = accountContacts(customer, { email: '', phone: '+1 (281) 650-2684' })
  assert.deepEqual(list.map((c) => c.me), [true, false, false])
})

test('an email sign-in wins over a phone that came with it', () => {
  const list = accountContacts(customer, { email: 'ggggg1@gmail.com', phone: '+12816502684' })
  assert.deepEqual(list.map((c) => c.me), [false, true, false])
})

test('signed in with something the record does not list: it is added, so they still see it', () => {
  const list = accountContacts(customer, { email: 'new@example.com' })
  assert.equal(list.length, 4)
  assert.deepEqual(list.at(-1), { text: 'new@example.com', me: true })
  assert.deepEqual(accountContacts(null, { phone: '+12815550101' }), [{ text: '(281) 555-0101', me: true }])
})

test('nothing signed in, nothing on the record: an empty line', () => {
  assert.deepEqual(accountContacts(null, {}), [])
  assert.ok(accountContacts(customer, {}).every((c) => !c.me))
})

test('Help: every answer sits in exactly one group, and a search keeps its groups', async () => {
  const { HELP, HELP_GROUPS, helpGroups, searchHelp } = await import('../src/data/help.js')
  const placed = HELP_GROUPS.flatMap((g) => g.ids)
  assert.deepEqual([...placed].sort(), HELP.map((h) => h.id).sort())
  assert.equal(new Set(placed).size, placed.length)
  assert.deepEqual(helpGroups(searchHelp('')).map((g) => g.key), HELP_GROUPS.map((g) => g.key))
  const paying = helpGroups(searchHelp('paypal'))
  assert.ok(paying.length >= 1 && paying.every((g) => g.items.length > 0))
  assert.equal(paying[0].key, 'money')
})
