import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIndex, searchAccounts } from '../src/lib/accountSearch.js'

const index = buildIndex({
  customers: [
    { id: 'pat', fullName: 'Pat Sample', address: '123 Example St, Pearland, TX', phone: '(281) 555-0101', email: 'pat@example.com', neighborhood: 'Silverlake', gateCode: '#4321' },
    { id: 'sam', fullName: 'Sam Patterson', address: '9 Oak Ct, Friendswood, TX', phone: '713-555-0199', email: 'sam@x.com' },
  ],
  leads: [
    { id: 'l1', firstName: 'Jo', lastName: 'Example', address: '45 Pine Dr', city: 'League City', phone: '832 555 0123', email: 'jo@x.com', status: 'new' },
    { id: 'l2', firstName: 'Pat', lastName: 'Sample', customerId: 'pat' }, // became a customer: hidden
  ],
  past: [{ id: 'old-1', fullName: 'Pat Oldman', address: '7 Elm St', city: 'Pearland', phone: '281-555-7777', lastAsked: '2021-11-02' }],
})
const keys = (q) => searchAccounts(index, q).map((e) => e.key)

test('name matches first; every word must match', () => {
  assert.deepEqual(keys('pat'), ['customer:pat', 'past:old-1', 'customer:sam'])
  assert.deepEqual(keys('pat pearland'), ['customer:pat', 'past:old-1'])
  assert.deepEqual(keys('pat sample'), ['customer:pat'], 'lead that became a customer is not listed twice')
})

test('street, neighborhood, gate code and email find people too', () => {
  assert.deepEqual(keys('oak ct'), ['customer:sam'])
  assert.deepEqual(keys('silverlake'), ['customer:pat'])
  assert.deepEqual(keys('4321'), ['customer:pat'], 'gate code typed without #')
  assert.deepEqual(keys('#4321'), ['customer:pat'])
  assert.deepEqual(keys('jo@x'), ['lead:l1'])
})

test('phone numbers match however they are typed', () => {
  assert.deepEqual(keys('555-0123'), ['lead:l1'])
  assert.deepEqual(keys('(281) 555'), ['customer:pat', 'past:old-1'])
  assert.deepEqual(keys('7135550199'), ['customer:sam'])
})
